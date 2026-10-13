// Pagamentos (Mercado Pago) — regras, aviso (webhook) e banco em Postgres de memória (PGlite).
// Nada sai para a rede: o cliente da API é falso.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { definirClienteTeste } from "../lib/banco.js";
import { listarMigracoes, lerInstrucoes } from "../lib/migracoes.js";
import * as C from "../lib/contas.js";
import { configPagamentos, assinaturaWebhookConfere, lerAviso, estadoDaAssinatura, estadoDoPagamento, corpoAssinaturaMensal, corpoPreferenciaAnual, valorConfere } from "../lib/pagamentos.js";
import { iniciarCheckout, processarAviso, cancelarAssinaturaPaga } from "../lib/cobranca.js";

const db = new PGlite();
before(async () => {
  for (const m of listarMigracoes(new URL("../db/migracoes", import.meta.url).pathname)) for (const i of lerInstrucoes(m.up)) await db.query(i);
  definirClienteTeste({
    consultar: async (t, p = []) => (await db.query(t, p)).rows,
    transacao: (lista) => db.transaction(async (tx) => { const r = []; for (const [t, p = []] of lista) r.push((await tx.query(t, p)).rows); return r; }),
  });
});

// Mercado Pago falso: guarda o que foi criado e devolve como a API real
function mpFalso() {
  const assin = new Map();
  const pags = new Map();
  let n = 0;
  return {
    assin, pags,
    criarAssinatura: async (c) => { const id = `pre${++n}`; assin.set(id, { id, status: "pending", external_reference: c.external_reference, auto_recurring: c.auto_recurring, payer_email: c.payer_email }); return { ...assin.get(id), init_point: `https://mp.test/assinar/${id}` }; },
    criarPreferencia: async (c) => ({ id: `pref${++n}`, init_point: `https://mp.test/pagar/${c.external_reference}`, corpo: c }),
    lerAssinatura: async (id) => assin.get(id),
    lerPagamento: async (id) => pags.get(id),
    cancelarAssinatura: async (id) => { assin.get(id).status = "cancelled"; return assin.get(id); },
  };
}

test("só cobra onde pode: teste aceita só token TEST; produção só com o interruptor", () => {
  assert.equal(configPagamentos({}).ok, false);
  assert.equal(configPagamentos({ VERCEL_ENV: "preview", MP_ACCESS_TOKEN: "TEST-123" }).ok, true);
  assert.equal(configPagamentos({ VERCEL_ENV: "preview", MP_ACCESS_TOKEN: "APP_USR-123" }).ok, false, "token real no site de teste: recusa");
  assert.equal(configPagamentos({ VERCEL_ENV: "production", MP_ACCESS_TOKEN: "APP_USR-123" }).ok, false, "produção sem PAGAMENTOS_PRODUCAO=1");
  assert.equal(configPagamentos({ VERCEL_ENV: "production", MP_ACCESS_TOKEN: "TEST-1", PAGAMENTOS_PRODUCAO: "1" }).ok, false, "token de teste na produção");
  assert.equal(configPagamentos({ VERCEL_ENV: "production", MP_ACCESS_TOKEN: "APP_USR-123", PAGAMENTOS_PRODUCAO: "1" }).ok, true);
});

test("preços do pedido vêm de lib/planos.js", () => {
  assert.equal(corpoAssinaturaMensal({ referencia: "r", emailPagador: "a@b.c", voltarPara: "x" }).auto_recurring.transaction_amount, 39.9);
  const pref = corpoPreferenciaAnual({ referencia: "r", voltarPara: "x", notificacao: "y" });
  assert.equal(pref.items[0].unit_price, 358.8);
  assert.equal(pref.payment_methods.installments, 12);
  assert.ok(valorConfere("pro_anual", 358.8) && !valorConfere("pro_anual", 1));
});

test("aviso do Mercado Pago: tipo, id e assinatura HMAC", () => {
  assert.deepEqual(lerAviso("https://e.app/api/pagamentos/webhook", { type: "subscription_preapproval", data: { id: "abc" } }), { recurso: "assinatura", id: "abc" });
  assert.deepEqual(lerAviso("https://e.app/api/pagamentos/webhook?type=payment&data.id=99", {}), { recurso: "pagamento", id: "99" });
  assert.equal(lerAviso("https://e.app/w", { type: "subscription_authorized_payment", data: { id: "1" } }), null);
  const segredo = "chave-teste";
  const ts = "1700000000";
  const v1 = createHmac("sha256", segredo).update(`id:99;request-id:req-1;ts:${ts};`).digest("hex");
  assert.equal(assinaturaWebhookConfere({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: "req-1", dataId: "99", segredo }), true);
  assert.equal(assinaturaWebhookConfere({ xSignature: `ts=${ts},v1=${"0".repeat(64)}`, xRequestId: "req-1", dataId: "99", segredo }), false);
  assert.equal(assinaturaWebhookConfere({ xSignature: "", xRequestId: "req-1", dataId: "99", segredo }), false);
});

test("estados: autorizada estende; cancelada mantém; anual aprovado = 12 meses; devolvido corta", () => {
  const agora = new Date("2026-11-10T12:00:00Z");
  assert.equal(estadoDaAssinatura({ status: "authorized", next_payment_date: "2026-12-10T12:00:00Z" }, agora).validoAte, "2026-12-13T12:00:00.000Z");
  assert.equal(estadoDaAssinatura({ status: "cancelled" }, agora).validoAte, null);
  assert.equal(estadoDoPagamento({ status: "approved", date_approved: "2026-11-10T12:00:00Z" }, agora).validoAte, "2027-11-10T12:00:00.000Z");
  assert.equal(estadoDoPagamento({ status: "refunded" }, agora).validoAte, agora.toISOString());
  assert.equal(estadoDoPagamento({ status: "pending" }, agora).validoAte, null);
});

test("mensal: checkout → aviso autorizado → Pro; cancelar → para de cobrar e vale até o fim do mês", async () => {
  const mp = mpFalso();
  const r = await iniciarCheckout({ email: "prof1@x.br", plano: "pro_mensal", emailPagador: "mp@x.br", origem: "https://e.app", cliente: mp });
  assert.ok(r.ok && r.url.startsWith("https://mp.test/assinar/"));
  const [id] = [...mp.assin.keys()];
  assert.equal(mp.assin.get(id).payer_email, "mp@x.br");
  assert.equal(await C.cobrancaAtiva("prof1@x.br"), null, "pendente não dá Pro");
  // aviso FALSO no corpo não importa: o estado vem da API
  mp.assin.get(id).status = "authorized";
  mp.assin.get(id).next_payment_date = new Date(Date.now() + 30 * 86400000).toISOString();
  const p = await processarAviso({ recurso: "assinatura", id }, mp);
  assert.equal(p.status, "authorized");
  const ativa = await C.cobrancaAtiva("prof1@x.br");
  assert.equal(ativa.plano, "pro_mensal");
  assert.equal(await C.cobrancaAtiva("outro@x.br"), null, "isolamento entre contas");
  const c = await cancelarAssinaturaPaga("prof1@x.br", mp);
  assert.ok(c.ok);
  assert.equal(mp.assin.get(id).status, "cancelled");
  const depois = await C.cobrancaAtiva("prof1@x.br");
  assert.equal(depois.plano, "pro_mensal", "cancelada continua valendo até o fim do mês pago");
  assert.equal(depois.validoAte, ativa.validoAte);
  // aviso repetido (o MP reenvia): idempotente
  await processarAviso({ recurso: "assinatura", id }, mp);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM cobrancas WHERE recurso_id = $1", [id])).rows[0].n, 1);
});

test("mensal: e-mail do Mercado Pago obrigatório e valor diferente não ativa", async () => {
  const mp = mpFalso();
  assert.equal((await iniciarCheckout({ email: "p2@x.br", plano: "pro_mensal", emailPagador: "nada", origem: "https://e.app", cliente: mp })).ok, false);
  await iniciarCheckout({ email: "p2@x.br", plano: "pro_mensal", emailPagador: "p2@x.br", origem: "https://e.app", cliente: mp });
  const [id] = [...mp.assin.keys()];
  Object.assign(mp.assin.get(id), { status: "authorized", auto_recurring: { transaction_amount: 1 } });
  assert.equal((await processarAviso({ recurso: "assinatura", id }, mp)).feito, "valor-diferente");
  assert.equal(await C.cobrancaAtiva("p2@x.br"), null);
});

test("anual: Pix aprovado → 12 meses de Pro; devolução corta na hora; pagamento de outro sistema é ignorado", async () => {
  const mp = mpFalso();
  const r = await iniciarCheckout({ email: "p3@x.br", plano: "pro_anual", origem: "https://e.app", cliente: mp });
  assert.ok(r.ok);
  mp.pags.set("555", { id: 555, status: "approved", transaction_amount: 358.8, date_approved: new Date().toISOString(), external_reference: r.referencia });
  assert.equal((await processarAviso({ recurso: "pagamento", id: "555" }, mp)).status, "approved");
  const a = await C.cobrancaAtiva("p3@x.br");
  assert.equal(a.plano, "pro_anual");
  assert.ok(Date.parse(a.validoAte) - Date.now() > 360 * 86400000);
  mp.pags.get("555").status = "refunded";
  await processarAviso({ recurso: "pagamento", id: "555" }, mp);
  assert.equal(await C.cobrancaAtiva("p3@x.br"), null, "devolvido: volta ao Grátis");
  mp.pags.set("777", { id: 777, status: "approved", transaction_amount: 358.8, external_reference: "referencia-que-nao-existe" });
  assert.equal((await processarAviso({ recurso: "pagamento", id: "777" }, mp)).feito, "sem-checkout");
  // o e-mail não vai para o banco
  const tudo = JSON.stringify((await db.query("SELECT * FROM checkouts")).rows) + JSON.stringify((await db.query("SELECT * FROM cobrancas")).rows);
  assert.ok(!/@x\.br/.test(tudo), "sem e-mail no banco");
});
