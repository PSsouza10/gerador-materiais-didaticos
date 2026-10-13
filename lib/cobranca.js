// Fluxo de cobrança (Mercado Pago) com banco: abrir checkout, processar aviso, cancelar.
// O cliente da API é injetado (testes usam um falso; nada sai para a rede).
import * as Banco from "./contas.js";
import { estadoDaCobrancaAsaas, valorConfereAsaas, corpoCheckoutAsaas, linkDoCheckout } from "./asaas.js";
import { PLANOS_PAGOS, novaReferencia, corpoAssinaturaMensal, corpoPreferenciaAnual, estadoDaAssinatura, estadoDoPagamento, valorConfere, emailValido } from "./pagamentos.js";

// Abre o pagamento e devolve o link do Mercado Pago para onde o professor vai.
export async function iniciarCheckout({ email, plano, emailPagador, origem, cliente }) {
  if (!PLANOS_PAGOS.includes(plano)) return { ok: false, status: 400, erro: "Plano inválido." };
  if (plano === "pro_mensal" && !emailValido(emailPagador)) return { ok: false, status: 400, erro: "Informe o e-mail da sua conta do Mercado Pago." };
  const referencia = novaReferencia();
  await Banco.criarCheckout(email, plano, "mercadopago", referencia);
  const voltarPara = `${origem}/assinatura?retorno=1`;
  try {
    if (plano === "pro_mensal") {
      const a = await cliente.criarAssinatura(corpoAssinaturaMensal({ referencia, emailPagador: String(emailPagador).trim(), voltarPara }));
      if (a?.id) await Banco.registrarCobranca({ referencia, tipo: "assinatura", recursoId: a.id, status: a.status || "pending" });
      if (!a?.init_point) throw new Error("Mercado Pago não devolveu o link da assinatura.");
      return { ok: true, url: a.init_point, referencia };
    }
    const p = await cliente.criarPreferencia(corpoPreferenciaAnual({ referencia, voltarPara, notificacao: `${origem}/api/pagamentos/webhook` }));
    if (!p?.init_point) throw new Error("Mercado Pago não devolveu o link de pagamento.");
    return { ok: true, url: p.init_point, referencia };
  } catch (e) {
    console.error("Checkout falhou:", e?.status, e?.message);
    // e-mail do pagador recusado é o erro mais comum na assinatura
    const msg = e?.status === 400 && plano === "pro_mensal"
      ? "O Mercado Pago recusou o pedido. Confira se o e-mail é o da sua conta do Mercado Pago."
      : "Não foi possível abrir o pagamento agora. Tente de novo em instantes.";
    return { ok: false, status: 502, erro: msg };
  }
}

// Aviso do Mercado Pago: relê o recurso na API (nunca confia no corpo) e grava o estado.
// Devolve o que foi feito (para o registro).
export async function processarAviso(aviso, cliente, agora = new Date()) {
  if (!aviso) return { feito: "ignorado" };
  if (aviso.recurso === "assinatura") {
    const a = await cliente.lerAssinatura(aviso.id);
    const ck = await Banco.checkoutPorReferencia(a?.external_reference);
    if (!ck || ck.plano !== "pro_mensal") return { feito: "sem-checkout" };
    const e = estadoDaAssinatura(a, agora);
    if (e.status === "authorized" && !valorConfere("pro_mensal", e.valor)) return { feito: "valor-diferente", valor: e.valor };
    const r = await Banco.registrarCobranca({ referencia: ck.referencia, tipo: "assinatura", recursoId: a.id, status: e.status, valor: e.valor, validoAte: e.validoAte });
    return { feito: "assinatura", ...r };
  }
  if (aviso.recurso === "pagamento") {
    const p = await cliente.lerPagamento(aviso.id);
    const ck = await Banco.checkoutPorReferencia(p?.external_reference);
    // pagamentos mensais da assinatura também chegam aqui: só o anual é pagamento único
    if (!ck || ck.plano !== "pro_anual") return { feito: "sem-checkout" };
    const e = estadoDoPagamento(p, agora);
    if (e.status === "approved" && !valorConfere("pro_anual", e.valor)) return { feito: "valor-diferente", valor: e.valor };
    const revogar = ["refunded", "charged_back", "cancelled"].includes(e.status);
    const r = await Banco.registrarCobranca({ referencia: ck.referencia, tipo: "pagamento", recursoId: p.id, status: e.status, valor: e.valor, validoAte: e.validoAte, revogar });
    return { feito: "pagamento", ...r };
  }
  return { feito: "ignorado" };
}

// Cancelar a assinatura mensal: para de cobrar; o plano vale até o fim do mês já pago.
// O anual é pago à vista: não há o que cancelar (reembolso em 7 dias é pelo contato).
export async function cancelarAssinaturaPaga(email, cliente) {
  const c = await Banco.ultimaCobranca(email);
  if (!c || c.tipo !== "assinatura") return { ok: false, status: 400, erro: "Você não tem assinatura mensal para cancelar." };
  if (c.status === "cancelled") return { ok: true, jaCancelada: true, validoAte: c.validoAte };
  const a = await cliente.cancelarAssinatura(c.recursoId);
  const ck = await Banco.checkoutPorReferencia(a?.external_reference);
  const r = ck ? await Banco.registrarCobranca({ referencia: ck.referencia, tipo: "assinatura", recursoId: c.recursoId, status: a?.status || "cancelled" }) : null;
  return { ok: true, validoAte: r?.validoAte || c.validoAte };
}

// ===================== Asaas =====================

export async function iniciarCheckoutAsaas({ email, plano, origem, cliente, sandbox, agora = new Date() }) {
  if (!PLANOS_PAGOS.includes(plano)) return { ok: false, status: 400, erro: "Plano inválido." };
  const referencia = novaReferencia();
  await Banco.criarCheckout(email, plano, "asaas", referencia);
  try {
    const r = await cliente.criarCheckout(corpoCheckoutAsaas({ plano, referencia, voltarPara: `${origem}/assinatura`, agora }));
    if (r?.id) await Banco.definirIdCheckout(referencia, r.id);
    const url = linkDoCheckout(r, sandbox);
    if (!url) throw new Error("Asaas não devolveu o link do checkout.");
    return { ok: true, url, referencia };
  } catch (e) {
    console.error("Checkout Asaas falhou:", e?.status, e?.message);
    return { ok: false, status: 502, erro: "Não foi possível abrir o pagamento agora. Tente de novo em instantes." };
  }
}

// Acha o checkout de uma cobrança: referência, id do checkout ou assinatura já conhecida
async function checkoutDaCobranca(pg) {
  return (
    (pg?.externalReference && (await Banco.checkoutPorReferencia(pg.externalReference))) ||
    (pg?.checkoutSession && (await Banco.checkoutPorIdProvedor("asaas", pg.checkoutSession))) ||
    (pg?.subscription && (await Banco.checkoutPorRecurso("asaas", "assinatura", pg.subscription))) ||
    null
  );
}

export async function processarAvisoAsaas(aviso, cliente, agora = new Date()) {
  if (!aviso) return { feito: "ignorado" };
  if (aviso.recurso === "cobranca") {
    const pg = await cliente.lerCobranca(aviso.id); // nunca confia no corpo do aviso
    const ck = await checkoutDaCobranca(pg);
    if (!ck) return { feito: "sem-checkout", campos: Object.keys(pg || {}).filter((k) => ["externalReference", "checkoutSession", "subscription", "installment"].includes(k) && pg[k]) };
    const e = estadoDaCobrancaAsaas(pg, ck.plano, agora);
    if (e.validoAte && !e.status.startsWith("REFUND") && !e.status.startsWith("CHARGEBACK") && !e.status.startsWith("AWAITING") && !valorConfereAsaas(ck.plano, pg))
      return { feito: "valor-diferente", valor: e.valor };
    const ehAssinatura = ck.plano === "pro_mensal" && pg.subscription;
    const tipo = ehAssinatura ? "assinatura" : "pagamento";
    const recursoId = ehAssinatura ? pg.subscription : pg.installment || pg.id;
    const revogar = /^(REFUND|CHARGEBACK|AWAITING_CHARGEBACK)/.test(e.status);
    const status = ehAssinatura && !revogar ? (e.validoAte ? "ACTIVE" : e.status) : e.status;
    const r = await Banco.registrarCobranca({ referencia: ck.referencia, tipo, recursoId, status, valor: e.valor, validoAte: e.validoAte, revogar });
    return { feito: tipo, ...r };
  }
  if (aviso.recurso === "assinatura") {
    // assinatura apagada/inativada: não cobra mais; o plano vale até o fim do mês pago
    const ck = await Banco.checkoutPorRecurso("asaas", "assinatura", aviso.id);
    if (!ck) return { feito: "sem-checkout" };
    const r = await Banco.registrarCobranca({ referencia: ck.referencia, tipo: "assinatura", recursoId: aviso.id, status: "CANCELLED" });
    return { feito: "assinatura", ...r };
  }
  return { feito: "ignorado", evento: aviso.evento };
}

export async function cancelarAssinaturaAsaas(email, cliente) {
  const c = await Banco.ultimaCobranca(email);
  if (!c || c.tipo !== "assinatura" || c.provedor !== "asaas") return { ok: false, status: 400, erro: "Você não tem assinatura mensal para cancelar." };
  if (c.status === "CANCELLED") return { ok: true, jaCancelada: true, validoAte: c.validoAte };
  await cliente.cancelarAssinatura(c.recursoId);
  const ck = await Banco.checkoutPorRecurso("asaas", "assinatura", c.recursoId);
  const r = ck ? await Banco.registrarCobranca({ referencia: ck.referencia, tipo: "assinatura", recursoId: c.recursoId, status: "CANCELLED" }) : null;
  return { ok: true, validoAte: r?.validoAte || c.validoAte };
}
