// Pagamentos pelo Asaas (Checkout hospedado: o professor preenche os dados na página do Asaas).
//   Pro mensal → checkout RECURRENT no cartão (assinatura mensal).
//   Pro anual  → checkout à vista (Pix ou cartão) ou parcelado no cartão (até 12x); vale 12 meses.
//
// Travas:
//   - Site de teste: SÓ a API de sandbox (chave de produção não funciona lá).
//   - Produção: só com PAGAMENTOS_PRODUCAO=1 e chave de produção ($aact_prod_...).
//   - Aviso (webhook): exige o token do header "asaas-access-token" (ASAAS_WEBHOOK_TOKEN)
//     e RELÊ a cobrança na API com a nossa chave antes de ativar qualquer plano.
import { timingSafeEqual } from "crypto";
import { ehProducao } from "./ambiente.js";
import { PLANOS } from "./planos.js";

const API_SANDBOX = "https://api-sandbox.asaas.com/v3";
const API_PRODUCAO = "https://api.asaas.com/v3";
const TOLERANCIA_DIAS = 3;

export function configAsaas(env = process.env) {
  const chave = String(env.ASAAS_API_KEY || "").trim();
  const tokenWebhook = String(env.ASAAS_WEBHOOK_TOKEN || "").trim() || null;
  if (!chave) return { ok: false, motivo: "Pagamento ainda não configurado." };
  // O AMBIENTE decide a API: site de teste fala SÓ com o sandbox (uma chave de produção é
  // recusada lá, então nunca há cobrança real); produção fala SÓ com a API de produção.
  // Chaves novas trazem _hmlg_ (sandbox) ou _prod_ (produção): se contradisserem o ambiente, desliga.
  const producao = ehProducao(env);
  if (producao) {
    if (env.PAGAMENTOS_PRODUCAO !== "1") return { ok: false, motivo: "A assinatura ainda não está aberta." };
    if (chave.includes("_hmlg_")) return { ok: false, motivo: "Chave de sandbox na produção: pagamento desligado." };
  } else if (chave.includes("_prod_")) {
    return { ok: false, motivo: "No site de teste só vale a chave de SANDBOX do Asaas." };
  }
  const sandbox = !producao;
  return { ok: true, provedor: "asaas", chave, tokenWebhook, sandbox, api: sandbox ? API_SANDBOX : API_PRODUCAO };
}

// Link do checkout para o pagador (a API devolve "link"; sem ele, monta pelo id)
export const linkDoCheckout = (resp, sandbox) =>
  resp?.link || (resp?.id ? `https://${sandbox ? "sandbox" : "www"}.asaas.com/checkoutSession/show?id=${encodeURIComponent(resp.id)}` : null);

const preco = (plano) => Number(PLANOS[plano]?.preco);
const dataAsaas = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
};

// Corpo do checkout. voltarPara = página "Minha assinatura".
export function corpoCheckoutAsaas({ plano, referencia, voltarPara, agora = new Date() }) {
  const callback = { successUrl: `${voltarPara}?retorno=1`, cancelUrl: voltarPara.replace(/\/assinatura$/, "/planos"), expiredUrl: voltarPara.replace(/\/assinatura$/, "/planos") };
  const base = { externalReference: referencia, minutesToExpire: 60, callback };
  if (plano === "pro_mensal")
    return {
      ...base,
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["RECURRENT"],
      items: [{ name: "EduGera Pro mensal", description: "Plano Pro do EduGera, renovação mensal", quantity: 1, value: preco("pro_mensal") }],
      subscription: { cycle: "MONTHLY", nextDueDate: dataAsaas(agora) },
    };
  return {
    ...base,
    billingTypes: ["PIX", "CREDIT_CARD"],
    chargeTypes: ["DETACHED", "INSTALLMENT"],
    items: [{ name: "EduGera Pro anual", description: "Plano Pro do EduGera por 12 meses", quantity: 1, value: preco("pro_anual") }],
    installment: { maxInstallmentCount: 12 },
  };
}

// Token do aviso: comparação em tempo constante. Sem token configurado, recusa.
export function tokenWebhookConfere(recebido, esperado) {
  if (!esperado) return false;
  const a = Buffer.from(String(recebido || ""));
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Aviso → o que reler na API
export function lerAvisoAsaas(corpo = {}) {
  const evento = String(corpo?.event || "");
  if (/^PAYMENT_/.test(evento) && corpo?.payment?.id) return { evento, recurso: "cobranca", id: String(corpo.payment.id) };
  if (/^SUBSCRIPTION_(DELETED|INACTIVATED)$/.test(evento) && corpo?.subscription?.id) return { evento, recurso: "assinatura", id: String(corpo.subscription.id) };
  if (/^CHECKOUT_/.test(evento)) return { evento, recurso: "checkout", id: String(corpo?.checkout?.id || ""), externalReference: corpo?.checkout?.externalReference || null };
  return null;
}

const somarMeses = (iso, meses) => {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + meses);
  return d.toISOString();
};
const somarDias = (iso, dias) => new Date(new Date(iso).getTime() + dias * 86400000).toISOString();
const dataValida = (v) => typeof v === "string" && Number.isFinite(Date.parse(v));

// Cobrança (payment) relida na API → validade do plano.
// Pago (CONFIRMED/RECEIVED): mensal = vencimento + 1 mês (+3 dias); anual = pagamento + 12 meses.
// Estornado/contestado: corta na hora. Outros (pendente, vencido): não mexe.
export function estadoDaCobrancaAsaas(pg, plano, agora = new Date()) {
  const status = String(pg?.status || "");
  const valor = Number(pg?.value);
  if (["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(status)) {
    if (plano === "pro_mensal") {
      const venc = dataValida(pg?.dueDate) ? `${pg.dueDate.slice(0, 10)}T12:00:00.000Z` : agora.toISOString();
      return { status, valor, validoAte: somarDias(somarMeses(venc, 1), TOLERANCIA_DIAS) };
    }
    const pago = dataValida(pg?.confirmedDate) ? `${pg.confirmedDate.slice(0, 10)}T12:00:00.000Z` : dataValida(pg?.paymentDate) ? `${pg.paymentDate.slice(0, 10)}T12:00:00.000Z` : agora.toISOString();
    return { status, valor, validoAte: somarMeses(pago, 12) };
  }
  if (["REFUNDED", "REFUND_REQUESTED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "AWAITING_CHARGEBACK_REVERSAL"].includes(status))
    return { status, valor, validoAte: agora.toISOString() };
  return { status: status || "desconhecido", valor, validoAte: null };
}

// Valor confere? No anual parcelado, cada parcela é uma fração: aceita o total OU a parcela coerente.
export function valorConfereAsaas(plano, pg) {
  const v = Number(pg?.value);
  if (!Number.isFinite(v)) return false;
  const total = preco(plano);
  if (Math.abs(v - total) < 0.01) return true;
  const n = Number(pg?.installmentCount || 0);
  return plano === "pro_anual" && n >= 2 && n <= 12 && Math.abs(v * n - total) < 0.05 * n;
}

export function clienteAsaas(cfg, fetchImpl = fetch) {
  const pedir = async (metodo, caminho, corpo) => {
    const r = await fetchImpl(`${cfg.api}${caminho}`, {
      method: metodo,
      headers: { access_token: cfg.chave, "Content-Type": "application/json", "User-Agent": "EduGera" },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const texto = await r.text();
    let json = null;
    try {
      json = texto ? JSON.parse(texto) : null;
    } catch {
      /* sem JSON */
    }
    if (!r.ok) {
      const desc = json?.errors?.map((e) => e.description).join("; ") || texto.slice(0, 200);
      const e = new Error(`Asaas ${r.status}: ${desc}`);
      e.status = r.status;
      throw e;
    }
    return json;
  };
  return {
    criarCheckout: (corpo) => pedir("POST", "/checkouts", corpo),
    lerCobranca: (id) => pedir("GET", `/payments/${encodeURIComponent(id)}`),
    lerAssinatura: (id) => pedir("GET", `/subscriptions/${encodeURIComponent(id)}`),
    cancelarAssinatura: (id) => pedir("DELETE", `/subscriptions/${encodeURIComponent(id)}`),
  };
}
