import { NextResponse } from "next/server";
import bnccDados from "@/data/bncc-habilidades.json";
import { indexar, resolverCodigo } from "@/lib/bncc";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consumirRevisao } from "@/lib/uso";
import { promptRevisor, normalizarApontamentos } from "@/lib/revisorConteudo";
import { limparTexto } from "@/lib/validacao";

// Revisor de conteúdo: segunda leitura da apostila por uma IA no papel de professor
// da disciplina. Devolve só os apontamentos; quem grava no material é o navegador.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BNCC = indexar(bnccDados.habilidades);
const txt = (v, max = 200) => limparTexto(typeof v === "string" ? v : "").slice(0, max);

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
  const material = body.material && typeof body.material === "object" ? body.material : null;
  const exercicios = Array.isArray(material?.exercicios) ? material.exercicios.slice(0, 30) : [];
  if (!material || !exercicios.length) return NextResponse.json({ error: "Apostila inválida." }, { status: 400 });
  if (JSON.stringify(material).length > 60000) return NextResponse.json({ error: "Apostila grande demais para revisar." }, { status: 413 });

  try {
    const c = await consumirRevisao(usuario.email);
    if (!c.ok) return NextResponse.json({ error: `Você usou as ${c.limite} revisões de conteúdo deste mês.` }, { status: 429 });
  } catch (e) {
    console.error("Erro ao registrar revisão:", e);
    return NextResponse.json({ error: "Não foi possível registrar a revisão agora." }, { status: 503 });
  }

  const f = body.form || {};
  const form = { disciplina: txt(f.disciplina, 60), nivel: txt(f.nivel, 60), ano: txt(f.ano, 6), tema: txt(f.tema, 200), bncc: txt(f.bncc, 20) };
  const oficial = form.bncc ? resolverCodigo(BNCC, form.bncc) : null;
  const prompt = promptRevisor(form, { ...material, exercicios }, oficial ? `${oficial.c} — ${oficial.t}` : "");

  let r;
  for (let tentativa = 0; ; tentativa++) {
    r = await fetch(`${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.MODELO_REVISOR || "gpt-4o",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Você revisa material didático brasileiro alinhado à BNCC. Seja rigoroso e objetivo. Responda em português do Brasil, só com JSON válido." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (r.status !== 429 || tentativa >= 2) break;
    await new Promise((ok) => setTimeout(ok, 5000 * (tentativa + 1)));
  }
  if (!r.ok) {
    console.error("Erro OpenAI (revisar conteúdo):", r.status, await r.text());
    return NextResponse.json({ error: r.status === 429 ? "IA ocupada. Tente em instantes." : "Falha ao revisar o conteúdo." }, { status: 502 });
  }
  try {
    const dados = await r.json();
    const json = JSON.parse(dados.choices?.[0]?.message?.content || "{}");
    return NextResponse.json({ apontamentos: normalizarApontamentos(json, exercicios.length) });
  } catch (e) {
    console.error("Resposta inválida (revisar conteúdo):", e);
    return NextResponse.json({ error: "O revisor devolveu uma resposta inválida. Tente de novo." }, { status: 502 });
  }
}
