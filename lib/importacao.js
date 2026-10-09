// Leva os dados antigos da conta (Vercel Blob) para o banco, uma vez só.
// Roda sozinho no login e no primeiro acesso à lista/uso. Não apaga nada do Blob:
// os arquivos antigos ficam lá como cópia de segurança.
import { bancoLigado } from "./banco.js";
import { importarDoBlob } from "./contas.js";
import { lerHistoricoBlob } from "./historico.js";
import { lerUsoBlob } from "./uso.js";
import { caminhoBlob } from "./ambiente.js";
import { lerJsonEstrito } from "./leituraBlob.js";

const jaFeito = new Set(); // por instância do servidor: evita consultar o banco a cada pedido

// material que não existe = null; que existe e falhou na leitura = erro (importação repete depois)
async function materialDoBlob(id) {
  return lerJsonEstrito(caminhoBlob(`materiais/${id}.json`));
}

export async function garantirImportacao(bruto) {
  const email = String(bruto || "").trim().toLowerCase();
  if (!bancoLigado() || !email || jaFeito.has(email)) return null;
  try {
    const r = await importarDoBlob(email, { historico: lerHistoricoBlob, uso: lerUsoBlob, material: materialDoBlob });
    if (r.importado || r.status === "concluida") jaFeito.add(email);
    if (r.importado) console.log(JSON.stringify({ app: "edugera", evento: "importacao", ...r })); // só números, sem dados pessoais
    return r;
  } catch (e) {
    console.error("Importação do Blob falhou (tenta de novo no próximo acesso):", e?.message || e);
    return null;
  }
}

// Ensaio: esquece que esta conta já foi importada nesta instância do servidor
export const esquecerImportacao = (email) => jaFeito.delete(String(email || "").trim().toLowerCase());
