import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import bnccDados from "@/data/bncc-habilidades.json";
import { indexar, resolverCodigo } from "@/lib/bncc";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consumirGeracao, devolverGeracao } from "@/lib/uso";
import { openaiJson, geminiJson, temGemini, temOpenAI } from "@/lib/provedoresIA";
import { validarPedidoCruzadinha, montarPromptCruzadinha, normalizarCruzadinha, montarGrade, gradeConsistente, problemasDaCruzadinha, mensagemFalhaCruzadinha } from "@/lib/cruzadinha";

// Cruzadinha: a IA escreve palavras + dicas; a grade é montada no servidor (lib/cruzadinha).
// Conta como UMA geração do plano do professor (devolvida se a falha for nossa).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BNCC = indexar(bnccDados.habilidades);
const SISTEMA = "Você é professor experiente e cria atividades lúdicas corretas para a escola brasileira (BNCC). Responda em português do Brasil, só com JSON válido.";

async function postRota(request, _contexto, requestId) {
  if (!temOpenAI() && !temGemini()) return NextResponse.json({ error: "IA não configurada." }, { status: 500 });
  if (!authConfigurado) return NextResponse.json({ error: "Login não configurado." }, { status: 503 });
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ error: "Entre com sua conta para gerar cruzadinhas." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const v = validarPedidoCruzadinha(body);
  if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 });
  const d = v.dados;

  let uso;
  try {
    uso = await consumirGeracao(usuario.email, requestId);
  } catch (e) {
    console.error("Erro ao registrar uso (cruzadinha):", e);
    return NextResponse.json({ error: "Não foi possível verificar seu limite agora. Tente de novo." }, { status: 503 });
  }
  if (!uso.ok) return NextResponse.json({ error: uso.mensagem, motivo: uso.motivo, limiteAtingido: true }, { status: 429 });

  const oficial = d.bncc ? resolverCodigo(BNCC, d.bncc) : null;
  const prompt = montarPromptCruzadinha(d, oficial ? `${oficial.c} — ${oficial.t}` : "");
  const falhas = [];
  let r = temOpenAI() ? await openaiJson({ sistema: SISTEMA, prompt, modelo: process.env.MODELO_TEXTO || "gpt-4o", temperatura: 0.5 }) : { ok: false, erro: "OpenAI ausente" };
  if (!r.ok) {
    falhas.push(r);
    if (temGemini()) {
      r = await geminiJson({ sistema: SISTEMA, prompt, temperatura: 0.5 });
      if (!r.ok) falhas.push(r);
    }
  }
  if (!r.ok) {
    console.error("Cruzadinha: IA falhou", falhas.map((f) => ({ status: f.status, erro: f.erro })));
    await devolverGeracao(usuario.email, requestId);
    return NextResponse.json({ error: mensagemFalhaCruzadinha(falhas) }, { status: 502 });
  }

  const cz = normalizarCruzadinha(r.json, d);
  const grade = montarGrade(cz.palavras, { alvo: d.quantidade, semente: Date.now() % 100000 });
  if (!grade || !gradeConsistente(grade) || grade.horizontais.length + grade.verticais.length < Math.min(5, d.quantidade)) {
    await devolverGeracao(usuario.email, requestId);
    return NextResponse.json({ error: "As palavras da IA não formaram uma boa cruzadinha. Tente de novo (não contou geração)." }, { status: 502 });
  }
  const etapa = [d.nivel, d.ano ? (d.ano.startsWith("EM") ? `${d.ano.slice(2)}ª série` : `${d.ano}º ano`) : ""].filter(Boolean).join(" · ");
  const cruzadinha = {
    titulo: cz.titulo,
    orientacao: cz.orientacao,
    // as palavras que sobraram ficam guardadas: "Nova disposição" pode usá-las sem IA
    palavras: cz.palavras,
    grade,
    identificacao: { professor: d.professor, escola: d.escola, turma: d.turma, componente: d.disciplina, etapa, tema: d.tema, bncc: oficial?.c || d.bncc || "" },
    quantidade: d.quantidade,
  };
  return NextResponse.json({ cruzadinha, avisos: problemasDaCruzadinha(cruzadinha, d.quantidade), uso: { usados: uso.usados, limite: uso.limite, restantes: uso.restantes } });
}

export const POST = comRequestId("/api/gerar-cruzadinha", postRota);
