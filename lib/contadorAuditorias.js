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

async function lerSnapshot({ getBlob, pathname }) {
  const arquivo = await getBlob(pathname, { access: "private", useCache: false, abortSignal: timeoutBlob() });
  if (!arquivo) return { total: 0, etag: null };

  const dados = await new Response(arquivo.stream).json();
  if (!Number.isSafeInteger(dados?.total) || dados.total < 0) throw new Error("O contador de auditorias tem formato inválido.");
  const etag = arquivo.blob?.etag;
  if (!etag) throw new Error("O contador de auditorias não retornou uma versão para atualização segura.");
  return { total: dados.total, etag };
}

export async function lerContagemAuditorias({ getBlob = get, pathname = caminhoBlob(CAMINHO) } = {}) {
  return (await lerSnapshot({ getBlob, pathname })).total;
}

// Um evento corresponde a um material concluído cujo auditarMaterial já foi executado.
// O Blob é privado e contém somente o total; ETag evita perder incrementos concorrentes.
export async function incrementarContagemAuditorias({
  getBlob = get,
  putBlob = put,
  pathname = caminhoBlob(CAMINHO),
  maxTentativas = MAX_TENTATIVAS,
} = {}) {
  for (let tentativa = 0; tentativa < maxTentativas; tentativa++) {
    const atual = await lerSnapshot({ getBlob, pathname });
    const proximo = atual.total + 1;
    const opcoes = {
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
