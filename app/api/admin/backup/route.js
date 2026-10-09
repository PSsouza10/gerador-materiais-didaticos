import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { exigirAdmin, listarArquivos, baixar, semCache } from "@/lib/admin";
import { sha256 } from "@/lib/inventario";

// Backup COMPLETO dos arquivos reais do Blob (fora de teste/ e backup/). Só lê; nada é alterado.
// Devolve o MANIFESTO (caminho, tamanho, SHA-256 calculado aqui no servidor, endereço de leitura).
// O navegador do administrador baixa cada arquivo direto do Blob, recalcula o SHA-256 no próprio
// computador, compara com este manifesto e monta o .zip localmente — o conteúdo não passa por
// nenhum outro serviço. (Resposta grande demais para um .zip único: a Vercel limita a 4,5 MB.)
// Sem parâmetros: não dá para pedir outra conta nem outra pasta.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function getRota() {
  const { erro } = await exigirAdmin();
  if (erro) return erro;
  const arquivos = await listarArquivos("real");
  const itens = [];
  for (let i = 0; i < arquivos.length; i += 8) {
    await Promise.all(
      arquivos.slice(i, i + 8).map(async (b) => {
        const dados = await baixar(b.url);
        itens.push({ caminho: b.pathname, tamanho: dados.length, tamanhoBlob: b.size, sha256: sha256(dados), enviadoEm: b.uploadedAt, url: b.url });
      })
    );
  }
  itens.sort((a, b) => a.caminho.localeCompare(b.caminho));
  const resumo = { geradoEm: new Date().toISOString(), arquivos: itens.length, bytes: itens.reduce((s, m) => s + m.tamanho, 0), tamanhosConferem: itens.every((m) => m.tamanho === m.tamanhoBlob) };
  console.log(JSON.stringify({ app: "edugera", evento: "backup_manifesto", arquivos: resumo.arquivos, bytes: resumo.bytes }));
  return NextResponse.json({ ...resumo, itens }, { headers: semCache });
}

export const GET = comRequestId("/api/admin/backup", getRota);
