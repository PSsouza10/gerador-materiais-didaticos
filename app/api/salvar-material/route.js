import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomBytes } from "crypto";
import { normalizarMaterial } from "@/lib/material";
import { obterNivel } from "@/lib/niveis";

// Task 4.1 — Salva o material gerado no Vercel Blob e devolve o link público
// de compartilhamento (página /m/<id>, que renderiza a mesma folha A4).
export const runtime = "nodejs";
export const maxDuration = 15;
export const dynamic = "force-dynamic";

const LIMITE_BYTES = 200_000;
const str = (v, max = 300) => (typeof v === "string" ? v.slice(0, max) : "");

export async function POST(request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "Storage (Vercel Blob) não configurado." }, { status: 500 });
    }

    const bruto = await request.text();
    if (bruto.length > LIMITE_BYTES) {
      return NextResponse.json({ error: "Material grande demais para salvar." }, { status: 413 });
    }
    const { form = {}, material = {}, urlImagem } = JSON.parse(bruto);

    // Só grava campos conhecidos — nada de conteúdo arbitrário vindo do navegador
    const registro = {
      versao: 1,
      criadoEm: new Date().toISOString(),
      form: {
        professor: str(form.professor, 120),
        bncc: str(form.bncc, 20),
        habilidade: str(form.habilidade, 800),
        disciplina: str(form.disciplina, 60),
        nivel: str(form.nivel, 60),
        tema: str(form.tema, 200),
        estilo: str(form.estilo, 60),
        dificuldade: obterNivel(form.dificuldade).id,
        capa: form.capa !== false,
      },
      material: {
        ...normalizarMaterial(material, form.tema),
        bncc: material.bncc ? { codigo: str(material.bncc.codigo, 20), texto: str(material.bncc.texto, 800) } : null,
      },
      urlImagem:
        typeof urlImagem === "string" && /^https:\/\/[\w.-]+\.public\.blob\.vercel-storage\.com\//.test(urlImagem)
          ? urlImagem
          : null,
    };

    const id = randomBytes(8).toString("base64url");
    await put(`materiais/${id}.json`, JSON.stringify(registro), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    const origem = new URL(request.url).origin;
    return NextResponse.json({ id, url: `${origem}/m/${id}` });
  } catch (error) {
    console.error("Erro na rota salvar-material:", error);
    return NextResponse.json({ error: "Não foi possível salvar o material." }, { status: 500 });
  }
}
