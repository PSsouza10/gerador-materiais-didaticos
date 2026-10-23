import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { temGemini, temOpenAI } from "@/lib/provedoresIA";
import { tokenConfere } from "@/lib/completar";
import { questaoParaCompletar } from "@/lib/novaQuestao";

// Completa a avaliação que saiu com menos questões do que o pedido (o tempo acabou nas
// correções): devolve UMA questão nova por chamada, conferida como as outras.
// Não gasta geração: vale só com o token que a própria geração devolveu (30 minutos).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function postRota(request, _ctx, requestId) {
  const t0 = Date.now();
  if (!temOpenAI() && !temGemini()) return NextResponse.json({ error: "IA não configurada." }, { status: 500 });
  if (!authConfigurado) return NextResponse.json({ error: "Login não configurado." }, { status: 503 });
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ error: "Entre com sua conta." }, { status: 401 });
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const av = body?.avaliacao;
  if (!av || !Array.isArray(av.itens) || !av.pedido || JSON.stringify(av).length > 400_000) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  if (!tokenConfere(body.token, usuario.email, av.geradaEm)) return NextResponse.json({ error: "O prazo para completar esta avaliação acabou. Gere de novo se precisar de mais questões." }, { status: 403 });
  const meta = Math.min(12, Number(av.pedido.itens) || 0);
  if (av.itens.length >= meta) return NextResponse.json({ error: "A avaliação já tem as questões pedidas." }, { status: 409 });
  const { item, diag } = await questaoParaCompletar(av, { t0 });
  if (!item) {
    console.error("Completar avaliação: nenhuma passou", { request_id: requestId, diag });
    return NextResponse.json({ error: "Não consegui mais uma questão que passasse na conferência." }, { status: 502 });
  }
  return NextResponse.json({ item });
}

export const POST = comRequestId("/api/completar-avaliacao", postRota);
