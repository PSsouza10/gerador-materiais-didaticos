import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { geminiJson, openaiJson, temGemini, temOpenAI } from "@/lib/provedoresIA";
import { montarPromptLeituraCartao, normalizarLeitura } from "@/lib/correcao";

// Lê a FOTO de um cartão-resposta (IA de visão) e devolve as letras marcadas.
// A foto não é guardada; o professor confere a leitura antes de salvar. Não conta como geração.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SISTEMA = "Você lê cartões-resposta de provas a partir de fotos, com atenção a cada bolinha pintada. Responda só com JSON válido.";
const MAX_BASE64 = 4_000_000; // ~3 MB de imagem (a tela reduz a foto antes de enviar)

async function postRota(request, _ctx, requestId) {
  if (!temGemini() && !temOpenAI()) return NextResponse.json({ error: "IA não configurada." }, { status: 500 });
  if (!authConfigurado) return NextResponse.json({ error: "Login não configurado." }, { status: 503 });
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ error: "Entre com sua conta para ler cartões." }, { status: 401 });
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const n = Number(body?.itens);
  const imagem = typeof body?.imagem === "string" ? body.imagem.replace(/^data:[^,]+,/, "") : "";
  const mime = /^image\/(jpeg|png|webp)$/.test(body?.mime) ? body.mime : "image/jpeg";
  if (!Number.isInteger(n) || n < 1 || n > 30) return NextResponse.json({ error: "Número de questões inválido." }, { status: 400 });
  if (!imagem || imagem.length > MAX_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(imagem.slice(0, 200))) return NextResponse.json({ error: "Foto inválida ou grande demais." }, { status: 400 });

  const pedido = { sistema: SISTEMA, prompt: montarPromptLeituraCartao(n), temperatura: 0, arquivo: { base64: imagem, mime, nome: "cartao.jpg" } };
  let r = temGemini() ? await geminiJson(pedido) : { ok: false, status: 0, erro: "sem Gemini" };
  if (!r.ok && temOpenAI()) {
    console.error("Ler cartão: Gemini falhou, tentando a OpenAI", { request_id: requestId, status: r.status, erro: r.erro });
    r = await openaiJson({ ...pedido, modelo: "gpt-4o" });
  }
  if (!r.ok) {
    console.error("Ler cartão: falhou", { request_id: requestId, status: r.status, erro: r.erro });
    return NextResponse.json({ error: "Não foi possível ler a foto agora. Tente de novo ou digite as respostas." }, { status: 502 });
  }
  const leitura = normalizarLeitura(r.json, n);
  if (!leitura.legivel) return NextResponse.json({ error: "Não consegui ler o cartão nessa foto. Tire outra, de cima, com o cartão inteiro e boa luz." }, { status: 422 });
  return NextResponse.json(leitura);
}

export const POST = comRequestId("/api/ler-cartao", postRota);
