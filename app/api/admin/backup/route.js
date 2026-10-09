import { NextResponse } from "next/server";
import { zipSync, strToU8 } from "fflate";
import { comRequestId } from "@/lib/requestId";
import { exigirAdmin, listarArquivos, baixar, semCache } from "@/lib/admin";
import { sha256 } from "@/lib/inventario";

// Backup COMPLETO dos arquivos reais do Blob (fora de teste/ e backup/), como .zip baixado
// pelo administrador. Só lê; nada é alterado. Dentro do .zip: os arquivos nos mesmos caminhos
// + manifesto.json (caminho, tamanho, SHA-256). Sem parâmetros: não dá para pedir outra coisa.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function getRota() {
  const { erro } = await exigirAdmin();
  if (erro) return erro;
  const arquivos = await listarArquivos("real");
  const conteudo = {};
  const manifesto = [];
  for (let i = 0; i < arquivos.length; i += 8) {
    await Promise.all(
      arquivos.slice(i, i + 8).map(async (b) => {
        const dados = await baixar(b.url);
        conteudo[b.pathname] = dados;
        manifesto.push({ caminho: b.pathname, tamanho: dados.length, tamanhoBlob: b.size, sha256: sha256(dados), enviadoEm: b.uploadedAt });
      })
    );
  }
  manifesto.sort((a, b) => a.caminho.localeCompare(b.caminho));
  const resumo = { geradoEm: new Date().toISOString(), arquivos: manifesto.length, bytes: manifesto.reduce((s, m) => s + m.tamanho, 0), tamanhosConferem: manifesto.every((m) => m.tamanho === m.tamanhoBlob) };
  const textoManifesto = JSON.stringify({ ...resumo, itens: manifesto }, null, 2);
  conteudo["manifesto.json"] = strToU8(textoManifesto);
  const zip = zipSync(conteudo, { level: 6 });
  console.log(JSON.stringify({ app: "edugera", evento: "backup", arquivos: resumo.arquivos, bytes: resumo.bytes }));
  return new NextResponse(zip, {
    headers: {
      ...semCache,
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="edugera-backup-${resumo.geradoEm.slice(0, 10)}.zip"`,
      "X-Manifesto-Sha256": sha256(textoManifesto),
      "X-Arquivos": String(resumo.arquivos),
    },
  });
}

export const GET = comRequestId("/api/admin/backup", getRota);
