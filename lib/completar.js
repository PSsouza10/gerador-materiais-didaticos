// "Completar a avaliação": quando a geração termina com menos questões do que o pedido (tempo
// esgotado nas correções), a tela pede as que faltam, uma por vez, sem gastar outra geração.
// A permissão é um token assinado ligado à conta e à geração (vale 30 minutos).
import { createHmac, timingSafeEqual } from "crypto";
import { SEGREDO } from "./segredo.js";

export const VALIDADE_COMPLETAR_MS = 30 * 60 * 1000;

export const tokenCompletar = (email, geradaEm) =>
  createHmac("sha256", SEGREDO || "sem-segredo").update(`completar:${String(email).trim().toLowerCase()}:${geradaEm}`).digest("base64url");

export function tokenConfere(token, email, geradaEm, agora = Date.now()) {
  if (typeof token !== "string" || !geradaEm) return false;
  const t = Date.parse(geradaEm);
  if (!Number.isFinite(t) || agora - t > VALIDADE_COMPLETAR_MS || t - agora > 60_000) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(tokenCompletar(email, geradaEm));
  return a.length === b.length && timingSafeEqual(a, b);
}
