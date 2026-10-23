import { createHmac } from "crypto";
import { SEGREDO } from "./segredo.js";

// Marca embaralhada do aparelho (cookie eg_d, posto pelo middleware) e da rede (IP) do pedido atual.
// Só o HMAC é guardado: não dá para saber o aparelho nem o IP a partir dele.
// Fora de um pedido (testes, scripts) devolve nulos e nada é limitado.
export const LIMITE_CONTAS_APARELHO = 2; // contas Grátis diferentes por aparelho, por mês
export const LIMITE_CONTAS_REDE = 10; // contas Grátis diferentes na mesma internet, por mês (escolas dividem IP)
export const MENSAGEM_APARELHO =
  "Este aparelho já foi usado por outras contas do plano Grátis este mês. Para continuar, assine o Pro em /planos.";

const embaralhar = (tipo, v) => (v ? createHmac("sha256", SEGREDO || "sem-segredo").update(`${tipo}:${v}`).digest("hex").slice(0, 32) : null);

export function ipDoPedido(h) {
  const xff = h?.get?.("x-forwarded-for") || "";
  return xff.split(",")[0].trim() || h?.get?.("x-real-ip") || "";
}

export async function marcaDoPedido() {
  try {
    const { cookies, headers } = await import("next/headers");
    const aparelho = cookies().get("eg_d")?.value || "";
    return { dispositivo: /^[a-f0-9]{16,64}$/.test(aparelho) ? embaralhar("d", aparelho) : null, rede: embaralhar("r", ipDoPedido(headers())) };
  } catch {
    return { dispositivo: null, rede: null };
  }
}
