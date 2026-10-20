import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import bnccDados from "@/data/bncc-habilidades.json";
import { indexar, resolverCodigo, rotuloAno } from "@/lib/bncc";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consumirCorrecao } from "@/lib/uso";
import { normalizarMaterial } from "@/lib/material";
import { conferirExercicio } from "@/lib/gabarito";
import { limparTexto } from "@/lib/validacao";
import { geminiJson, temGemini } from "@/lib/provedoresIA";

// Refaz UM exercício da apostila, com o motivo do problema (revisão exercício por exercício).
// Bem mais barato que gerar a apostila de novo: entrada e saída pequenas.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BNCC = indexar(bnccDados.habilidades);
const txt = (v, max = 400) => limparTexto(typeof v === "string" ? v : "").slice(0, max);

// O Gemini pode devolver o exercício diretamente ou encapsulado em uma chave
// (`exercicio`, `questao` ou `item`). Aceitamos os formatos equivalentes antes
// de concluir que a resposta veio inválida.
const extrairExercicio = (json) => {
  const candidatos = [
    json,
    json?.exercicio,
    json?.questao,
    json?.item,
    json?.exercicioCorrigido,
    json?.correcao,
    json?.resultado,
    ...(Array.isArray(json?.exercicios) ? json.exercicios : []),
    ...(Array.isArray(json?.questoes) ? json.questoes : []),
  ];
  return candidatos.find((v) => v && typeof v === "object" && txt(v.enunciado || v.pergunta || v.comando)) || null;
};

async function postRota(request, _contexto, requestId) {
  if (!temGemini()) return NextResponse.json({ error: "Gemini não configurado." }, { status: 500 });
  if (!authConfigurado) return NextResponse.json({ error: "Login não configurado." }, { status: 503 });
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ error: "Entre com sua conta." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const ex = body.exercicio && typeof body.exercicio === "object" ? body.exercicio : null;
  if (!ex || !txt(ex.enunciado)) return NextResponse.json({ error: "Exercício inválido." }, { status: 400 });

  try {
    const c = await consumirCorrecao(usuario.email, requestId);
    if (!c.ok) return NextResponse.json({ error: `Você usou as ${c.limite} correções deste mês do plano ${c.plano}. O limite renova no dia 1º.` }, { status: 429 });
  } catch (e) {
    console.error("Erro ao registrar correção:", e);
    return NextResponse.json({ error: "Não foi possível registrar a correção agora." }, { status: 503 });
  }

  const f = body.form || {};
  const oficial = f.bncc ? resolverCodigo(BNCC, txt(f.bncc, 20)) : null;
  const motivos = (Array.isArray(body.motivos) ? body.motivos : []).map((m) => txt(m, 300)).filter(Boolean).slice(0, 6);
  const outros = (Array.isArray(body.outros) ? body.outros : []).map((m) => txt(m, 200)).filter(Boolean).slice(0, 12);
  const instrucao = txt(body.instrucao, 300);

  const prompt = `Reescreva UM exercício de uma apostila escolar brasileira, corrigindo os problemas apontados.

Contexto: ${txt(f.disciplina, 60)} · ${txt(f.nivel, 60)}${f.ano ? ` · ${rotuloAno(txt(f.ano, 6))}` : ""} · tema "${txt(f.tema, 200)}"
Habilidade BNCC: ${oficial ? `${oficial.c} — ${oficial.t}` : txt(f.bncc, 20) || "não informada"}

Exercício atual (JSON):
${JSON.stringify({ fala: ex.fala && typeof ex.fala === "object" ? { quem: txt(ex.fala.quem, 10), texto: txt(ex.fala.texto, 300) } : null, enunciado: txt(ex.enunciado), alternativas: (ex.alternativas || []).map((a) => txt(a, 120)), resposta: txt(ex.resposta, 600), resolucao: txt(ex.resolucao, 600), tipo: txt(ex.tipo, 30), figura: ex.figura || null })}

Problemas a corrigir:
${motivos.length ? motivos.map((m) => `- ${m}`).join("\n") : "- deixe o exercício mais claro, correto e dentro do tema"}
${instrucao ? `Pedido do professor: ${instrucao}\n` : ""}
Não repita estes outros exercícios da apostila:
${outros.map((o) => `- ${o}`).join("\n") || "- (nenhum)"}

Regras: fique no tema e na habilidade; a "fala" é de um personagem (lia, theo, vo ou edu) que apresenta a situação ou a dúvida, combina com o novo enunciado e NUNCA mostra a resposta; mantenha o tipo de questão quando fizer sentido; múltipla escolha com 4 alternativas "a) ... d)" e só uma correta; RESOLVA em "resolucao" antes de escolher a letra; "resposta" começa pela letra e texto da alternativa certa (ou a resposta da questão aberta); potências com ^; se o enunciado citar figura, reta, tabela ou gráfico, preencha "figura" (tipos: reta, fracao, grade, tabela, barras, linha_do_tempo, fluxo, mapa) sem entregar a resposta; linguagem adequada à idade.

Retorne APENAS o JSON: { "fala": { "quem": "...", "texto": "..." }, "enunciado": "...", "tipo": "...", "exigencia": "...", "alternativas": [...], "figura": null, "resolucao": "...", "resposta": "..." }`;

  // Esta ação usa exclusivamente Gemini; não recorrer à OpenAI para evitar cobrança nesse fluxo.
  const sistema = "Você é um especialista em material didático alinhado à BNCC. Responda em português do Brasil, só com JSON válido.";
  const reforco = `\n\nIMPORTANTE: devolva um objeto JSON de exercício diretamente, sem a chave "exercicios", sem markdown e sem explicações fora do JSON. O objeto precisa conter pelo menos "enunciado", "tipo", "alternativas", "resolucao" e "resposta".`;
  let r = await geminiJson({ sistema, prompt, temperatura: 0.2 });

  const validar = (resposta) => {
    if (!resposta.ok) return { ok: false, motivo: resposta.erro || `status ${resposta.status}` };
    try {
      const novo = extrairExercicio(resposta.json);
      if (!novo) return { ok: false, motivo: "JSON sem enunciado" };
      const [normalizado] = normalizarMaterial({ exercicios: [{ ...novo, enunciado: novo.enunciado || novo.pergunta || novo.comando }] }, f.tema).exercicios;
      if (!normalizado) return { ok: false, motivo: "exercício sem enunciado após normalização" };
      const { exercicio, avisos } = conferirExercicio(normalizado, Number(body.numero) || 1);
      return { ok: true, exercicio, avisos };
    } catch (e) {
      return { ok: false, motivo: `normalização: ${e.message || e}` };
    }
  };

  let resultado = validar(r);
  // Uma resposta JSON incompleta acontece ocasionalmente no Gemini; uma nova
  // chamada com instrução mais curta recupera o exercício sem cobrar OpenAI.
  if (!resultado.ok) {
    r = await geminiJson({ sistema, prompt: prompt + reforco, temperatura: 0.1 });
    resultado = validar(r);
  }
  if (resultado.ok) return NextResponse.json({ exercicio: resultado.exercicio, avisos: resultado.avisos });

  console.error("Erro IA (corrigir exercício):", r.status, resultado.motivo);
  const mensagem = r.status === 429
    ? "IA ocupada. Tente em instantes."
    : /JSON|enunciado|normaliza/i.test(resultado.motivo || "")
    ? "O Gemini devolveu uma correção incompleta. Tente novamente."
    : "Falha ao corrigir o exercício.";
  return NextResponse.json(
    {
      error: mensagem,
      requestId,
      ...(ehAdmin(usuario.email)
        ? { detalhe: { status: r.status || null, erro: String(r.erro || "").slice(0, 400), validacao: resultado.motivo } }
        : {}),
    },
    { status: 502 }
  );
}

// request_id em cada pedido (cabeçalho x-request-id + registro); a resposta não muda
export const POST = comRequestId("/api/corrigir-exercicio", postRota);
