// Qual provedor cobra neste ambiente: Asaas (escolhido pelo Paulo) e, como reserva, Mercado Pago.
import { configAsaas } from "./asaas.js";
import { configPagamentos } from "./pagamentos.js";
import { ehProducao } from "./ambiente.js";

// Venda do Pro em edugera.app: fica FECHADA ("Em breve") até o Paulo dar o OK do lançamento,
// mesmo com a chave do Asaas e PAGAMENTOS_PRODUCAO=1 na Vercel. Só muda com o OK dele.
// Fechada, nada muda para quem já pagou: aviso do pagamento, Minha assinatura e cancelar continuam.
export const VENDA_PRODUCAO_LIBERADA = true; // aberta em 17/10/2026 com o OK do Paulo

export function provedorAtivo(env = process.env) {
  const asaas = configAsaas(env);
  if (asaas.ok) return asaas;
  const mp = configPagamentos(env);
  if (mp.ok) return { ...mp, provedor: "mercadopago" };
  return { ok: false, motivo: env.ASAAS_API_KEY ? asaas.motivo : mp.motivo };
}

// Novas vendas (página de planos e checkout): além do provedor, a venda tem de estar liberada
export function vendaAberta(env = process.env, liberada = VENDA_PRODUCAO_LIBERADA) {
  const p = provedorAtivo(env);
  if (!p.ok) return p;
  if (ehProducao(env) && !liberada) return { ok: false, motivo: "A venda do Pro ainda não foi aberta (lançamento)." };
  return p;
}
