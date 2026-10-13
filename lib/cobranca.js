// Fluxo de cobrança (Asaas) com banco: abrir checkout, processar aviso, cancelar.
// O cliente da API é injetado (testes usam um falso; nada sai para a rede).
import * as Banco from "./contas.js";
import { PLANOS_PAGOS, novaReferencia, corpoCheckout, linkDoCheckout, estadoDaAssinatura, estadoDoPagamento, valorConfere, pagamentoPago } from "./pagamentos.js";

// Abre o Checkout do Asaas e devolve o link para onde o professor vai.
export async function iniciarCheckout({ email, plano, origem, cliente, api }) {
  if (!PLANOS_PAGOS.includes(plano)) return { ok: false, status: 400, erro: "Plano inválido." };
  const referencia = novaReferencia();
  await Banco.criarCheckout(email, plano, "asaas", referencia);
  try {
    const c = await cliente.criarCheckout(corpoCheckout({ plano, referencia, voltarPara: `${origem}/assinatura` }));
    if (!c?.id) throw new Error("O Asaas não devolveu o checkout.");
    await Banco.gravarSessaoCheckout(referencia, c.id);
    const url = linkDoCheckout(c, api);
    return { ok: true, url, referencia };
  } catch (e) {
    console.error("Checkout falhou:", e?.status, e?.message);
    return { ok: false, status: 502, erro: "Não foi possível abrir o pagamento agora. Tente de novo em instantes." };
  }
}

// Acha o checkout (e a conta) de um pagamento/assinatura do Asaas
async function checkoutDe(...objetos) {
  for (const o of objetos) {
    if (!o) continue;
    const ck = (await Banco.checkoutPorSessao(o.checkoutSession)) || (await Banco.checkoutPorReferencia(o.externalReference));
    if (ck) return ck;
  }
  return null;
}

// Aviso do Asaas: relê o recurso na API (nunca confia no corpo) e grava o estado.
// Devolve o que foi feito (para o registro).
export async function processarAviso(aviso, cliente, agora = new Date()) {
  if (!aviso) return { feito: "ignorado" };

  if (aviso.recurso === "assinatura") {
    const sub = await cliente.lerAssinatura(aviso.id);
    const ck = await checkoutDe(sub);
    if (!ck || ck.plano !== "pro_mensal") return { feito: "sem-checkout" };
    const e = estadoDaAssinatura(sub, null, agora);
    const r = await Banco.registrarCobranca({ referencia: ck.referencia, tipo: "assinatura", recursoId: sub.id, status: e.status, valor: e.valor, validoAte: e.validoAte });
    return { feito: "assinatura", ...r };
  }

  if (aviso.recurso === "pagamento") {
    const p = await cliente.lerPagamento(aviso.id);
    if (p?.subscription) {
      // cobrança de um mês da assinatura
      const sub = await cliente.lerAssinatura(p.subscription);
      const ck = await checkoutDe(p, sub);
      if (!ck || ck.plano !== "pro_mensal") return { feito: "sem-checkout" };
      const e = estadoDaAssinatura(sub, p, agora);
      if (e.status === "ACTIVE" && !valorConfere("pro_mensal", Number(p.value))) return { feito: "valor-diferente", valor: Number(p.value) };
      const r = await Banco.registrarCobranca({ referencia: ck.referencia, tipo: "assinatura", recursoId: sub.id, status: e.status, valor: e.valor, validoAte: e.validoAte });
      return { feito: "assinatura", ...r };
    }
    // plano anual: Pix à vista ou cartão parcelado (cada parcela vira um pagamento; guardamos 1 linha por parcelamento)
    const ck = await checkoutDe(p);
    if (!ck || ck.plano !== "pro_anual") return { feito: "sem-checkout" };
    const e = estadoDoPagamento(p, agora);
    // parcelado: confere o total (parcela × quantidade). Se a leitura falhar, o erro sobe e o Asaas reenvia o aviso.
    const parcelas = p.installment ? Number((await cliente.lerParcelamento(p.installment))?.installmentCount) || 1 : 1;
    if (pagamentoPago(p) && !valorConfere("pro_anual", Number(p.value), parcelas)) return { feito: "valor-diferente", valor: Number(p.value) };
    const r = await Banco.registrarCobranca({ referencia: ck.referencia, tipo: "pagamento", recursoId: p.installment || p.id, status: e.status, valor: Math.round(Number(p.value) * parcelas * 100) / 100, validoAte: e.validoAte });
    return { feito: "pagamento", ...r };
  }
  return { feito: "ignorado" };
}

// Cancelar a assinatura mensal: para de cobrar; o plano vale até o fim do mês já pago.
// O anual é pago à vista/parcelado: não há o que cancelar (reembolso em 7 dias é pelo contato).
export async function cancelarAssinaturaPaga(email, cliente) {
  const c = await Banco.ultimaCobranca(email);
  if (!c || c.tipo !== "assinatura") return { ok: false, status: 400, erro: "Você não tem assinatura mensal para cancelar." };
  if (c.status === "CANCELLED") return { ok: true, jaCancelada: true, validoAte: c.validoAte };
  const sub = await cliente.lerAssinatura(c.recursoId);
  const ck = await checkoutDe(sub);
  if (!ck) return { ok: false, status: 400, erro: "Assinatura não encontrada." };
  await cliente.cancelarAssinatura(c.recursoId);
  const r = await Banco.registrarCobranca({ referencia: ck.referencia, tipo: "assinatura", recursoId: c.recursoId, status: "CANCELLED" });
  return { ok: true, validoAte: r?.validoAte || c.validoAte };
}
