import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import bnccDados from "@/data/bncc-habilidades.json";
import { indexar, resolverCodigo } from "@/lib/bncc";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consumirGeracao, devolverGeracao } from "@/lib/uso";
import { openaiJson, geminiJson, temGemini, temOpenAI } from "@/lib/provedoresIA";
import { validarPedidoPlano, montarPromptPlano, normalizarPlano, problemasDoPlano } from "@/lib/planoAula";

// Plano de aula (estrutura do Currículo Paulista). Conta como UMA geração do plano do professor.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

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
  const v = validarPedidoPlano(body);
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

  const oficial = d.bncc ? resolverCodigo(BNCC, d.bncc) : null;
  const prompt = montarPromptPlano(d, oficial ? `${oficial.c} — ${oficial.t} (texto oficial)` : "");
  let r = temOpenAI() ? await openaiJson({ sistema: SISTEMA, prompt, modelo: process.env.MODELO_TEXTO || "gpt-4o", temperatura: 0.4 }) : { ok: false };
  if (!r.ok && temGemini()) r = await geminiJson({ sistema: SISTEMA, prompt, temperatura: 0.4 });
  if (!r.ok) {
    await devolverGeracao(usuario.email, requestId); // erro nosso: o professor não perde a geração
    console.error("Plano de aula: IA falhou", r.status, r.erro);
    return NextResponse.json({ error: "Não foi possível gerar o plano agora. Tente de novo em instantes." }, { status: 502 });
  }
  const plano = normalizarPlano(r.json, d, oficial);
  const problemas = problemasDoPlano(plano, d);
  if (!plano.aulas.length || !plano.objetivos.length) {
    await devolverGeracao(usuario.email, requestId);
    return NextResponse.json({ error: "A IA devolveu um plano incompleto. Tente gerar de novo." }, { status: 502 });
  }
  return NextResponse.json({ plano, avisos: problemas, uso: { usados: uso.usados, limite: uso.limite, restantes: uso.restantes } });
}

export const POST = comRequestId("/api/gerar-plano", postRota);
