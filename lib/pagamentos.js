// Pagamentos do EduGera pelo Asaas (conta de pessoa física do Paulo, sem MEI).
//   Pro mensal → ASSINATURA no cartão de crédito (Checkout do Asaas, cobrança RECURRENT), renova todo mês.
//   Pro anual  → PAGAMENTO ÚNICO no Checkout do Asaas: Pix à vista ou cartão em até 12x. Vale 12 meses.
//
// Regras de segurança:
//   - Site de teste: só aceita chave do SANDBOX do Asaas ("$aact_hmlg_..."). Nunca cobra dinheiro real.
//   - Produção: só cobra com PAGAMENTOS_PRODUCAO=1 (interruptor que só o Paulo liga) e chave de produção.
//   - O webhook confere o token do aviso (header "asaas-access-token") e, sobretudo, NUNCA confia
//     no corpo recebido: relê o pagamento/assinatura na API do Asaas com a nossa chave.
//   - O e-mail do professor não vai para o banco: o pagamento é ligado à conta pelo id do
//     Checkout (checkoutSession) e por uma referência aleatória (externalReference) em "checkouts".
// Funções puras aqui; banco em lib/contas.js; fluxo em lib/cobranca.js; rotas em app/api/pagamentos/.
import { randomBytes, timingSafeEqual } from "crypto";
import { ehProducao } from "./ambiente.js";
import { PLANOS } from "./planos.js";
import { IMAGEM_ITEM } from "./asaasImagem.js";

export const API_SANDBOX = "https://api-sandbox.asaas.com/v3";
export const API_PRODUCAO = "https://api.asaas.com/v3";
export const PLANOS_PAGOS = ["pro_mensal", "pro_anual"];
const TOLERANCIA_DIAS = 3; // cartão recusado num dia: o plano não cai na hora

// Chave do sandbox começa com "$aact_hmlg_"; a de produção, com "$aact_prod_".
const ehChaveSandbox = (k) => /^\$?aact_hmlg_/.test(k);
const ehChaveProducao = (k) => /^\$?aact_prod_/.test(k);

// Pode cobrar neste ambiente? { ok, motivo, chave, tokenAviso, api, teste }
export function configPagamentos(env = process.env) {
  const chave = String(env.ASAAS_API_KEY || "").trim();
  const tokenAviso = String(env.ASAAS_WEBHOOK_TOKEN || "").trim() || null;
  if (!chave) return { ok: false, motivo: "Pagamento ainda não configurado." };
  if (ehProducao(env)) {
    if (env.PAGAMENTOS_PRODUCAO !== "1") return { ok: false, motivo: "A assinatura ainda não está aberta." };
    if (!ehChaveProducao(chave)) return { ok: false, motivo: "Chave que não é de produção na produção: pagamento desligado." };
    if (!tokenAviso) return { ok: false, motivo: "Falta o token do aviso (ASAAS_WEBHOOK_TOKEN)." };
    return { ok: true, chave, tokenAviso, api: API_PRODUCAO, teste: false };
  }
  // site de teste com chave de verdade: recusa (evita cobrança real por engano)
  if (!ehChaveSandbox(chave)) return { ok: false, motivo: "No site de teste só vale a chave do Sandbox do Asaas." };
  return { ok: true, chave, tokenAviso, api: API_SANDBOX, teste: true };
}

export const novaReferencia = () => randomBytes(16).toString("hex");

const precoDe = (plano) => Number(PLANOS[plano]?.preco);
const hojeISO = (agora = new Date()) => new Date(agora.getTime() - 3 * 3600000).toISOString().slice(0, 10); // data de Brasília

// Corpo do Checkout do Asaas (POST /checkouts). O professor preenche nome/CPF na página do Asaas.
export function corpoCheckout({ plano, referencia, voltarPara, agora = new Date() }) {
  const base = {
    externalReference: referencia,
    minutesToExpire: 60,
    callback: { successUrl: `${voltarPara}?retorno=1`, cancelUrl: voltarPara, expiredUrl: voltarPara },
  };
  if (plano === "pro_mensal") {
    return {
      ...base,
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["RECURRENT"],
      items: [{ name: "EduGera Pro mensal", description: "Assinatura mensal do EduGera Pro. Cancele quando quiser.", quantity: 1, value: precoDe("pro_mensal"), imageBase64: IMAGEM_ITEM }],
      subscription: { cycle: "MONTHLY", nextDueDate: hojeISO(agora) },
    };
  }
  return {
    ...base,
    billingTypes: ["PIX", "CREDIT_CARD"],
    chargeTypes: ["DETACHED", "INSTALLMENT"],
    installment: { maxInstallmentCount: 12 },
    items: [{ name: "EduGera Pro anual", description: "EduGera Pro por 12 meses. Não renova sozinho.", quantity: 1, value: precoDe("pro_anual"), imageBase64: IMAGEM_ITEM }],
  };
}

const somarDias = (iso, dias) => new Date(new Date(iso).getTime() + dias * 86400000).toISOString();
const somarMeses = (iso, meses) => {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + meses);
  return d.toISOString();
};
// "2026-11-10" (data do Asaas, horário de Brasília) → fim desse dia em UTC
const fimDoDia = (data) => (/^\d{4}-\d{2}-\d{2}$/.test(String(data || "")) ? new Date(`${data}T23:59:59-03:00`).toISOString() : null);
const inicioDoDia = (data) => (/^\d{4}-\d{2}-\d{2}$/.test(String(data || "")) ? new Date(`${data}T12:00:00-03:00`).toISOString() : null);

const PAGO = ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"];
const DESFEITO = ["REFUNDED", "REFUND_REQUESTED", "REFUND_IN_PROGRESS", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "AWAITING_CHARGEBACK_REVERSAL"];
export const pagamentoPago = (p) => PAGO.includes(String(p?.status || ""));

// Assinatura mensal: estado a partir da assinatura E do pagamento que gerou o aviso (ambos relidos na API).
// validoAte: até quando o plano vale. null = não mexe no que já está gravado.
export function estadoDaAssinatura(sub, pagamento, agora = new Date()) {
  const valor = Number(sub?.value);
  if (sub?.deleted || ["INACTIVE", "EXPIRED"].includes(String(sub?.status))) {
    // cancelada/encerrada: vale até o fim do mês já pago (não estende; não corta)
    return { status: "CANCELLED", valor, validoAte: null };
  }
  if (pagamento && DESFEITO.includes(String(pagamento.status))) return { status: String(pagamento.status), valor, validoAte: agora.toISOString() };
  if (String(sub?.status) === "ACTIVE" && pagamentoPago(pagamento)) {
    const prox = fimDoDia(sub?.nextDueDate) || somarMeses(agora.toISOString(), 1);
    // nextDueDate pode ainda ser o vencimento do mês recém-pago: no mínimo 1 mês a partir do pagamento
    const pagoEm = inicioDoDia(pagamento?.paymentDate || pagamento?.clientPaymentDate) || agora.toISOString();
    const minimo = somarMeses(pagoEm, 1);
    const ate = Date.parse(prox) > Date.parse(minimo) ? prox : minimo;
    return { status: "ACTIVE", valor, validoAte: somarDias(ate, TOLERANCIA_DIAS) };
  }
  return { status: String(sub?.status || "PENDING"), valor, validoAte: null }; // aguardando o 1º pagamento
}

// Plano anual (pagamento único ou parcelado): estado a partir do pagamento relido na API
export function estadoDoPagamento(p, agora = new Date()) {
  const status = String(p?.status || "");
  const valor = Number(p?.value);
  if (PAGO.includes(status)) {
    const pagoEm = inicioDoDia(p?.paymentDate || p?.clientPaymentDate || p?.confirmedDate) || agora.toISOString();
    return { status, valor, validoAte: somarMeses(pagoEm, 12) };
  }
  // devolvido ou contestado: o plano cai na hora
  if (DESFEITO.includes(status) || p?.deleted) return { status: status || "DELETED", valor, validoAte: agora.toISOString() };
  return { status: status || "PENDING", valor, validoAte: null }; // pendente / vencido / em análise
}

// O valor bate com o preço do plano? Parcelado: soma das parcelas (parcela × quantidade, com folga de centavos).
export function valorConfere(plano, valor, parcelas = 1) {
  if (!Number.isFinite(valor)) return false;
  const n = Number.isInteger(parcelas) && parcelas > 0 ? parcelas : 1;
  return Math.abs(valor * n - precoDe(plano)) <= 0.01 * n + 0.001;
}

// Token do aviso: o Asaas manda no header "asaas-access-token" o mesmo texto cadastrado no webhook.
export function tokenAvisoConfere(recebido, esperado) {
  if (!esperado) return true; // sem token configurado (só no teste): segue — a API é relida de qualquer jeito
  const a = Buffer.from(String(esperado));
  const b = Buffer.from(String(recebido || ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

// Tipo do aviso → o que reler na API. Só confiamos no tipo e no id; o resto vem da API.
export function lerAviso(corpo = {}) {
  const evento = String(corpo?.event || "");
  if (evento.startsWith("PAYMENT_") && corpo?.payment?.id) return { recurso: "pagamento", id: String(corpo.payment.id), evento };
  if (evento.startsWith("SUBSCRIPTION_") && corpo?.subscription?.id) return { recurso: "assinatura", id: String(corpo.subscription.id), evento };
  return null; // CHECKOUT_* e outros: os pagamentos chegam em avisos próprios
}

// Cliente mínimo da API do Asaas (fetch injetável nos testes)
export function clienteAsaas({ chave, api }, fetchImpl = fetch) {
  const pedir = async (metodo, caminho, corpo) => {
    const r = await fetchImpl(`${api}${caminho}`, {
      method: metodo,
      headers: { access_token: chave, "Content-Type": "application/json", "User-Agent": "EduGera/1.0" },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const texto = await r.text();
    let json = null;
    try {
      json = texto ? JSON.parse(texto) : null;
    } catch {
      /* resposta sem JSON */
    }
    if (!r.ok) {
      const e = new Error(`Asaas ${r.status}: ${json?.errors?.[0]?.description || texto.slice(0, 200)}`);
      e.status = r.status;
      throw e;
    }
    return json;
  };
  const id = (x) => encodeURIComponent(String(x));
  return {
    criarCheckout: (corpo) => pedir("POST", "/checkouts", corpo),
    lerPagamento: (x) => pedir("GET", `/payments/${id(x)}`),
    lerAssinatura: (x) => pedir("GET", `/subscriptions/${id(x)}`),
    lerParcelamento: (x) => pedir("GET", `/installments/${id(x)}`),
    cancelarAssinatura: (x) => pedir("DELETE", `/subscriptions/${id(x)}`),
  };
}

// Link da página de pagamento (a API devolve "link"; se não vier, monta pelo id)
export const linkDoCheckout = (c, api = API_SANDBOX) =>
  c?.link || (c?.id ? `${api === API_PRODUCAO ? "https://www.asaas.com" : "https://sandbox.asaas.com"}/checkoutSession/show?id=${encodeURIComponent(c.id)}` : null);
