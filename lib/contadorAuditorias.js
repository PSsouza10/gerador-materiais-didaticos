import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import { caminhoBlob } from "./ambiente.js";

const CAMINHO = "estatisticas/auditorias.json";
const MAX_TENTATIVAS = 40;
const timeoutBlob = () =>
  typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(5000)
    : undefined;

const conflito = (erro) =>
  erro instanceof BlobPreconditionFailedError ||
  erro?.name === "BlobPreconditionFailedError" ||
  [409, 412].includes(Number(erro?.status || erro?.statusCode)) ||
  /already exists|precondition|conflict|overwrite/i.test(String(erro?.message || ""));

const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function credenciaisBlob({
  storeId = process.env.AUDITORIAS_STORE_ID,
  oidcToken = process.env.VERCEL_OIDC_TOKEN,
  token = process.env.AUDITORIAS_READ_WRITE_TOKEN,
} = {}) {
  if (typeof storeId !== "string" || !storeId.trim()) {
    throw new Error("O store privado de auditorias não está configurado: falta AUDITORIAS_STORE_ID.");
  }

  // Preferir OIDC no Vercel; fora dele, aceitar somente o token escopado deste store.
  // Nunca usar BLOB_READ_WRITE_TOKEN, que pertence ao Blob público já existente.
  if (oidcToken) return { storeId, oidcToken };
  if (token) return { storeId, token };
  throw new Error("O acesso ao Blob de auditorias requer OIDC ou AUDITORIAS_READ_WRITE_TOKEN.");
}

async function lerSnapshot({ getBlob, pathname, credenciais }) {
  const arquivo = await getBlob(pathname, {
    ...credenciais,
    access: "private",
    useCache: false,
    abortSignal: timeoutBlob(),
  });
  if (!arquivo) return { total: 0, etag: null };

  const dados = await new Response(arquivo.stream).json();
  if (!Number.isSafeInteger(dados?.total) || dados.total < 0) throw new Error("O contador de auditorias tem formato inválido.");
  const etag = arquivo.blob?.etag;
  if (!etag) throw new Error("O contador de auditorias não retornou uma versão para atualização segura.");
  return { total: dados.total, etag };
}

export async function lerContagemAuditorias({
  getBlob = get,
  pathname = caminhoBlob(CAMINHO),
  storeId = process.env.AUDITORIAS_STORE_ID,
  oidcToken = process.env.VERCEL_OIDC_TOKEN,
  token = process.env.AUDITORIAS_READ_WRITE_TOKEN,
} = {}) {
  const credenciais = credenciaisBlob({ storeId, oidcToken, token });
  return (await lerSnapshot({ getBlob, pathname, credenciais })).total;
}

// Um evento corresponde a um material concluído cujo auditarMaterial já foi executado.
// O Blob é privado e contém somente o total; ETag evita perder incrementos concorrentes.
export async function incrementarContagemAuditorias({
  getBlob = get,
  putBlob = put,
  pathname = caminhoBlob(CAMINHO),
  storeId = process.env.AUDITORIAS_STORE_ID,
  oidcToken = process.env.VERCEL_OIDC_TOKEN,
  token = process.env.AUDITORIAS_READ_WRITE_TOKEN,
  maxTentativas = MAX_TENTATIVAS,
} = {}) {
  const credenciais = credenciaisBlob({ storeId, oidcToken, token });

  for (let tentativa = 0; tentativa < maxTentativas; tentativa++) {
    const atual = await lerSnapshot({ getBlob, pathname, credenciais });
    const proximo = atual.total + 1;
    const opcoes = {
      ...credenciais,
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: !!atual.etag,
      cacheControlMaxAge: 60,
      abortSignal: timeoutBlob(),
      ...(atual.etag ? { ifMatch: atual.etag } : {}),
    };

    try {
      await putBlob(pathname, JSON.stringify({ total: proximo }), opcoes);
      return proximo;
    } catch (erro) {
      if (!conflito(erro) || tentativa === maxTentativas - 1) throw erro;
      await pausa(Math.min(80, 5 * 2 ** Math.min(tentativa, 4)));
    }
  }
  throw new Error("Não foi possível atualizar o contador de auditorias.");
}
