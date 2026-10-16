import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import bnccDados from "@/data/bncc-habilidades.json";
import { indexar, resolverCodigo, DISCIPLINA_PARA_COMPONENTE, cobreAno } from "@/lib/bncc";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consumirGeracao, devolverGeracao } from "@/lib/uso";
import { openaiJson, geminiJson, temGemini, temOpenAI } from "@/lib/provedoresIA";
import { habilidadesCandidatas, mensagemFalhaPlano } from "@/lib/planoAula";
import { validarPedidoAvaliacao, montarPromptAvaliacao, normalizarAvaliacao, conferirAvaliacao, resumoParaAvaliacao } from "@/lib/avaliacao";
import { apostilaDaConta } from "@/lib/apostilaDaConta";

// Avaliação no padrão Prova Paulista / SARESP. Conta como UMA geração do plano do professor.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BNCC = indexar(bnccDados.habilidades);
const SISTEMA =
  "Você é elaborador de itens de avaliações externas (Prova Paulista, SARESP, SAEB), especialista na BNCC e no Currículo Paulista. Escreve itens de múltipla escolha corretos, claros e com distratores baseados em erros reais dos alunos. Responda em português do Brasil, só com JSON válido.";

async function postRota(request, _contexto, requestId) {
  if (!temOpenAI() && !temGemini()) return NextResponse.json({ error: "IA não configurada." }, { status: 500 });
  if (!authConfigurado) return NextResponse.json({ error: "Login não configurado." }, { status: 503 });
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ error: "Entre com sua conta para gerar avaliações." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const fonte = body.fonte?.tipo === "apostila" ? body.fonte : null;
  const v = validarPedidoAvaliacao(body, { temBase: !!fonte });
  if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 });
  const d = v.dados;

  let uso;
  try {
    uso = await consumirGeracao(usuario.email, requestId);
  } catch (e) {
    console.error("Erro ao registrar uso (avaliação):", e);
    return NextResponse.json({ error: "Não foi possível verificar seu limite agora. Tente de novo." }, { status: 503 });
  }
  if (!uso.ok) return NextResponse.json({ error: uso.mensagem, motivo: uso.motivo, limiteAtingido: true }, { status: 429 });

  let base = null;
  if (fonte) {
    const registro = await apostilaDaConta(usuario.email, fonte.id).catch(() => null);
    if (!registro) {
      await devolverGeracao(usuario.email, requestId);
      return NextResponse.json({ error: "Não encontrei essa apostila na sua conta." }, { status: 404 });
    }
    base = { tipo: "apostila", texto: resumoParaAvaliacao(registro) };
  }

  const oficial = d.bncc ? resolverCodigo(BNCC, d.bncc) : null;
  const candidatas = oficial || d.bncc ? [] : habilidadesCandidatas(bnccDados.habilidades, d, DISCIPLINA_PARA_COMPONENTE[d.disciplina] || [], cobreAno);
  const prompt = montarPromptAvaliacao(d, oficial ? `${oficial.c} — ${oficial.t} (texto oficial)` : "", base, candidatas);
  const modelo = process.env.MODELO_TEXTO || "gpt-4o";

  const falhas = [];
  let r = temOpenAI() ? await openaiJson({ sistema: SISTEMA, prompt, modelo, temperatura: 0.4 }) : { ok: false, erro: "OpenAI ausente" };
  if (!r.ok) {
    falhas.push(r);
    console.error("Avaliação: OpenAI falhou", { request_id: requestId, status: r.status, erro: r.erro });
    if (temGemini()) {
      r = await geminiJson({ sistema: SISTEMA, prompt, temperatura: 0.4 });
      if (!r.ok) {
        falhas.push(r);
        console.error("Avaliação: Gemini falhou", { request_id: requestId, status: r.status, erro: r.erro });
      }
    }
  }
  if (!r.ok) {
    await devolverGeracao(usuario.email, requestId);
    return NextResponse.json({ error: mensagemFalhaPlano(falhas).replace("gerar o plano", "gerar a avaliação") }, { status: 502 });
  }

  const normal = normalizarAvaliacao(r.json, d, oficial, (c) => resolverCodigo(BNCC, c));
  const { avaliacao, avisos } = conferirAvaliacao(normal);
  if (avaliacao.itens.length < Math.min(3, d.itens)) {
    await devolverGeracao(usuario.email, requestId);
    return NextResponse.json({ error: "A IA devolveu uma avaliação incompleta. Tente gerar de novo." }, { status: 502 });
  }
  avaliacao.geradaEm = new Date().toISOString();
  return NextResponse.json({ avaliacao, avisos, uso: { usados: uso.usados, limite: uso.limite, restantes: uso.restantes } });
}

export const POST = comRequestId("/api/gerar-avaliacao", postRota);
