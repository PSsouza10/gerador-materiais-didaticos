import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import bnccDados from "@/data/bncc-habilidades.json";
import { indexar, resolverCodigo, DISCIPLINA_PARA_COMPONENTE, cobreAno } from "@/lib/bncc";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consumirGeracao, devolverGeracao, podePlanoAulaPdf } from "@/lib/uso";
import { openaiJson, geminiJson, temGemini, temOpenAI } from "@/lib/provedoresIA";
import { validarPedidoPlano, montarPromptPlano, normalizarPlano, problemasDoPlano, resumoDaApostila, montarPromptRevisaoPlano, aplicarRevisaoPlano, urlIlustracaoValida, mensagemFalhaPlano, habilidadesCandidatas } from "@/lib/planoAula";
import { apostilaDaConta } from "@/lib/apostilaDaConta";

const PDF_MAX = 3 * 1024 * 1024; // 3 MB (o pedido inteiro precisa caber no limite da Vercel)

// Plano de aula (estrutura do Currículo Paulista). Conta como UMA geração do plano do professor.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 150; // geração + revisão

const BNCC = indexar(bnccDados.habilidades);
const SISTEMA = "Você é coordenador pedagógico de uma rede que segue o Currículo Paulista e a BNCC. Escreve planos de aula claros e realistas. Responda em português do Brasil, só com JSON válido.";

async function postRota(request, _contexto, requestId) {
  if (!temOpenAI() && !temGemini()) return NextResponse.json({ error: "IA não configurada." }, { status: 500 });
  if (!authConfigurado) return NextResponse.json({ error: "Login não configurado." }, { status: 503 });
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ error: "Entre com sua conta para gerar planos de aula." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  // material base: apostila do EduGera ou PDF anexado
  const fonte = body.fonte && typeof body.fonte === "object" ? body.fonte : null;
  let base = null;
  let arquivo = null;
  if (fonte?.tipo === "pdf") {
    if (!(await podePlanoAulaPdf(usuario.email)))
      return NextResponse.json({ error: "O plano de aula a partir de PDF é do plano Pro. No seu plano, gere a partir de um tema ou de uma apostila do EduGera.", motivo: "recurso_pro" }, { status: 403 });
    const b64 = typeof fonte.base64 === "string" ? fonte.base64.replace(/^data:[^,]*,/, "") : "";
    const bytes = Math.floor((b64.length * 3) / 4);
    if (!b64 || bytes > PDF_MAX) return NextResponse.json({ error: "Envie um PDF de até 3 MB." }, { status: 400 });
    if (!Buffer.from(b64.slice(0, 8), "base64").toString("latin1").startsWith("%PDF")) return NextResponse.json({ error: "O arquivo não é um PDF." }, { status: 400 });
    arquivo = { nome: String(fonte.nome || "material.pdf").replace(/[^\w.\- ]/g, "").slice(0, 80) || "material.pdf", base64: b64 };
    base = { tipo: "pdf" };
  }
  const v = validarPedidoPlano(body, { temBase: !!fonte });
  if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 });
  const d = v.dados;

  let uso;
  try {
    uso = await consumirGeracao(usuario.email, requestId);
  } catch (e) {
    console.error("Erro ao registrar uso (plano):", e);
    return NextResponse.json({ error: "Não foi possível verificar seu limite agora. Tente de novo." }, { status: 503 });
  }
  if (!uso.ok) return NextResponse.json({ error: uso.mensagem, motivo: uso.motivo, limiteAtingido: true }, { status: 429 });

  if (fonte?.tipo === "apostila") {
    const registro = await apostilaDaConta(usuario.email, fonte.id).catch(() => null);
    if (!registro) {
      await devolverGeracao(usuario.email, requestId);
      return NextResponse.json({ error: "Não encontrei essa apostila na sua conta." }, { status: 404 });
    }
    base = { tipo: "apostila", texto: resumoDaApostila(registro), ilustracao: urlIlustracaoValida(registro.urlImagem) };
  }

  const oficial = d.bncc ? resolverCodigo(BNCC, d.bncc) : null;
  const candidatas = oficial || d.bncc ? [] : habilidadesCandidatas(bnccDados.habilidades, d, DISCIPLINA_PARA_COMPONENTE[d.disciplina] || [], cobreAno);
  const prompt = montarPromptPlano(d, oficial ? `${oficial.c} — ${oficial.t} (texto oficial)` : "", base, candidatas);
  const inicio = Date.now();
  const falhas = [];
  let r = temOpenAI() ? await openaiJson({ sistema: SISTEMA, prompt, modelo: process.env.MODELO_TEXTO || "gpt-4o", temperatura: 0.4, arquivo }) : { ok: false, erro: "OpenAI ausente" };
  if (!r.ok) {
    falhas.push(r);
    console.error("Plano de aula: OpenAI falhou", { request_id: requestId, comPdf: !!arquivo, kb: arquivo ? Math.round((arquivo.base64.length * 3) / 4 / 1024) : 0, status: r.status, erro: r.erro });
    // reserva: o Gemini também lê o PDF (inlineData)
    if (temGemini()) {
      r = await geminiJson({ sistema: SISTEMA, prompt, temperatura: 0.4, arquivo });
      if (!r.ok) {
        falhas.push(r);
        console.error("Plano de aula: Gemini falhou", { request_id: requestId, comPdf: !!arquivo, status: r.status, erro: r.erro });
      }
    }
  }
  if (!r.ok) {
    await devolverGeracao(usuario.email, requestId); // erro nosso: o professor não perde a geração
    return NextResponse.json({ error: mensagemFalhaPlano(falhas, { comPdf: !!arquivo }) }, { status: 502 });
  }
  let plano = normalizarPlano(r.json, d, oficial, (c) => resolverCodigo(BNCC, c));
  // Revisão automática: segunda leitura procura erros conceituais e corrige (sem gastar outra geração)
  let correcoes = [];
  let revisado = false;
  // Revisão só se ainda houver tempo (PDF grande deixa a 1ª leitura lenta; o limite da função é maxDuration)
  const tempoDeSobra = Date.now() - inicio < 75_000;
  if (!tempoDeSobra) console.error("Plano de aula: revisão pulada por tempo", { request_id: requestId, ms: Date.now() - inicio });
  if (tempoDeSobra && plano.aulas.length && plano.objetivos.length) {
    const sistemaRev = "Você é coordenador pedagógico rigoroso. Corrige erros conceituais em planos de aula. Responda em português do Brasil, só com JSON válido.";
    const promptRev = montarPromptRevisaoPlano(plano, oficial ? `${oficial.c} — ${oficial.t}` : "");
    const rv = temOpenAI()
      ? await openaiJson({ sistema: sistemaRev, prompt: promptRev, modelo: process.env.MODELO_REVISOR || "gpt-4o", temperatura: 0.1 })
      : await geminiJson({ sistema: sistemaRev, prompt: promptRev, temperatura: 0.1 });
    if (rv.ok) {
      const a = aplicarRevisaoPlano(plano, rv.json, d);
      plano = a.plano;
      correcoes = a.correcoes;
      revisado = a.aplicada;
    } else console.error("Revisão do plano falhou (segue sem revisão):", rv.status, rv.erro);
  }
  // a apostila já tem ilustração: o plano reaproveita (sem custo)
  if (base?.ilustracao) plano = { ...plano, ilustracao: base.ilustracao };
  const problemas = problemasDoPlano(plano, d);
  if (!plano.aulas.length || !plano.objetivos.length) {
    await devolverGeracao(usuario.email, requestId);
    return NextResponse.json({ error: "A IA devolveu um plano incompleto. Tente gerar de novo." }, { status: 502 });
  }
  return NextResponse.json({ plano, avisos: problemas, revisado, correcoes, uso: { usados: uso.usados, limite: uso.limite, restantes: uso.restantes } });
}

export const POST = comRequestId("/api/gerar-plano", postRota);
