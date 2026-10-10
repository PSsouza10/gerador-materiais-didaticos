import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import bnccDados from "@/data/bncc-habilidades.json";
import { indexar, resolverCodigo } from "@/lib/bncc";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consumirRevisao, ehAdmin } from "@/lib/uso";
import { openaiJson, geminiJson, temGemini, temOpenAI, provedorRevisorPadrao } from "@/lib/provedoresIA";
import { promptRevisor, normalizarApontamentos } from "@/lib/revisorConteudo";
import { limparTexto } from "@/lib/validacao";

// Revisor de conteúdo: segunda leitura da apostila por uma IA no papel de professor
// da disciplina. Devolve só os apontamentos; quem grava no material é o navegador.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const BNCC = indexar(bnccDados.habilidades);
const txt = (v, max = 200) => limparTexto(typeof v === "string" ? v : "").slice(0, max);

async function postRota(request, _contexto, requestId) {
  if (!provedorRevisorPadrao()) return NextResponse.json({ error: "IA não configurada." }, { status: 500 });
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
    const c = await consumirRevisao(usuario.email, requestId);
    if (!c.ok) return NextResponse.json({ error: `Você usou as ${c.limite} revisões de conteúdo deste mês do plano ${c.plano}. O limite renova no dia 1º.` }, { status: 429 });
  } catch (e) {
    console.error("Erro ao registrar revisão:", e);
    return NextResponse.json({ error: "Não foi possível registrar a revisão agora." }, { status: 503 });
  }

  const f = body.form || {};
  const form = { disciplina: txt(f.disciplina, 60), nivel: txt(f.nivel, 60), ano: txt(f.ano, 6), tema: txt(f.tema, 200), bncc: txt(f.bncc, 20) };
  const oficial = form.bncc ? resolverCodigo(BNCC, form.bncc) : null;
  const prompt = promptRevisor(form, { ...material, exercicios }, oficial ? `${oficial.c} — ${oficial.t}` : "");

  // provedor: o padrão da Vercel; administrador pode escolher (bateria compara GPT × Gemini)
  const pedido = ehAdmin(usuario.email) && ["openai", "gemini"].includes(body.provedor) ? body.provedor : null;
  const primeiro = pedido || provedorRevisorPadrao();
  const sistema = "Você revisa material didático brasileiro alinhado à BNCC. Seja rigoroso e objetivo. Responda em português do Brasil, só com JSON válido.";
  const chamar = (p) => (p === "gemini" ? geminiJson({ sistema, prompt }) : openaiJson({ sistema, prompt, modelo: process.env.MODELO_REVISOR || "gpt-4o" }));

  let provedor = primeiro;
  let r = await chamar(provedor);
  // reserva: se o primeiro falhar (fora do ar, cota, chave), tenta o outro — exceto quando o admin escolheu um para comparar
  const outro = provedor === "gemini" ? "openai" : "gemini";
  if (!r.ok && !pedido && (outro === "gemini" ? temGemini() : temOpenAI())) {
    console.error(`Revisor ${provedor} falhou (${r.status}): ${r.erro}. Tentando ${outro}.`);
    provedor = outro;
    r = await chamar(provedor);
  }
  if (!r.ok) {
    console.error(`Erro no revisor (${provedor}):`, r.status, r.erro);
    const msg = /ausente/.test(r.erro || "") ? `Chave do ${provedor === "gemini" ? "Gemini" : "OpenAI"} não configurada na Vercel.` : r.status === 429 ? "IA ocupada. Tente em instantes." : "Falha ao revisar o conteúdo.";
    return NextResponse.json({ error: msg, ...(ehAdmin(usuario.email) ? { detalhe: { provedor, status: r.status, erro: String(r.erro || "").slice(0, 300) } } : {}) }, { status: 502 });
  }
  return NextResponse.json({ apontamentos: normalizarApontamentos(r.json, exercicios), provedor });
}

// request_id em cada pedido (cabeçalho x-request-id + registro); a resposta não muda
export const POST = comRequestId("/api/revisar-conteudo", postRota);
