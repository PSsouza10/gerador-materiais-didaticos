// Foto da redação: a leitura (transcrição) já gasta o uso do mês; a correção do texto
// confirmado não gasta de novo. A permissão é um token assinado (conta + hora), 30 minutos.
import { createHmac, timingSafeEqual } from "crypto";
import { SEGREDO } from "./segredo.js";

export const VALIDADE_FOTO_MS = 30 * 60 * 1000;
export const tokenFoto = (email, lidaEm) =>
  createHmac("sha256", SEGREDO || "sem-segredo").update(`redacao-foto:${String(email).trim().toLowerCase()}:${lidaEm}`).digest("base64url");

export function tokenFotoConfere(token, email, lidaEm, agora = Date.now()) {
  if (typeof token !== "string" || !lidaEm) return false;
  const t = Date.parse(lidaEm);
  if (!Number.isFinite(t) || agora - t > VALIDADE_FOTO_MS || t - agora > 60_000) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(tokenFoto(email, lidaEm));
  return a.length === b.length && timingSafeEqual(a, b);
}
