import { NextResponse } from "next/server";
import bnccDados from "@/data/bncc-habilidades.json";
import { indexar, resolverCodigo, rotuloAno } from "@/lib/bncc";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consumirCorrecao } from "@/lib/uso";
import { normalizarMaterial } from "@/lib/material";
import { conferirExercicio } from "@/lib/gabarito";
import { limparTexto } from "@/lib/validacao";

// Refaz UM exercício da apostila, com o motivo do problema (revisão exercício por exercício).
// Bem mais barato que gerar a apostila de novo: entrada e saída pequenas.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const BNCC = indexar(bnccDados.habilidades);
const txt = (v, max = 400) => limparTexto(typeof v === "string" ? v : "").slice(0, max);

export async function POST(request) {
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "IA não configurada." }, { status: 500 });
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
    const c = await consumirCorrecao(usuario.email);
    if (!c.ok) return NextResponse.json({ error: `Você usou as ${c.limite} correções deste mês.` }, { status: 429 });
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

  let r;
  for (let tentativa = 0; ; tentativa++) {
    r = await fetch(`${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Você é um especialista em material didático alinhado à BNCC. Responda em português do Brasil, só com JSON válido." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (r.status !== 429 || tentativa >= 2) break;
    await new Promise((ok) => setTimeout(ok, 5000 * (tentativa + 1)));
  }
  if (!r.ok) {
    console.error("Erro OpenAI (corrigir exercício):", r.status, await r.text());
    return NextResponse.json({ error: r.status === 429 ? "IA ocupada. Tente em instantes." : "Falha ao corrigir o exercício." }, { status: 502 });
  }
  try {
    const dados = await r.json();
    const novo = JSON.parse(dados.choices?.[0]?.message?.content || "{}");
    const [normalizado] = normalizarMaterial({ exercicios: [novo] }, f.tema).exercicios;
    if (!normalizado) throw new Error("vazio");
    const { exercicio, avisos } = conferirExercicio(normalizado, Number(body.numero) || 1);
    return NextResponse.json({ exercicio, avisos });
  } catch (e) {
    console.error("Resposta inválida (corrigir exercício):", e);
    return NextResponse.json({ error: "A IA devolveu um exercício inválido. Tente de novo." }, { status: 502 });
  }
}
