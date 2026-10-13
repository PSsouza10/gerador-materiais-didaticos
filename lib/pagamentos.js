// Pagamentos do EduGera pelo Mercado Pago (conta de pessoa física do Paulo).
//   Pro mensal → ASSINATURA (preapproval): cartão de crédito, renova todo mês.
//   Pro anual  → PAGAMENTO ÚNICO (Checkout Pro): Pix ou cartão (até 12x), vale 12 meses.
//
// Regras de segurança:
//   - Site de teste: só aceita token de TESTE ("TEST-..."). Nunca cobra dinheiro real.
//   - Produção: só cobra com PAGAMENTOS_PRODUCAO=1 (interruptor que só o Paulo liga).
//   - O webhook NUNCA confia no corpo recebido: relê a assinatura/pagamento na API do
//     Mercado Pago com o nosso token. Um aviso falso não ativa plano nenhum.
//   - O e-mail do professor não vai para o banco: o pagamento é ligado à conta por uma
//     referência aleatória (external_reference) guardada em "checkouts".
// Funções puras aqui; banco em lib/contas.js; rotas em app/api/pagamentos/.
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { ehProducao } from "./ambiente.js";
import { PLANOS } from "./planos.js";

const API = "https://api.mercadopago.com";
export const PLANOS_PAGOS = ["pro_mensal", "pro_anual"];
const TOLERANCIA_DIAS = 3; // cartão recusado num dia: o plano não cai na hora

// Pode cobrar neste ambiente? { ok, motivo, token, segredo }
export function configPagamentos(env = process.env) {
  const token = String(env.MP_ACCESS_TOKEN || "").trim();
  const segredo = String(env.MP_WEBHOOK_SECRET || "").trim() || null;
  if (!token) return { ok: false, motivo: "Pagamento ainda não configurado." };
  const teste = token.startsWith("TEST-");
  if (ehProducao(env)) {
    if (env.PAGAMENTOS_PRODUCAO !== "1") return { ok: false, motivo: "A assinatura ainda não está aberta." };
    if (teste) return { ok: false, motivo: "Token de teste na produção: pagamento desligado." };
  } else if (!teste) {
    // site de teste com token de verdade: recusa (evita cobrança real por engano)
    return { ok: false, motivo: "No site de teste só vale token de TESTE do Mercado Pago." };
  }
  return { ok: true, token, segredo, teste };
}

export const novaReferencia = () => randomBytes(16).toString("hex");

const precoDe = (plano) => Number(PLANOS[plano]?.preco);

// Assinatura mensal (cartão). payer_email = e-mail da conta do Mercado Pago de quem paga.
export function corpoAssinaturaMensal({ referencia, emailPagador, voltarPara }) {
  return {
    reason: "EduGera Pro mensal",
    external_reference: referencia,
    payer_email: emailPagador,
    back_url: voltarPara,
    status: "pending",
    auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: precoDe("pro_mensal"), currency_id: "BRL" },
  };
}

// Pagamento único do plano anual (Pix ou cartão parcelado)
export function corpoPreferenciaAnual({ referencia, voltarPara, notificacao }) {
  return {
    items: [{ id: "pro_anual", title: "EduGera Pro anual (12 meses)", quantity: 1, unit_price: precoDe("pro_anual"), currency_id: "BRL" }],
    external_reference: referencia,
    back_urls: { success: voltarPara, failure: voltarPara, pending: voltarPara },
    auto_return: "approved",
    notification_url: notificacao,
    statement_descriptor: "EDUGERA",
    payment_methods: { installments: 12, excluded_payment_types: [{ id: "ticket" }] }, // sem boleto: demora a compensar
  };
}

const somarDias = (iso, dias) => new Date(new Date(iso).getTime() + dias * 86400000).toISOString();
const somarMeses = (iso, meses) => {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + meses);
  return d.toISOString();
};
const valido = (iso) => typeof iso === "string" && Number.isFinite(Date.parse(iso));

// Estado de uma assinatura (preapproval) lida na API.
// validoAte: até quando o plano vale. null = não mexe no que já está gravado.
export function estadoDaAssinatura(a, agora = new Date()) {
  const status = String(a?.status || "");
  const valor = Number(a?.auto_recurring?.transaction_amount);
  if (status === "authorized") {
    const prox = valido(a?.next_payment_date) ? a.next_payment_date : somarMeses(agora.toISOString(), 1);
    return { status, valor, validoAte: somarDias(prox, TOLERANCIA_DIAS) };
  }
  // cancelada ou pausada: vale até o fim do mês já pago (não estende; não corta)
  return { status: status || "desconhecido", valor, validoAte: null };
}

// Estado de um pagamento único lido na API
export function estadoDoPagamento(p, agora = new Date()) {
  const status = String(p?.status || "");
  const valor = Number(p?.transaction_amount);
  if (status === "approved") return { status, valor, validoAte: somarMeses(valido(p?.date_approved) ? p.date_approved : agora.toISOString(), 12) };
  // devolvido ou contestado: o plano cai na hora
  if (["refunded", "charged_back", "cancelled"].includes(status)) return { status, valor, validoAte: agora.toISOString() };
  return { status: status || "desconhecido", valor, validoAte: null }; // pendente / em análise
}

// O valor pago bate com o preço do plano? (o checkout é criado no servidor, mas confere)
export const valorConfere = (plano, valor) => Number.isFinite(valor) && Math.abs(valor - precoDe(plano)) < 0.01;

// Assinatura do aviso (header x-signature: "ts=...,v1=..."), conforme o Mercado Pago:
// HMAC-SHA256 do texto "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" com a chave secreta.
export function assinaturaWebhookConfere({ xSignature, xRequestId, dataId, segredo }) {
  if (!segredo) return true; // sem chave configurada: segue (a API é relida de qualquer jeito)
  const partes = Object.fromEntries(
    String(xSignature || "")
      .split(",")
      .map((p) => p.split("=").map((s) => s.trim()))
      .filter((p) => p.length === 2)
  );
  if (!partes.ts || !partes.v1) return false;
  const id = /^[a-z0-9]+$/i.test(String(dataId || "")) ? String(dataId).toLowerCase() : String(dataId || "");
  let manifesto = "";
  if (id) manifesto += `id:${id};`;
  if (xRequestId) manifesto += `request-id:${xRequestId};`;
  manifesto += `ts:${partes.ts};`;
  const esperado = createHmac("sha256", segredo).update(manifesto).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(String(partes.v1));
  return a.length === b.length && timingSafeEqual(a, b);
}

// Tipo do aviso → o que reler na API
export function lerAviso(url, corpo = {}) {
  const q = new URL(url).searchParams;
  const tipo = String(corpo.type || corpo.topic || q.get("type") || q.get("topic") || "");
  const id = String(corpo?.data?.id || q.get("data.id") || q.get("id") || "");
  if (!id) return null;
  if (/preapproval/.test(tipo)) return { recurso: "assinatura", id };
  if (tipo === "payment") return { recurso: "pagamento", id };
  return null; // outros avisos (ex.: cobrança de cada mês da assinatura) não mudam o plano
}

// Cliente mínimo da API (fetch injetável nos testes)
export function clienteMercadoPago(token, fetchImpl = fetch) {
  const pedir = async (metodo, caminho, corpo, idempotencia) => {
    const r = await fetchImpl(`${API}${caminho}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(idempotencia ? { "X-Idempotency-Key": idempotencia } : {}),
      },
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
      const e = new Error(`Mercado Pago ${r.status}: ${json?.message || texto.slice(0, 200)}`);
      e.status = r.status;
      throw e;
    }
    return json;
  };
  return {
    criarAssinatura: (corpo) => pedir("POST", "/preapproval", corpo, corpo.external_reference),
    criarPreferencia: (corpo) => pedir("POST", "/checkout/preferences", corpo, corpo.external_reference),
    lerAssinatura: (id) => pedir("GET", `/preapproval/${encodeURIComponent(id)}`),
    lerPagamento: (id) => pedir("GET", `/v1/payments/${encodeURIComponent(id)}`),
    cancelarAssinatura: (id) => pedir("PUT", `/preapproval/${encodeURIComponent(id)}`, { status: "cancelled" }),
  };
}

export const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim()) && String(e).length <= 200;
