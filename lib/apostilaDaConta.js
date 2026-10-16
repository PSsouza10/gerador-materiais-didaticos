// Apostila do próprio professor (só da conta logada; nunca de outra conta).
// Usada pelo Plano de Aula e pela Avaliação para partir de um material já gerado.
import { head } from "@vercel/blob";
import { bancoLigado } from "./banco.js";
import { materiaisDaConta } from "./contas.js";
import { lerHistorico } from "./historico.js";
import { caminhoBlob } from "./ambiente.js";

export async function apostilaDaConta(email, id) {
  if (!/^[\w-]{6,40}$/.test(id || "")) return null;
  if (bancoLigado()) {
    const l = (await materiaisDaConta(email)).find((x) => x.id === id && !x.removido);
    if (l?.conteudo) return l.conteudo;
  }
  const lista = await lerHistorico(email).catch(() => []);
  if (!lista.some((m) => m.id === id)) return null;
  try {
    const meta = await head(caminhoBlob(`materiais/${id}.json`));
    const r = await fetch(meta.url, { cache: "no-store" });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
