// Pagamentos (Asaas) — regras, aviso (webhook) e banco em Postgres de memória (PGlite).
// Nada sai para a rede: o cliente da API é falso.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { definirClienteTeste } from "../lib/banco.js";
import { listarMigracoes, lerInstrucoes } from "../lib/migracoes.js";
import * as C from "../lib/contas.js";
import { configPagamentos, tokenAvisoConfere, lerAviso, estadoDaAssinatura, estadoDoPagamento, corpoCheckout, valorConfere, clienteAsaas, API_SANDBOX, linkDoCheckout } from "../lib/pagamentos.js";
import { iniciarCheckout, processarAviso, cancelarAssinaturaPaga } from "../lib/cobranca.js";

const db = new PGlite();
before(async () => {
  for (const m of listarMigracoes(new URL("../db/migracoes", import.meta.url).pathname)) for (const i of lerInstrucoes(m.up)) await db.query(i);
  definirClienteTeste({
    consultar: async (t, p = []) => (await db.query(t, p)).rows,
    transacao: (lista) => db.transaction(async (tx) => { const r = []; for (const [t, p = []] of lista) r.push((await tx.query(t, p)).rows); return r; }),
  });
});

const SANDBOX = "$aact_hmlg_000000000000000000000000";
const PROD = "$aact_prod_000000000000000000000000";
const TOKEN = "um-token-de-aviso-bem-comprido-123456";

// Asaas falso: guarda o que foi criado e devolve como a API real
function asaasFalso() {
  const checkouts = new Map();
  const subs = new Map();
  const pags = new Map();
  const insts = new Map();
  let n = 0;
  return {
    checkouts, subs, pags, insts,
    criarCheckout: async (c) => { const id = `chk${++n}_${Math.random().toString(36).slice(2, 8)}`; checkouts.set(id, c); return { id, link: `https://sandbox.asaas.test/checkoutSession/show?id=${id}`, status: "ACTIVE", externalReference: c.externalReference }; },
    lerPagamento: async (id) => pags.get(id),
    lerAssinatura: async (id) => subs.get(id),
    lerParcelamento: async (id) => insts.get(id),
    cancelarAssinatura: async (id) => { Object.assign(subs.get(id), { deleted: true, status: "INACTIVE" }); return { id, deleted: true }; },
  };
}
const daqui = (dias) => new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
const hoje = () => new Date().toISOString().slice(0, 10);

test("só cobra onde pode: teste aceita só chave do Sandbox; produção só com o interruptor", () => {
  assert.equal(configPagamentos({}).ok, false);
  const t = configPagamentos({ VERCEL_ENV: "preview", ASAAS_API_KEY: SANDBOX });
  assert.ok(t.ok && t.api === API_SANDBOX && t.teste);
  assert.equal(configPagamentos({ VERCEL_ENV: "preview", ASAAS_API_KEY: PROD }).ok, false, "chave real no site de teste: recusa");
  assert.equal(configPagamentos({ VERCEL_ENV: "production", ASAAS_API_KEY: PROD, ASAAS_WEBHOOK_TOKEN: TOKEN }).ok, false, "produção sem PAGAMENTOS_PRODUCAO=1");
  assert.equal(configPagamentos({ VERCEL_ENV: "production", ASAAS_API_KEY: SANDBOX, ASAAS_WEBHOOK_TOKEN: TOKEN, PAGAMENTOS_PRODUCAO: "1" }).ok, false, "chave de sandbox na produção");
  assert.equal(configPagamentos({ VERCEL_ENV: "production", ASAAS_API_KEY: PROD, PAGAMENTOS_PRODUCAO: "1" }).ok, false, "produção sem token do aviso");
  const p = configPagamentos({ VERCEL_ENV: "production", ASAAS_API_KEY: PROD, ASAAS_WEBHOOK_TOKEN: TOKEN, PAGAMENTOS_PRODUCAO: "1" });
  assert.ok(p.ok && p.api === "https://api.asaas.com/v3" && !p.teste);
});

test("corpo do checkout: preços de lib/planos.js; mensal só cartão recorrente; anual Pix ou até 12x", () => {
  const m = corpoCheckout({ plano: "pro_mensal", referencia: "r1", voltarPara: "https://e.app/assinatura", agora: new Date("2026-11-10T15:00:00Z") });
  assert.deepEqual(m.billingTypes, ["CREDIT_CARD"]);
  assert.deepEqual(m.chargeTypes, ["RECURRENT"]);
  assert.equal(m.items[0].value, 39.9);
  assert.ok(m.items[0].imageBase64.length > 100 && m.items[0].name.length <= 30);
  assert.deepEqual(m.subscription, { cycle: "MONTHLY", nextDueDate: "2026-11-10" });
  assert.equal(m.externalReference, "r1");
  assert.equal(m.callback.successUrl, "https://e.app/assinatura?retorno=1");
  const a = corpoCheckout({ plano: "pro_anual", referencia: "r2", voltarPara: "x" });
  assert.deepEqual(a.billingTypes, ["PIX", "CREDIT_CARD"]);
  assert.deepEqual(a.chargeTypes, ["DETACHED", "INSTALLMENT"]);
  assert.equal(a.items[0].value, 358.8);
  assert.equal(a.installment.maxInstallmentCount, 12);
  assert.ok(a.items[0].name.length <= 30);
  assert.ok(valorConfere("pro_anual", 358.8) && !valorConfere("pro_anual", 1));
  assert.ok(valorConfere("pro_anual", 29.9, 12), "12x de 29,90");
  assert.ok(!valorConfere("pro_anual", 1, 12));
});

test("aviso do Asaas: tipo e id; token do aviso", () => {
  assert.deepEqual(lerAviso({ event: "PAYMENT_CONFIRMED", payment: { id: "pay_1" } }), { recurso: "pagamento", id: "pay_1", evento: "PAYMENT_CONFIRMED" });
  assert.deepEqual(lerAviso({ event: "SUBSCRIPTION_DELETED", subscription: { id: "sub_1" } }), { recurso: "assinatura", id: "sub_1", evento: "SUBSCRIPTION_DELETED" });
  assert.equal(lerAviso({ event: "CHECKOUT_PAID", checkout: { id: "c" } }), null);
  assert.equal(lerAviso({}), null);
  assert.equal(tokenAvisoConfere(TOKEN, TOKEN), true);
  assert.equal(tokenAvisoConfere("errado", TOKEN), false);
  assert.equal(tokenAvisoConfere(null, TOKEN), false);
  assert.equal(tokenAvisoConfere(null, null), true, "sem token configurado (teste): segue");
});

test("estados: assinatura paga estende; cancelada mantém; anual pago = 12 meses; devolvido corta", () => {
  const agora = new Date("2026-11-10T15:00:00Z");
  const pago = { status: "CONFIRMED", paymentDate: "2026-11-10", value: 39.9 };
  const e = estadoDaAssinatura({ status: "ACTIVE", nextDueDate: "2026-12-10", value: 39.9 }, pago, agora);
  assert.equal(e.status, "ACTIVE");
  assert.equal(e.validoAte, "2026-12-14T02:59:59.000Z"); // 10/12 23:59 de Brasília + 3 dias
  // nextDueDate ainda no mês pago: vale no mínimo 1 mês
  assert.ok(Date.parse(estadoDaAssinatura({ status: "ACTIVE", nextDueDate: "2026-11-10" }, pago, agora).validoAte) > Date.parse("2026-12-10"));
  assert.equal(estadoDaAssinatura({ status: "ACTIVE" }, { status: "PENDING" }, agora).validoAte, null, "ainda não pagou");
  assert.equal(estadoDaAssinatura({ status: "INACTIVE" }, null, agora).validoAte, null);
  assert.equal(estadoDaAssinatura({ status: "ACTIVE", deleted: true }, null, agora).status, "CANCELLED");
  assert.equal(estadoDaAssinatura({ status: "ACTIVE" }, { status: "REFUNDED" }, agora).validoAte, agora.toISOString());
  assert.equal(estadoDoPagamento({ status: "RECEIVED", paymentDate: "2026-11-10" }, agora).validoAte, "2027-11-10T15:00:00.000Z");
  assert.equal(estadoDoPagamento({ status: "REFUNDED" }, agora).validoAte, agora.toISOString());
  assert.equal(estadoDoPagamento({ status: "PENDING" }, agora).validoAte, null);
  assert.equal(estadoDoPagamento({ status: "OVERDUE" }, agora).validoAte, null);
});

test("cliente da API: endereço do Sandbox e chave no header access_token", async () => {
  const chamadas = [];
  const f = async (url, o) => { chamadas.push({ url, o }); return { ok: true, text: async () => '{"id":"chk_1"}' }; };
  const c = clienteAsaas({ chave: SANDBOX, api: API_SANDBOX }, f);
  await c.criarCheckout({ a: 1 });
  await c.cancelarAssinatura("sub_1");
  assert.equal(chamadas[0].url, "https://api-sandbox.asaas.com/v3/checkouts");
  assert.equal(chamadas[0].o.headers.access_token, SANDBOX);
  assert.equal(chamadas[1].o.method, "DELETE");
  assert.equal(chamadas[1].url, "https://api-sandbox.asaas.com/v3/subscriptions/sub_1");
  assert.equal(linkDoCheckout({ id: "abc" }), "https://sandbox.asaas.com/checkoutSession/show?id=abc");
  const erro = clienteAsaas({ chave: SANDBOX, api: API_SANDBOX }, async () => ({ ok: false, status: 400, text: async () => '{"errors":[{"description":"inválido"}]}' }));
  await assert.rejects(erro.criarCheckout({}), /Asaas 400: inválido/);
});

test("mensal: checkout → pagamento confirmado → Pro; cancelar → para de cobrar e vale até o fim do mês", async () => {
  const as = asaasFalso();
  const r = await iniciarCheckout({ email: "prof1@x.br", plano: "pro_mensal", origem: "https://e.app", cliente: as, api: API_SANDBOX });
  assert.ok(r.ok && r.url.includes("checkoutSession/show?id=chk"));
  const [chk] = [...as.checkouts.keys()];
  // o Asaas cria a assinatura e a 1ª cobrança a partir do checkout (externalReference pode não vir)
  as.subs.set("sub_1", { id: "sub_1", status: "ACTIVE", value: 39.9, nextDueDate: daqui(30), checkoutSession: chk, deleted: false });
  as.pags.set("pay_1", { id: "pay_1", status: "PENDING", value: 39.9, subscription: "sub_1", checkoutSession: chk });
  await processarAviso({ recurso: "pagamento", id: "pay_1" }, as);
  assert.equal(await C.cobrancaAtiva("prof1@x.br"), null, "pendente não dá Pro");
  as.pags.get("pay_1").status = "CONFIRMED";
  as.pags.get("pay_1").paymentDate = hoje();
  const p = await processarAviso({ recurso: "pagamento", id: "pay_1" }, as);
  assert.equal(p.status, "ACTIVE");
  const ativa = await C.cobrancaAtiva("prof1@x.br");
  assert.equal(ativa.plano, "pro_mensal");
  assert.equal(ativa.recursoId, "sub_1");
  assert.equal(await C.cobrancaAtiva("outro@x.br"), null, "isolamento entre contas");
  const c = await cancelarAssinaturaPaga("prof1@x.br", as);
  assert.ok(c.ok);
  assert.equal(as.subs.get("sub_1").deleted, true);
  const depois = await C.cobrancaAtiva("prof1@x.br");
  assert.equal(depois.plano, "pro_mensal", "cancelada continua valendo até o fim do mês pago");
  assert.equal(depois.status, "CANCELLED");
  assert.equal(depois.validoAte, ativa.validoAte);
  // aviso de assinatura removida (o Asaas manda depois): não corta nem duplica
  await processarAviso({ recurso: "assinatura", id: "sub_1" }, as);
  await processarAviso({ recurso: "pagamento", id: "pay_1" }, as);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM cobrancas WHERE recurso_id = 'sub_1'")).rows[0].n, 1);
  assert.equal((await C.cobrancaAtiva("prof1@x.br")).validoAte, ativa.validoAte);
});

test("mensal: valor diferente não ativa", async () => {
  const as = asaasFalso();
  await iniciarCheckout({ email: "p2@x.br", plano: "pro_mensal", origem: "https://e.app", cliente: as, api: API_SANDBOX });
  const [chk] = [...as.checkouts.keys()];
  as.subs.set("sub_2", { id: "sub_2", status: "ACTIVE", value: 1, nextDueDate: daqui(30), checkoutSession: chk });
  as.pags.set("pay_2", { id: "pay_2", status: "CONFIRMED", value: 1, paymentDate: hoje(), subscription: "sub_2", checkoutSession: chk });
  assert.equal((await processarAviso({ recurso: "pagamento", id: "pay_2" }, as)).feito, "valor-diferente");
  assert.equal(await C.cobrancaAtiva("p2@x.br"), null);
});

test("anual: Pix pago → 12 meses; parcelado 12x confere o total; devolução corta; pagamento de fora é ignorado", async () => {
  const as = asaasFalso();
  const r = await iniciarCheckout({ email: "p3@x.br", plano: "pro_anual", origem: "https://e.app", cliente: as, api: API_SANDBOX });
  assert.ok(r.ok);
  const [chk] = [...as.checkouts.keys()];
  as.pags.set("pay_3", { id: "pay_3", status: "RECEIVED", value: 358.8, paymentDate: hoje(), billingType: "PIX", checkoutSession: chk });
  assert.equal((await processarAviso({ recurso: "pagamento", id: "pay_3" }, as)).status, "RECEIVED");
  const a = await C.cobrancaAtiva("p3@x.br");
  assert.equal(a.plano, "pro_anual");
  assert.ok(Date.parse(a.validoAte) - Date.now() > 360 * 86400000);
  as.pags.get("pay_3").status = "REFUNDED";
  await processarAviso({ recurso: "pagamento", id: "pay_3" }, as);
  assert.equal(await C.cobrancaAtiva("p3@x.br"), null, "devolvido: volta ao Grátis");

  // cartão em 12x: cada parcela é um pagamento; 1 linha por parcelamento
  const r2 = await iniciarCheckout({ email: "p4@x.br", plano: "pro_anual", origem: "https://e.app", cliente: as, api: API_SANDBOX });
  const chk2 = [...as.checkouts.keys()].pop();
  as.insts.set("ins_1", { id: "ins_1", installmentCount: 12 });
  for (let i = 1; i <= 3; i++) {
    as.pags.set(`par_${i}`, { id: `par_${i}`, status: "CONFIRMED", value: 29.9, paymentDate: hoje(), installment: "ins_1", externalReference: r2.referencia });
    await processarAviso({ recurso: "pagamento", id: `par_${i}` }, as);
  }
  assert.equal((await C.cobrancaAtiva("p4@x.br")).plano, "pro_anual");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM cobrancas WHERE recurso_id = 'ins_1'")).rows[0].n, 1);
  assert.ok(chk2);

  as.pags.set("pay_x", { id: "pay_x", status: "RECEIVED", value: 358.8, externalReference: "referencia-que-nao-existe", checkoutSession: "chk_de_fora" });
  assert.equal((await processarAviso({ recurso: "pagamento", id: "pay_x" }, as)).feito, "sem-checkout");
  // o e-mail não vai para o banco
  const tudo = JSON.stringify((await db.query("SELECT * FROM checkouts")).rows) + JSON.stringify((await db.query("SELECT * FROM cobrancas")).rows);
  assert.ok(!/@x\.br/.test(tudo), "sem e-mail no banco");
});

test("migração 0006 desfaz e refaz sem erro", async () => {
  const m = listarMigracoes(new URL("../db/migracoes", import.meta.url).pathname).find((x) => x.nome === "0006_asaas");
  for (const i of lerInstrucoes(m.down)) await db.query(i);
  for (const i of lerInstrucoes(m.up)) await db.query(i);
  await assert.rejects(db.query("INSERT INTO checkouts (referencia, usuario_id, plano, provedor) VALUES ('z', 1, 'pro_mensal', 'outro')"));
});
