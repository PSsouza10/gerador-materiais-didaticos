// Qual provedor cobra neste ambiente: Asaas (escolhido pelo Paulo) e, como reserva, Mercado Pago.
import { configAsaas } from "./asaas.js";
import { configPagamentos } from "./pagamentos.js";

export function provedorAtivo(env = process.env) {
  const asaas = configAsaas(env);
  if (asaas.ok) return asaas;
  const mp = configPagamentos(env);
  if (mp.ok) return { ...mp, provedor: "mercadopago" };
  return { ok: false, motivo: env.ASAAS_API_KEY ? asaas.motivo : mp.motivo };
}
