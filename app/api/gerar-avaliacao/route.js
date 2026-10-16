import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import bnccDados from "@/data/bncc-habilidades.json";
import { indexar, resolverCodigo, DISCIPLINA_PARA_COMPONENTE, cobreAno } from "@/lib/bncc";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consumirGeracao, devolverGeracao } from "@/lib/uso";
import { openaiJson, geminiJson, temGemini, temOpenAI } from "@/lib/provedoresIA";
import { habilidadesCandidatas, mensagemFalhaPlano } from "@/lib/planoAula";
import { validarPedidoAvaliacao, montarPromptAvaliacao, normalizarAvaliacao, conferirAvaliacao, resumoParaAvaliacao, itensParaRefazer, montarPromptRefazer, montarPromptTrocar, aplicarRefeitos, retirarComProblema, finalizarAvaliacao, repararAvaliacao } from "@/lib/avaliacao";
import { apostilaDaConta } from "@/lib/apostilaDaConta";

// Avaliação no padrão Prova Paulista / SARESP. Conta como UMA geração do plano do professor.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // geração + até 3 rodadas de correção das questões com erro

const BNCC = indexar(bnccDados.habilidades);
const SISTEMA =
  "Você é elaborador de itens de avaliações externas (Prova Paulista, SARESP, SAEB), especialista na BNCC e no Currículo Paulista. Escreve itens de múltipla escolha corretos, claros e com distratores baseados em erros reais dos alunos. Responda em português do Brasil, só com JSON válido.";

async function postRota(request, _contexto, requestId) {
  const t0 = Date.now();
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

  const resolver = (c) => resolverCodigo(BNCC, c);
  // 1ª conferência: contas refeitas pelo sistema, gabarito, explicações, figuras
  const primeira = conferirAvaliacao(normalizarAvaliacao(r.json, d, oficial, resolver));
  let atual = primeira.avaliacao;
  const corrigidos = primeira.avisos.filter((a) => a.tipo === "corrigido");
  // Questão com problema NÃO é entregue com aviso: é refeita (até 2 vezes); se ainda falhar,
  // a IA escreve uma questão nova no lugar; se nem assim passar, a questão sai da prova.
  const refeitas = new Set();
  const diagRodadas = []; // só para o administrador: o que cada rodada pediu e conseguiu
  const sistemaRef = "Você é revisor de itens de avaliações externas (Prova Paulista, SARESP). Corrige questões de múltipla escolha com rigor matemático. Responda em português do Brasil, só com JSON válido.";
  const rodadas = [montarPromptRefazer, montarPromptRefazer, montarPromptTrocar];
  const reparar = () => {
    const rp = repararAvaliacao(atual);
    atual = rp.avaliacao;
    rp.reparadas.forEach((n) => refeitas.add(n));
    if (rp.reparadas.length) diagRodadas.push({ reparoDoSistema: rp.reparadas });
  };
  reparar(); // primeiro o sistema conserta o que consegue sozinho (alternativas erradas típicas)
  for (const [k, montar] of rodadas.entries()) {
    const indices = itensParaRefazer(atual);
    if (!indices.length) break;
    if (Date.now() - t0 > 210_000) {
      console.error("Avaliação: sem tempo para mais uma rodada", { request_id: requestId, rodada: k + 1 });
      break;
    }
    const prompt = montar(atual, indices, d);
    const rr = temOpenAI() ? await openaiJson({ sistema: sistemaRef, prompt, modelo, temperatura: k === 2 ? 0.5 : 0.2 }) : await geminiJson({ sistema: sistemaRef, prompt, temperatura: k === 2 ? 0.5 : 0.2 });
    if (!rr.ok) {
      console.error("Avaliação: rodada de correção falhou", { request_id: requestId, rodada: k + 1, status: rr.status, erro: rr.erro });
      diagRodadas.push({ rodada: k + 1, erro: `${rr.status} ${rr.erro}`.slice(0, 200) });
      continue;
    }
    const ap = aplicarRefeitos(atual, rr.json, resolver, oficial);
    diagRodadas.push({ rodada: k + 1, pedidas: indices.map((i) => i + 1), devolvidas: (rr.json?.itensRefeitos || []).length, aceitas: ap.trocados, ms: Date.now() - t0 });
    atual = ap.avaliacao;
    ap.trocados.forEach((n) => refeitas.add(n));
  }
  reparar(); // e de novo depois da IA, antes de retirar alguma questão
  const ret = retirarComProblema(atual);
  atual = ret.avaliacao;
  // final: espalha o gabarito e confere de novo (avisos do que ainda precisa do professor)
  const fim = finalizarAvaliacao(atual);
  const avaliacao = { ...fim.avaliacao, itens: fim.avaliacao.itens.map(({ problemas, ...it }) => it) };
  const chave = (a) => `${a.onde}|${a.motivo}`;
  const vistos = new Set(fim.avisos.map(chave));
  const avisos = [
    // números dos itens mudam quando alguma questão sai: os avisos de correção ficam só quando nada saiu
    ...(ret.retiradas.length ? [] : corrigidos.filter((a) => !vistos.has(chave(a)) && !refeitas.has(Number(String(a.onde).replace(/\D/g, ""))))),
    ...(refeitas.size ? [{ onde: "Correção automática", motivo: `${refeitas.size} questão(ões) tinham erro de conta, gabarito ou figura e foram refeitas antes de chegar a você.`, tipo: "corrigido", trecho: "" }] : []),
    ...(ret.retiradas.length ? [{ onde: "Questões retiradas", motivo: `${ret.retiradas.length} questão(ões) não passaram na conferência mesmo depois de refeitas e foram retiradas; a prova ficou com ${atual.itens.length} questões. Gere de novo se precisar de mais.`, tipo: "conferir", trecho: "" }] : []),
    ...fim.avisos,
  ];
  if (avaliacao.itens.length < Math.min(3, d.itens)) {
    await devolverGeracao(usuario.email, requestId);
    console.error("Avaliação: questões retiradas demais", { request_id: requestId, retiradas: ret.retiradas });
    return NextResponse.json(
      { error: "Não foi possível montar uma avaliação com questões conferidas. Tente gerar de novo.", ...(uso.admin ? { diagnostico: { retiradas: ret.retiradas, primeira: primeira.avisos, rodadas: diagRodadas } } : {}) },
      { status: 502 }
    );
  }
  avaliacao.geradaEm = new Date().toISOString();
  return NextResponse.json({ avaliacao, avisos, uso: { usados: uso.usados, limite: uso.limite, restantes: uso.restantes }, ...(uso.admin ? { diagnostico: { retiradas: ret.retiradas, rodadas: diagRodadas } } : {}) });
}

export const POST = comRequestId("/api/gerar-avaliacao", postRota);
