import { createHash, timingSafeEqual } from "crypto";

export const hashChave = (chave) => createHash("sha256").update(String(chave)).digest("hex");

export function chaveConfere(chave, hash) {
  if (typeof chave !== "string" || typeof hash !== "string" || !chave) return false;
  const a = Buffer.from(hashChave(chave), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
