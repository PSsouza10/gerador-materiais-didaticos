import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { caminhoBlob } from "@/lib/ambiente";
import { put } from "@vercel/blob";
import { randomBytes } from "crypto";
import { hashChave } from "@/lib/chave";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { ehPremium } from "@/lib/uso";
import { normalizarMaterial } from "@/lib/material";
import { obterNivel } from "@/lib/niveis";
import { normalizarCapa, normalizarEstilo } from "@/lib/opcoes";
import bnccDados from "@/data/bncc-habilidades.json";
import { indexar, resolverCodigo } from "@/lib/bncc";
import { bancoLigado } from "@/lib/banco";
import { gravarMaterial } from "@/lib/contas";

const BNCC = indexar(bnccDados.habilidades);

// Task 4.1 — Salva o material gerado no Vercel Blob e devolve o link público
// de compartilhamento (página /m/<id>, que renderiza a mesma folha A4).
export const runtime = "nodejs";
export const maxDuration = 15;
export const dynamic = "force-dynamic";

const LIMITE_BYTES = 200_000;
const str = (v, max = 300) => (typeof v === "string" ? v.slice(0, max) : "");

async function postRota(request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "Storage (Vercel Blob) não configurado." }, { status: 500 });
    }

    const usuario = authConfigurado ? await usuarioAtual() : null;
    if (!usuario) {
      return NextResponse.json({ error: "Entre com sua conta para salvar e compartilhar." }, { status: 401 });
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
        habilidade: str(form.habilidade, 2000),
        disciplina: str(form.disciplina, 60),
        nivel: str(form.nivel, 60),
        ano: str(form.ano, 6),
        tema: str(form.tema, 200),
        estilo: normalizarEstilo(form.estilo),
        dificuldade: obterNivel(form.dificuldade).id,
        escola: str(form.escola, 120),
        // capa pôster é Premium: quem não tem o plano guarda a capa escolar
        capa: normalizarCapa(form.capa) === "poster" && !ehPremium(usuario.email) ? "escolar" : normalizarCapa(form.capa),
      },
      material: {
        ...normalizarMaterial(material, form.tema),
        tema: material?.tema === "premium" && ehPremium(usuario.email) ? "premium" : "padrao",
        // o servidor confere o código na base oficial (não confia no navegador)
        bncc: (() => {
          const cod = material.bncc?.codigo || form.bncc;
          if (!cod) return null;
          const h = resolverCodigo(BNCC, cod);
          return h
            ? { codigo: h.c, texto: h.t, verificada: true }
            : { codigo: str(cod, 20), texto: str(material.bncc?.texto || form.habilidade, 2000), verificada: false };
        })(),
      },
      urlImagem:
        typeof urlImagem === "string" && /^https:\/\/[\w.-]+\.public\.blob\.vercel-storage\.com\//.test(urlImagem)
          ? urlImagem
          : null,
    };

    // id aleatório de 64 bits (difícil de adivinhar) + chave de revogação que
    // só o navegador de quem gerou conhece; no registro fica apenas o hash dela
    const id = randomBytes(8).toString("base64url");
    const chave = randomBytes(18).toString("base64url");
    const origem = new URL(request.url).origin;
    // com banco (Fase 1): o material vai para o banco; se o banco falhar, cai no Blob como antes
    if (bancoLigado()) {
      try {
        await gravarMaterial(usuario.email, { id, url: `${origem}/m/${id}`, chave, chaveHash: hashChave(chave), registro });
        return NextResponse.json({ id, url: `${origem}/m/${id}`, chave });
      } catch (e) {
        console.error("Banco indisponível ao salvar; usando o Blob:", e?.message || e);
      }
    }
    registro.chaveHash = hashChave(chave);
    await put(caminhoBlob(`materiais/${id}.json`), JSON.stringify(registro), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      cacheControlMaxAge: 60, // após revogar, cópias em cache expiram em até 1 min
    });

    return NextResponse.json({ id, url: `${origem}/m/${id}`, chave });
  } catch (error) {
    console.error("Erro na rota salvar-material:", error);
    return NextResponse.json({ error: "Não foi possível salvar o material." }, { status: 500 });
  }
}

// request_id em cada pedido (cabeçalho x-request-id + registro); a resposta não muda
export const POST = comRequestId("/api/salvar-material", postRota);
