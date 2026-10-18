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

// ===================== Asaas =====================
import { configAsaas, corpoCheckoutAsaas, lerAvisoAsaas, tokenWebhookConfere, estadoDaCobrancaAsaas, valorConfereAsaas, linkDoCheckout } from "../lib/asaas.js";
import { iniciarCheckoutAsaas, processarAvisoAsaas, cancelarAssinaturaAsaas } from "../lib/cobranca.js";
import { provedorAtivo, vendaAberta } from "../lib/provedorPagamento.js";

function asaasFalso() {
  const cobr = new Map();
  const checkouts = [];
  const canceladas = [];
  let n = 0;
  return {
    cobr, checkouts, canceladas,
    criarCheckout: async (c) => { const id = `chk_${Math.random().toString(36).slice(2)}_${++n}`; checkouts.push({ id, ...c }); return { id, link: `https://sandbox.asaas.com/checkoutSession/show?id=${id}` }; },
    lerCobranca: async (id) => cobr.get(id),
    lerAssinatura: async (id) => ({ id }),
    cancelarAssinatura: async (id) => { canceladas.push(id); return { deleted: true, id }; },
  };
}

test("Asaas: teste só com chave de sandbox; produção só com interruptor e chave de produção; Asaas tem prioridade", () => {
  assert.equal(configAsaas({}).ok, false);
  assert.equal(configAsaas({ VERCEL_ENV: "preview", ASAAS_API_KEY: "$aact_hmlg_abc" }).ok, true);
  assert.equal(configAsaas({ VERCEL_ENV: "preview", ASAAS_API_KEY: "$aact_prod_abc" }).ok, false, "chave real no teste");
  const antiga = configAsaas({ VERCEL_ENV: "preview", ASAAS_API_KEY: "$aact_YTU5YTE0M2M2N2I4" });
  assert.ok(antiga.ok && antiga.api === "https://api-sandbox.asaas.com/v3", "chave no formato antigo: teste usa só o sandbox");
  const antigaProd = configAsaas({ VERCEL_ENV: "production", ASAAS_API_KEY: "$aact_YTU5YTE0M2M2N2I4", PAGAMENTOS_PRODUCAO: "1" });
  assert.equal(antigaProd.api, "https://api.asaas.com/v3");
  assert.equal(configAsaas({ VERCEL_ENV: "production", ASAAS_API_KEY: "$aact_prod_abc" }).ok, false, "sem PAGAMENTOS_PRODUCAO");
  assert.equal(configAsaas({ VERCEL_ENV: "production", ASAAS_API_KEY: "$aact_hmlg_abc", PAGAMENTOS_PRODUCAO: "1" }).ok, false);
  const prod = configAsaas({ VERCEL_ENV: "production", ASAAS_API_KEY: "$aact_prod_abc", PAGAMENTOS_PRODUCAO: "1" });
  assert.ok(prod.ok && prod.api === "https://api.asaas.com/v3");
  // colado com espaço, quebra de linha ou aspas: ainda vale
  const colado = configAsaas({ VERCEL_ENV: "production", ASAAS_API_KEY: ' "$aact_prod_abc"\n', PAGAMENTOS_PRODUCAO: " 1\n" });
  assert.ok(colado.ok && colado.chave === "$aact_prod_abc");
  assert.equal(configAsaas({ VERCEL_ENV: "preview", ASAAS_API_KEY: "$aact_hmlg_abc" }).api, "https://api-sandbox.asaas.com/v3");
  assert.equal(provedorAtivo({ VERCEL_ENV: "preview", ASAAS_API_KEY: "$aact_hmlg_x", MP_ACCESS_TOKEN: "TEST-1" }).provedor, "asaas");
  // venda em produção: fechada até o lançamento, mesmo com chave e PAGAMENTOS_PRODUCAO=1
  const envProd = { VERCEL_ENV: "production", ASAAS_API_KEY: "$aact_prod_abc", PAGAMENTOS_PRODUCAO: "1" };
  assert.equal(provedorAtivo(envProd).ok, true, "aviso/cancelar continuam");
  assert.equal(vendaAberta(envProd, false).ok, false, "nova venda fechada");
  assert.equal(vendaAberta(envProd, true).ok, true, "liberada no lançamento");
  assert.equal(vendaAberta({ VERCEL_ENV: "preview", ASAAS_API_KEY: "$aact_hmlg_x" }).ok, true, "site de teste sempre testa");
  assert.equal(linkDoCheckout({ id: "abc" }, true), "https://sandbox.asaas.com/checkoutSession/show?id=abc");
});

test("Asaas: corpo do checkout (mensal recorrente no cartão; anual Pix/cartão até 12x) com preços do plano", () => {
  const m = corpoCheckoutAsaas({ plano: "pro_mensal", referencia: "ref1", voltarPara: "https://e.app/assinatura", agora: new Date("2026-11-01T15:00:00Z") });
  assert.deepEqual(m.chargeTypes, ["RECURRENT"]);
  assert.equal(m.items[0].value, 39.9);
  assert.equal(m.subscription.cycle, "MONTHLY");
  assert.equal(m.subscription.nextDueDate, "2026-11-01 15:00:00");
  assert.equal(m.externalReference, "ref1");
  assert.equal(m.callback.successUrl, "https://e.app/assinatura?retorno=1");
  assert.equal(m.callback.cancelUrl, "https://e.app/planos");
  const a = corpoCheckoutAsaas({ plano: "pro_anual", referencia: "ref2", voltarPara: "https://e.app/assinatura" });
  assert.deepEqual(a.billingTypes, ["PIX", "CREDIT_CARD"]);
  assert.equal(a.items[0].value, 358.8);
  assert.equal(a.installment.maxInstallmentCount, 12);
});

test("Asaas: token do aviso e leitura dos eventos", () => {
  assert.equal(tokenWebhookConfere("abc", null), false, "sem token configurado: recusa");
  assert.equal(tokenWebhookConfere("x".repeat(40), "x".repeat(40)), true);
  assert.equal(tokenWebhookConfere("y".repeat(40), "x".repeat(40)), false);
  assert.deepEqual(lerAvisoAsaas({ event: "PAYMENT_CONFIRMED", payment: { id: "pay_1" } }), { evento: "PAYMENT_CONFIRMED", recurso: "cobranca", id: "pay_1" });
  assert.equal(lerAvisoAsaas({ event: "SUBSCRIPTION_DELETED", subscription: { id: "sub_1" } }).recurso, "assinatura");
  assert.equal(lerAvisoAsaas({ event: "CHECKOUT_PAID", checkout: { id: "chk_1" } }).recurso, "checkout");
  assert.equal(lerAvisoAsaas({ event: "OUTRO" }), null);
});

test("Asaas: estados e valores (parcela do anual confere pelo total)", () => {
  const agora = new Date("2026-11-10T12:00:00Z");
  assert.equal(estadoDaCobrancaAsaas({ status: "CONFIRMED", dueDate: "2026-11-10", subscription: "sub_x" }, "pro_mensal", agora).validoAte, "2026-12-13T12:00:00.000Z");
  assert.equal(estadoDaCobrancaAsaas({ status: "RECEIVED", confirmedDate: "2026-11-10" }, "pro_anual", agora).validoAte, "2027-11-10T12:00:00.000Z");
  assert.equal(estadoDaCobrancaAsaas({ status: "REFUNDED" }, "pro_anual", agora).validoAte, agora.toISOString());
  assert.equal(estadoDaCobrancaAsaas({ status: "PENDING" }, "pro_anual", agora).validoAte, null);
  assert.ok(valorConfereAsaas("pro_anual", { value: 358.8 }));
  assert.ok(valorConfereAsaas("pro_anual", { value: 29.9, installmentCount: 12 }));
  assert.ok(!valorConfereAsaas("pro_anual", { value: 10, installmentCount: 12 }));
  assert.ok(valorConfereAsaas("pro_mensal", { value: 39.9 }));
});

test("Asaas mensal: checkout → 1ª cobrança paga → Pro; 2ª mensalidade só com o id da assinatura estende; cancelar mantém até o fim", async () => {
  const as = asaasFalso();
  const r = await iniciarCheckoutAsaas({ email: "a1@x.br", plano: "pro_mensal", origem: "https://e.app", cliente: as, sandbox: true });
  assert.ok(r.ok && r.url.includes("checkoutSession/show?id=chk_"));
  const chk = as.checkouts[0];
  assert.equal(chk.externalReference, r.referencia);
  const hoje = new Date().toISOString().slice(0, 10);
  // 1ª cobrança: vem com o id do checkout (sem externalReference)
  as.cobr.set("pay_1", { id: "pay_1", status: "CONFIRMED", value: 39.9, dueDate: hoje, subscription: "sub_9", checkoutSession: chk.id });
  assert.equal((await processarAvisoAsaas({ recurso: "cobranca", id: "pay_1" }, as)).feito, "assinatura");
  const c1 = await C.cobrancaAtiva("a1@x.br");
  assert.equal(c1.plano, "pro_mensal");
  assert.equal(c1.status, "ACTIVE");
  // 2ª mensalidade: só o id da assinatura
  const prox = new Date(Date.now() + 31 * 86400000).toISOString().slice(0, 10);
  as.cobr.set("pay_2", { id: "pay_2", status: "RECEIVED", value: 39.9, dueDate: prox, subscription: "sub_9" });
  await processarAvisoAsaas({ recurso: "cobranca", id: "pay_2" }, as);
  const c2 = await C.cobrancaAtiva("a1@x.br");
  assert.ok(Date.parse(c2.validoAte) > Date.parse(c1.validoAte), "estende");
  // aviso antigo repetido não encurta
  await processarAvisoAsaas({ recurso: "cobranca", id: "pay_1" }, as);
  assert.equal((await C.cobrancaAtiva("a1@x.br")).validoAte, c2.validoAte);
  // cancelar
  const k = await cancelarAssinaturaAsaas("a1@x.br", as);
  assert.ok(k.ok);
  assert.deepEqual(as.canceladas, ["sub_9"]);
  const c3 = await C.cobrancaAtiva("a1@x.br");
  assert.equal(c3.status, "CANCELLED");
  assert.equal(c3.validoAte, c2.validoAte, "continua até o fim do mês pago");
  // com Pro valendo, não abre outro MENSAL (o anual pode: soma a partir do fim, ver teste abaixo)
  const n = as.checkouts.length;
  const dup = await iniciarCheckoutAsaas({ email: "a1@x.br", plano: "pro_mensal", origem: "https://e.app", cliente: as, sandbox: true });
  assert.equal(dup.ok, false);
  assert.equal(dup.status, 409);
  assert.match(dup.erro, /já tem o Pro ativo até/);
  assert.equal(as.checkouts.length, n, "não chamou o Asaas");
});

test("Asaas anual: Pix pago → 12 meses; estorno corta; cobrança desconhecida e valor errado não ativam", async () => {
  const as = asaasFalso();
  const r = await iniciarCheckoutAsaas({ email: "a2@x.br", plano: "pro_anual", origem: "https://e.app", cliente: as, sandbox: true });
  assert.ok(r.ok, JSON.stringify(r));
  as.cobr.set("pay_10", { id: "pay_10", status: "RECEIVED", value: 358.8, confirmedDate: new Date().toISOString().slice(0, 10), externalReference: r.referencia });
  const pr = await processarAvisoAsaas({ recurso: "cobranca", id: "pay_10" }, as);
  assert.equal(pr.feito, "pagamento", JSON.stringify(pr));
  const a = await C.cobrancaAtiva("a2@x.br");
  assert.equal(a.plano, "pro_anual");
  assert.ok(Date.parse(a.validoAte) - Date.now() > 360 * 86400000);
  as.cobr.get("pay_10").status = "REFUNDED";
  await processarAvisoAsaas({ recurso: "cobranca", id: "pay_10" }, as);
  assert.equal(await C.cobrancaAtiva("a2@x.br"), null, "estorno: volta ao Grátis");
  as.cobr.set("pay_x", { id: "pay_x", status: "RECEIVED", value: 358.8 });
  assert.equal((await processarAvisoAsaas({ recurso: "cobranca", id: "pay_x" }, as)).feito, "sem-checkout");
  const r2 = await iniciarCheckoutAsaas({ email: "a3@x.br", plano: "pro_anual", origem: "https://e.app", cliente: as, sandbox: true });
  as.cobr.set("pay_y", { id: "pay_y", status: "RECEIVED", value: 1, externalReference: r2.referencia });
  assert.equal((await processarAvisoAsaas({ recurso: "cobranca", id: "pay_y" }, as)).feito, "valor-diferente");
  assert.equal(await C.cobrancaAtiva("a3@x.br"), null);
});

test("Asaas anual: conta sem chave Pix → abre o checkout só com cartão", async () => {
  const as = asaasFalso();
  const original = as.criarCheckout;
  as.criarCheckout = async (c) => {
    if (c.billingTypes.includes("PIX")) {
      const e = new Error("Asaas 400: Não há nenhuma chave Pix cadastrada.");
      e.status = 400;
      throw e;
    }
    return original(c);
  };
  const r = await iniciarCheckoutAsaas({ email: "semPix@x.br", plano: "pro_anual", origem: "https://e.app", cliente: as, sandbox: true });
  assert.ok(r.ok);
  assert.deepEqual(as.checkouts.at(-1).billingTypes, ["CREDIT_CARD"]);
});

test("Asaas mensal no Pix: 1 mês sem renovação; renovar nos últimos dias soma ao fim; com Pro sobrando muito, bloqueia", async () => {
  const as = asaasFalso();
  const r = await iniciarCheckoutAsaas({ email: "pix1@x.br", plano: "pro_mensal", forma: "pix", origem: "https://e.app", cliente: as, sandbox: true });
  assert.ok(r.ok, JSON.stringify(r));
  const chk = as.checkouts.at(-1);
  assert.deepEqual(chk.billingTypes, ["PIX"]);
  assert.deepEqual(chk.chargeTypes, ["DETACHED"]);
  assert.equal(chk.subscription, undefined);
  const hoje = new Date().toISOString().slice(0, 10);
  as.cobr.set("pix_1", { id: "pix_1", status: "RECEIVED", value: 39.9, confirmedDate: hoje, externalReference: r.referencia });
  assert.equal((await processarAvisoAsaas({ recurso: "cobranca", id: "pix_1" }, as)).feito, "pagamento");
  const c1 = await C.cobrancaAtiva("pix1@x.br");
  assert.equal(c1.plano, "pro_mensal");
  const dias = (Date.parse(c1.validoAte) - Date.now()) / 86400000;
  assert.ok(dias > 27 && dias < 32, `1 mês (${dias})`);
  // aviso repetido não soma de novo
  await processarAvisoAsaas({ recurso: "cobranca", id: "pix_1" }, as);
  assert.equal((await C.cobrancaAtiva("pix1@x.br")).validoAte, c1.validoAte);
  // com ~30 dias sobrando: não abre outro Pix
  const dup = await iniciarCheckoutAsaas({ email: "pix1@x.br", plano: "pro_mensal", forma: "pix", origem: "https://e.app", cliente: as, sandbox: true });
  assert.equal(dup.status, 409);
});

test("estado do mensal no Pix: renovação antes do fim começa do fim atual", () => {
  const agora = new Date("2026-10-14T12:00:00Z");
  const base = "2026-10-18T12:00:00.000Z";
  const e = estadoDaCobrancaAsaas({ status: "RECEIVED", value: 39.9, confirmedDate: "2026-10-14" }, "pro_mensal", agora, { base });
  assert.equal(e.validoAte, "2026-11-18T12:00:00.000Z");
  const sem = estadoDaCobrancaAsaas({ status: "RECEIVED", value: 39.9, confirmedDate: "2026-10-14" }, "pro_mensal", agora);
  assert.equal(sem.validoAte, "2026-11-14T12:00:00.000Z");
  // cartão (com assinatura) continua a regra antiga: vencimento + 1 mês + 3 dias
  const cartao = estadoDaCobrancaAsaas({ status: "CONFIRMED", value: 39.9, dueDate: "2026-10-14", subscription: "sub_1" }, "pro_mensal", agora);
  assert.equal(cartao.validoAte, "2026-11-17T12:00:00.000Z");
});

test("Asaas mensal: estorno do cartão (assinatura) e do Pix avulso cortam o Pro na hora; estorno negado não mexe", async () => {
  const as = asaasFalso();
  const hoje = new Date().toISOString().slice(0, 10);
  // cartão (assinatura)
  const r = await iniciarCheckoutAsaas({ email: "e1@x.br", plano: "pro_mensal", origem: "https://e.app", cliente: as, sandbox: true });
  const chk = as.checkouts.at(-1);
  as.cobr.set("pay_c1", { id: "pay_c1", status: "CONFIRMED", value: 39.9, dueDate: hoje, subscription: "sub_e1", checkoutSession: chk.id });
  await processarAvisoAsaas({ recurso: "cobranca", id: "pay_c1" }, as);
  assert.equal((await C.cobrancaAtiva("e1@x.br")).plano, "pro_mensal");
  as.cobr.get("pay_c1").status = "REFUND_IN_PROGRESS";
  await processarAvisoAsaas({ recurso: "cobranca", id: "pay_c1" }, as);
  assert.equal(await C.cobrancaAtiva("e1@x.br"), null, "estorno do cartão em andamento: volta ao Grátis");
  assert.ok(r.ok);
  // Pix avulso (1 mês)
  const r2 = await iniciarCheckoutAsaas({ email: "e2@x.br", plano: "pro_mensal", forma: "pix", origem: "https://e.app", cliente: as, sandbox: true });
  as.cobr.set("pay_p1", { id: "pay_p1", status: "RECEIVED", value: 39.9, confirmedDate: hoje, externalReference: r2.referencia });
  await processarAvisoAsaas({ recurso: "cobranca", id: "pay_p1" }, as);
  const antes = await C.cobrancaAtiva("e2@x.br");
  assert.equal(antes.plano, "pro_mensal");
  // estorno NEGADO: o Asaas avisa, mas a cobrança continua RECEIVED → nada muda
  await processarAvisoAsaas({ recurso: "cobranca", id: "pay_p1" }, as);
  assert.equal((await C.cobrancaAtiva("e2@x.br")).validoAte, antes.validoAte);
  as.cobr.get("pay_p1").status = "REFUNDED";
  await processarAvisoAsaas({ recurso: "cobranca", id: "pay_p1" }, as);
  assert.equal(await C.cobrancaAtiva("e2@x.br"), null, "estorno do Pix: volta ao Grátis");
});


test("Asaas: mensal → anual começa no fim do mês pago, cancela a renovação do cartão; estorno do anual volta ao fim do mensal; anual + anual soma 1 ano", async () => {
  const as = asaasFalso();
  const hoje = new Date().toISOString().slice(0, 10);
  const r1 = await iniciarCheckoutAsaas({ email: "u1@x.br", plano: "pro_mensal", origem: "https://e.app", cliente: as, sandbox: true });
  assert.ok(r1.ok);
  as.cobr.set("pay_m1", { id: "pay_m1", status: "CONFIRMED", value: 39.9, dueDate: hoje, subscription: "sub_u1", checkoutSession: as.checkouts.at(-1).id });
  await processarAvisoAsaas({ recurso: "cobranca", id: "pay_m1" }, as);
  const mensal = await C.cobrancaAtiva("u1@x.br");
  assert.equal(mensal.plano, "pro_mensal");
  // (a) antes de pagar: as datas do anual
  const r2 = await iniciarCheckoutAsaas({ email: "u1@x.br", plano: "pro_anual", origem: "https://e.app", cliente: as, sandbox: true });
  assert.ok(r2.ok, JSON.stringify(r2));
  assert.equal(r2.periodo.inicio, mensal.validoAte);
  const esperado = new Date(mensal.validoAte);
  esperado.setUTCMonth(esperado.getUTCMonth() + 12);
  assert.equal(r2.periodo.fim, esperado.toISOString());
  assert.match(as.checkouts.at(-1).items[0].description, /de \d{2}\/\d{2}\/\d{4} a \d{2}\/\d{2}\/\d{4}/);
  // anual pago: vale até o fim do mensal + 12 meses, e a mensal no cartão é cancelada
  as.cobr.set("pay_a1", { id: "pay_a1", status: "RECEIVED", value: 358.8, confirmedDate: hoje, externalReference: r2.referencia });
  const pa = await processarAvisoAsaas({ recurso: "cobranca", id: "pay_a1" }, as);
  assert.deepEqual(pa.mensalCancelada, ["sub_u1"]);
  assert.ok(as.canceladas.includes("sub_u1"));
  const anual = await C.cobrancaAtiva("u1@x.br");
  assert.equal(anual.plano, "pro_anual");
  assert.equal(anual.validoAte.slice(0, 10), esperado.toISOString().slice(0, 10), "fim do mensal + 12 meses");
  // aviso repetido não muda
  await processarAvisoAsaas({ recurso: "cobranca", id: "pay_a1" }, as);
  assert.equal((await C.cobrancaAtiva("u1@x.br")).validoAte, anual.validoAte);
  // (b) estorno do anual: volta para o fim do mensal, não para o Grátis
  as.cobr.get("pay_a1").status = "REFUNDED";
  await processarAvisoAsaas({ recurso: "cobranca", id: "pay_a1" }, as);
  const volta = await C.cobrancaAtiva("u1@x.br");
  assert.equal(volta.plano, "pro_mensal");
  assert.equal(volta.validoAte, mensal.validoAte);
  // (c) anual + anual: soma 1 ano a partir do fim do anual atual
  const r3 = await iniciarCheckoutAsaas({ email: "u2@x.br", plano: "pro_anual", origem: "https://e.app", cliente: as, sandbox: true });
  as.cobr.set("pay_b1", { id: "pay_b1", status: "RECEIVED", value: 358.8, confirmedDate: hoje, externalReference: r3.referencia });
  await processarAvisoAsaas({ recurso: "cobranca", id: "pay_b1" }, as);
  const a1 = await C.cobrancaAtiva("u2@x.br");
  const r4 = await iniciarCheckoutAsaas({ email: "u2@x.br", plano: "pro_anual", origem: "https://e.app", cliente: as, sandbox: true });
  assert.ok(r4.ok);
  assert.equal(r4.periodo.inicio, a1.validoAte);
  as.cobr.set("pay_b2", { id: "pay_b2", status: "RECEIVED", value: 358.8, confirmedDate: hoje, externalReference: r4.referencia });
  await processarAvisoAsaas({ recurso: "cobranca", id: "pay_b2" }, as);
  const a2 = await C.cobrancaAtiva("u2@x.br");
  const dois = new Date(a1.validoAte);
  dois.setUTCMonth(dois.getUTCMonth() + 12);
  assert.equal(a2.validoAte.slice(0, 10), dois.toISOString().slice(0, 10), "fim do anual atual + 12 meses");
});
