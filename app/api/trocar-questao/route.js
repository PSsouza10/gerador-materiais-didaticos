import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import bnccDados from "@/data/bncc-habilidades.json";
import { indexar, resolverCodigo } from "@/lib/bncc";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consumirTroca, devolverTroca, TROCAS_POR_GERACAO } from "@/lib/uso";
import { openaiJson, geminiJson, temGemini, temOpenAI } from "@/lib/provedoresIA";
import {
  pedidoDaAvaliacao,
  montarPromptTrocarUma,
  candidatosDeReposicao,
  repararAvaliacao,
  escolherTroca,
  montarPromptResolucaoCega,
  aplicarResolucaoCega,
  montarPromptRevisaoItens,
  aplicarRevisaoItens,
  conferirItem,
} from "@/lib/avaliacao";
import { questaoDoSistema } from "@/lib/questoesSistema";

// "Trocar esta questão": a IA escreve outra questão (mesma habilidade, descritor e nível),
// que passa pela MESMA conferência da prova (sistema + Gemini). Até 3 trocas por prova gerada no mês.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BNCC = indexar(bnccDados.habilidades);
const SISTEMA = "Você é elaborador de itens de avaliações externas (Prova Paulista, SARESP, SAEB), especialista na BNCC e no Currículo Paulista. Escreve itens de múltipla escolha corretos, claros e com distratores baseados em erros reais dos alunos. Responda em português do Brasil, só com JSON válido.";
const SISTEMA_CEGO = "Você é professor experiente e resolve questões de múltipla escolha com rigor, sem gabarito. Responda em português do Brasil, só com JSON válido.";
const SISTEMA_REVISOR = "Você é revisor de avaliações externas (Prova Paulista, SARESP, SAEB): confere se cada questão avalia o tema e a habilidade pedidos, se o enunciado não entrega a resposta e se as explicações dos erros batem com cada alternativa. Responda em português do Brasil, só com JSON válido.";

async function pedirIA({ sistema, prompt, temperatura }) {
  if (temOpenAI()) {
    const a = await openaiJson({ sistema, prompt, modelo: process.env.MODELO_TEXTO || "gpt-4o", temperatura });
    if (a.ok || !temGemini()) return a;
  }
  return temGemini() ? geminiJson({ sistema, prompt, temperatura }) : { ok: false, status: 500, erro: "sem IA" };
}

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
    return NextResponse.json({ error: `Você já usou as trocas deste mês (${TROCAS_POR_GERACAO} por avaliação gerada). Gere uma nova avaliação para ter mais trocas, ou edite a questão à mão.`, limiteAtingido: true }, { status: 429 });

  const resolver = (c) => resolverCodigo(BNCC, c);
  const oficial = d.bncc ? resolverCodigo(BNCC, d.bncc) : null;
  const velho = av.itens[indice];
  let escolhida = null;
  const diag = [];
  for (let tentativa = 1; !escolhida && tentativa <= 2 && Date.now() - t0 < 75_000; tentativa++) {
    const r = await pedirIA({ sistema: SISTEMA, prompt: montarPromptTrocarUma(av, indice, d), temperatura: 0.6 });
    if (!r.ok) {
      diag.push({ tentativa, erro: `${r.status} ${r.erro}`.slice(0, 160) });
      continue;
    }
    const semEla = { ...av, itens: av.itens.filter((_, i) => i !== indice) };
    const cands = candidatosDeReposicao(semEla, r.json, d, resolver, oficial).map((c) => ({ ...c, dificuldade: velho.dificuldade || c.dificuldade }));
    let tmp = repararAvaliacao({ itens: cands }).avaliacao;
    const limpos = tmp.itens.map((it, i) => (!it.problemas?.length && it.correta && !it.semGabarito ? i : -1)).filter((i) => i >= 0);
    if (temGemini() && limpos.length && Date.now() - t0 < 90_000) {
      const [rc, rv] = await Promise.all([
        geminiJson({ sistema: SISTEMA_CEGO, prompt: montarPromptResolucaoCega(tmp, limpos), temperatura: 0 }),
        geminiJson({ sistema: SISTEMA_REVISOR, prompt: montarPromptRevisaoItens(tmp, limpos, d, oficial ? `${oficial.c} — ${oficial.t}` : d.bncc), temperatura: 0 }),
      ]);
      if (rc.ok) tmp = aplicarResolucaoCega(tmp, rc.json, limpos).avaliacao;
      if (rv.ok) tmp = aplicarRevisaoItens(tmp, rv.json, limpos).avaliacao;
    }
    escolhida = escolherTroca(av, indice, tmp.itens, d);
    diag.push({ tentativa, recebidas: cands.length, problemas: tmp.itens.map((it) => (it.problemas || [])[0] || null) });
  }
  // Matemática (área, perímetro, volume, gráficos, ângulos): o sistema monta a questão
  if (!escolhida) {
    for (let k = 0; k < 6 && !escolhida; k++) {
      const sys = questaoDoSistema(d, indice + 7 * (k + 1) + new Date().getSeconds(), { habilidades: velho.habilidades?.length ? velho.habilidades : oficial ? [{ codigo: oficial.c, verificada: true }] : [], dificuldade: velho.dificuldade || "media" });
      if (!sys) break;
      const c = conferirItem(sys, indice + 1).item;
      if (!c.problemas?.length && c.correta && c.comando !== velho.comando) escolhida = c;
    }
  }
  if (!escolhida) {
    await devolverTroca(usuario.email, requestId);
    console.error("Trocar questão: nenhuma passou", { request_id: requestId, diag });
    return NextResponse.json({ error: "Não consegui uma questão nova que passasse na conferência. Tente de novo (a troca não foi contada).", ...(uso.admin ? { diagnostico: diag } : {}) }, { status: 502 });
  }
  const { problemas, reposta, ...item } = escolhida;
  return NextResponse.json({ item: { ...item, trocada: true }, ...(uso.admin ? { diagnostico: diag } : {}) });
}

export const POST = comRequestId("/api/trocar-questao", postRota);
