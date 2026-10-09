import { notFound } from "next/navigation";
import { head } from "@vercel/blob";
import { caminhoBlob } from "@/lib/ambiente";
import MaterialCompartilhado from "@/components/MaterialCompartilhado";
import { bancoLigado } from "@/lib/banco";
import { materialPublico, situacaoMaterial } from "@/lib/contas";

// Task 4.1 — Página pública do material compartilhado entre docentes.
export const dynamic = "force-dynamic";

async function carregar(id) {
  if (!/^[\w-]{6,32}$/.test(id)) return null;
  // Fase 1: primeiro o banco; material antigo que ainda não foi importado continua no Blob
  if (bancoLigado()) {
    try {
      const situacao = await situacaoMaterial(id);
      if (situacao === "revogado") return null; // revogado no banco: nunca cai na cópia do Blob
      if (situacao === "conteudo") {
        const doBanco = await materialPublico(id);
        if (doBanco) return doBanco;
      }
    } catch (e) {
      console.error("Banco indisponível ao abrir material:", e?.message || e);
    }
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  // lápide de revogação (Parte B): o link continua fechado mesmo com o banco desligado
  try {
    await head(caminhoBlob(`revogados/${id}.json`));
    return null;
  } catch {
    /* sem lápide: segue */
  }
  try {
    const meta = await head(caminhoBlob(`materiais/${id}.json`));
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return null;
    const { chaveHash, ...dados } = await res.json(); // o hash não vai para o navegador
    return dados;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const dados = await carregar(params.id);
  return {
    title: dados ? `${dados.material.tituloDidatico} · EduGera` : "Material não encontrado · EduGera",
    description: dados ? dados.material.resumoPedagogico : undefined,
    // conteúdo de professor: acessível por link, mas fora dos buscadores
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }) {
  const dados = await carregar(params.id);
  if (!dados) notFound();
  return <MaterialCompartilhado dados={dados} />;
}
