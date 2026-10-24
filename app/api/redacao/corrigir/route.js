import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consumirRedacao, devolverRedacao, planoDaConta, ehAdmin, temConstrutorRedacao } from "@/lib/uso";
import { geminiJson, openaiJson, temGemini, temOpenAI, iaRealRedacao } from "@/lib/provedoresIA";
import { bancoLigado } from "@/lib/banco";
import { ehProducao } from "@/lib/ambiente";
import { salvarRedacao } from "@/lib/redacoesBanco";
import { tokenFotoConfere } from "@/lib/redacaoFotoToken";
import { validarPedidoRedacao, passaDoLimiteGratis, MENSAGEM_LAUDAS, sistemaRedacao, montarPromptRedacao, normalizarRespostaRedacao } from "@/lib/redacao";

// Correção de redação digitada (docs/specs/redacao.md, seção 4).
// Grátis: 1 por mês e até 2 laudas; Pro: uso justo. Gemini (JSON, temperatura 0,2);
// resposta validada com Zod, 1 nova tentativa e, se falhar, erro amigável (uso devolvido).
// Privacidade: o texto do aluno NUNCA vai para log (só status e mensagens curtas).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Gemini primeiro; se ele falhar (sem crédito, fora do ar), tenta a OpenAI
async function pedirIA(sistema, prompt) {
  const forcarReal = iaRealRedacao();
  const g = temGemini() ? await geminiJson({ sistema, prompt, temperatura: 0.2, forcarReal }) : { ok: false, status: 0, erro: "Gemini ausente" };
  if (g.ok || !temOpenAI()) return g;
  const o = await openaiJson({ sistema, prompt, modelo: process.env.MODELO_TEXTO || "gpt-4o", temperatura: 0.2, forcarReal });
  return o.ok ? o : { ...o, erro: `Gemini ${g.status}; OpenAI ${o.status}: ${String(o.erro || "").slice(0, 120)}` };
}

async function postRota(request, _contexto, requestId) {
  if (!temGemini() && !temOpenAI()) return NextResponse.json({ error: "IA não configurada." }, { status: 500 });
  if (!authConfigurado) return NextResponse.json({ error: "Login não configurado." }, { status: 503 });
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ error: "Entre com sua conta para corrigir redações." }, { status: 401 });
  if (!(await temConstrutorRedacao(usuario.email))) return NextResponse.json({ error: "A Redação é do plano Pro. Veja em /planos.", motivo: "recurso_pro" }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const v = validarPedidoRedacao(body);
  if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 });
  const d = v.dados;

  const { plano } = await planoDaConta(usuario.email);
  if (plano.id === "gratis" && !ehAdmin(usuario.email) && passaDoLimiteGratis(d.texto))
    return NextResponse.json({ error: MENSAGEM_LAUDAS, motivo: "recurso_pro" }, { status: 403 });

  // texto lido da foto: o uso já foi gasto na leitura (/api/redacao/ler-foto)
  const daFoto = tokenFotoConfere(body.token, usuario.email, body.lidaEm);
  let uso = { ok: true };
  try {
    if (!daFoto) uso = await consumirRedacao(usuario.email, requestId);
  } catch (e) {
    console.error("Redação: erro ao registrar uso:", e?.message || e);
    return NextResponse.json({ error: "Não foi possível verificar seu limite agora. Tente de novo." }, { status: 503 });
  }
  if (!uso.ok && uso.mensagem) return NextResponse.json({ error: uso.mensagem, motivo: uso.motivo, limiteAtingido: true }, { status: 429 });
  if (!uso.ok) {
    const n = uso.limite === 1 ? "a correção de redação" : `as ${uso.limite} correções de redação`;
    return NextResponse.json({ error: `Você já usou ${n} deste mês do plano ${uso.plano}. O limite renova no dia 1º. Para corrigir mais, assine o Pro em /planos.`, motivo: "mes", limiteAtingido: true }, { status: 429 });
  }

  const sistema = sistemaRedacao(d.perfil, d.genero);
  const prompt = montarPromptRedacao(d);
  let final = null;
  let motivo = "";
  for (let tentativa = 0; tentativa < 2 && !final; tentativa++) {
    const r = await pedirIA(sistema, prompt);
    if (!r.ok) {
      motivo = `IA ${r.status || "sem resposta"}${r.modelo ? ` (${r.modelo})` : ""}: ${String(r.erro || "").slice(0, 160)}`;
      console.error("Redação: IA falhou", { tentativa, status: r.status, modelo: r.modelo });
      continue;
    }
    const n = normalizarRespostaRedacao(r.json, d);
    if (n.ok) final = n.resultado;
    else {
      motivo = `esquema: ${n.erro.slice(0, 200)}`;
      console.error("Redação: resposta fora do esquema", { tentativa, erro: n.erro.slice(0, 200) });
    }
  }
  if (!final) {
    if (!daFoto) await devolverRedacao(usuario.email, requestId);
    // no site de teste, mostra o motivo técnico (sem o texto do aluno) para achar o problema
    const detalhe = ehProducao() ? "" : ` [teste: ${motivo}]`;
    return NextResponse.json({ error: `A correção não saiu desta vez. Tente de novo em instantes (não contou no seu limite).${detalhe}` }, { status: 502 });
  }

  let id = null;
  if (bancoLigado()) {
    try {
      id = await salvarRedacao(usuario.email, { tema: d.tema, texto: d.texto, perfil: d.perfil, genero: d.genero, resultado: final });
    } catch (e) {
      console.error("Redação: não foi possível salvar no histórico:", e?.message || e);
    }
  }
  return NextResponse.json({ id, resultado: final });
}

export const POST = comRequestId("/api/redacao/corrigir", postRota);
