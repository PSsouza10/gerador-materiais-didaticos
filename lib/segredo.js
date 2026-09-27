import { createHash } from "crypto";

// Segredo que assina a sessão e protege o registro de uso.
// Usa NEXTAUTH_SECRET se existir; senão deriva um valor estável do token do
// Vercel Blob (que já é secreto e fica só no servidor), para ninguém precisar
// inventar e colar mais uma chave. Se o token do Blob for trocado, as sessões
// expiram e o contador do mês recomeça — nada além disso.
export const SEGREDO =
  process.env.NEXTAUTH_SECRET ||
  (process.env.BLOB_READ_WRITE_TOKEN
    ? createHash("sha256").update("edugera-sessao:" + process.env.BLOB_READ_WRITE_TOKEN).digest("base64url")
    : "");
