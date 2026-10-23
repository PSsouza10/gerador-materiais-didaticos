import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consumirTroca, devolverTroca } from "@/lib/uso";
import { temGemini, temOpenAI } from "@/lib/provedoresIA";
import { pedidoDaAvaliacao } from "@/lib/avaliacao";
import { novaQuestao } from "@/lib/novaQuestao";

// "Trocar esta questão": a IA escreve outra questão (mesma habilidade, descritor e nível),
// que passa pela MESMA conferência da prova (sistema + Gemini). Até 3 trocas por prova gerada no mês.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function postRota(request, _ctx, requestId) {
  const t0 = Date.now();
  if (!temOpenAI() && !temGemini()) return NextResponse.json({ error: "IA não configurada." }, { status: 500 });
  if (!authConfigurado) return NextResponse.json({ error: "Login não configurado." }, { status: 503 });
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ error: "Entre com sua conta para trocar questões." }, { status: 401 });
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const av = body?.avaliacao;
  const indice = Number(body?.indice);
  if (!av || !Array.isArray(av.itens) || av.itens.length < 1 || av.itens.length > 12 || !Number.isInteger(indice) || indice < 0 || indice >= av.itens.length)
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  if (JSON.stringify(av).length > 400_000) return NextResponse.json({ error: "Avaliação grande demais." }, { status: 413 });
  const d = pedidoDaAvaliacao(av);
  if (!d.tema) return NextResponse.json({ error: "Não encontrei o tema desta avaliação." }, { status: 400 });

  let uso;
  try {
    uso = await consumirTroca(usuario.email, requestId);
  } catch (e) {
    console.error("Erro ao registrar troca:", e);
    return NextResponse.json({ error: "Não foi possível verificar seu limite agora. Tente de novo." }, { status: 503 });
  }
  if (!uso.ok)
    return NextResponse.json({ error: `Você já usou as trocas deste mês (${uso.porProva} por avaliação gerada no plano ${uso.plano || "Grátis"}${uso.porProva < 3 ? "; no Pro são 3" : ""}). Gere uma nova avaliação para ter mais trocas, ou edite a questão à mão.`, limiteAtingido: true }, { status: 429 });

  const { item: escolhida, diag } = await novaQuestao(av, indice, { t0, d });
  if (!escolhida) {
    await devolverTroca(usuario.email, requestId);
    console.error("Trocar questão: nenhuma passou", { request_id: requestId, diag });
    return NextResponse.json({ error: "Não consegui uma questão nova que passasse na conferência. Tente de novo (a troca não foi contada).", ...(uso.admin ? { diagnostico: diag } : {}) }, { status: 502 });
  }
  return NextResponse.json({ item: { ...escolhida, trocada: true }, ...(uso.admin ? { diagnostico: diag } : {}) });
}

export const POST = comRequestId("/api/trocar-questao", postRota);
