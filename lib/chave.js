import { createHash, timingSafeEqual } from "crypto";

export const hashChave = (chave) => createHash("sha256").update(String(chave)).digest("hex");

export function chaveConfere(chave, hash) {
  if (typeof chave !== "string" || typeof hash !== "string" || !chave) return false;
  const a = Buffer.from(hashChave(chave), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// Exclusão de conta: o arquivo do Blob é desta conta se a chave confere (material ativo)
// ou se o banco guarda a mesma prova de dono (material revogado: a chave já foi apagada,
// mas o hash da chave continua no banco e no arquivo).
export function arquivoEhDaConta(registro, { chave, chaveHash } = {}) {
  const doArquivo = registro?.chaveHash;
  if (typeof doArquivo !== "string" || !doArquivo) return false;
  if (chave && chaveConfere(chave, doArquivo)) return true;
  if (typeof chaveHash !== "string" || chaveHash.length !== doArquivo.length) return false;
  return timingSafeEqual(Buffer.from(chaveHash), Buffer.from(doArquivo));
}
