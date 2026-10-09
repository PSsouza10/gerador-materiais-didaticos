// Leitura do Blob para a importação ao banco (Parte B).
// Regra: arquivo que NÃO existe = vazio (conta nova). Arquivo que existe mas não pôde
// ser lido (rede, CDN atrasada, erro do Blob, JSON quebrado) = ERRO: a importação para,
// fica "falhou" e repete no próximo acesso — nunca marca "concluída" com a lista vazia.
import { head as headBlob } from "@vercel/blob";
import { comTentativas } from "./tentativas.js";

export const naoExiste = (e) => e?.name === "BlobNotFoundError" || /not\s*found|não encontrado/i.test(String(e?.message || ""));

export async function lerJsonEstrito(caminho, { head = headBlob, buscar = fetch, tentativas = 4, espera = 300 } = {}) {
  let meta;
  try {
    meta = await head(caminho);
  } catch (e) {
    if (naoExiste(e)) return null;
    throw new Error(`Blob indisponível ao consultar ${caminho.split("/")[0]}/…: ${e?.message || e}`);
  }
  return comTentativas(
    async () => {
      // ?v= evita a cópia de até 60 s guardada na CDN do Blob
      const res = await buscar(`${meta.url}?v=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`leitura do Blob falhou (${res.status})`);
      return res.json();
    },
    { tentativas, espera }
  );
}
