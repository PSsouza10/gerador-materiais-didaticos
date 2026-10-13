// Fluxo de cobrança (Mercado Pago) com banco: abrir checkout, processar aviso, cancelar.
// O cliente da API é injetado (testes usam um falso; nada sai para a rede).
import * as Banco from "./contas.js";
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
    const r = await Banco.registrarCobranca({ referencia: ck.referencia, tipo: "pagamento", recursoId: p.id, status: e.status, valor: e.valor, validoAte: e.validoAte });
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
