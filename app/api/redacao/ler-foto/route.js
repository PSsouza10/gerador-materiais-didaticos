import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consumirRedacao, devolverRedacao, planoDaConta, ehAdmin } from "@/lib/uso";
import { geminiJson, openaiJson, temGemini, temOpenAI } from "@/lib/provedoresIA";
import { SISTEMA_TRANSCRICAO, montarPromptTranscricao, normalizarTranscricao, MAX_FOTOS, MAX_BYTES_FOTO } from "@/lib/redacaoFoto";
import { tokenFoto, tokenFotoConfere } from "@/lib/redacaoFotoToken";

// Lê UMA página (foto) da redação manuscrita: texto linha a linha + caixa de cada linha.
// A 1ª página gasta o uso do mês (Grátis: 1 correção, até 2 páginas); as seguintes e a correção
// do texto confirmado vêm com o token e não gastam de novo. A foto não é guardada.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function postRota(request, _contexto, requestId) {
  if (!temGemini() && !temOpenAI()) return NextResponse.json({ error: "IA não configurada." }, { status: 500 });
  if (!authConfigurado) return NextResponse.json({ error: "Login não configurado." }, { status: 503 });
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ error: "Entre com sua conta." }, { status: 401 });
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Foto grande demais ou pedido inválido." }, { status: 400 });
  }
  const mime = ["image/jpeg", "image/png", "image/webp"].includes(body?.foto?.mime) ? body.foto.mime : null;
  const base64 = typeof body?.foto?.base64 === "string" ? body.foto.base64 : "";
  if (!mime || !base64 || (base64.length * 3) / 4 > MAX_BYTES_FOTO) return NextResponse.json({ error: "Envie uma foto JPG ou PNG de até 4 MB." }, { status: 400 });
  const pagina = Number.isInteger(body.pagina) ? body.pagina : 0;

  const { plano } = await planoDaConta(usuario.email);
  const maxFotos = plano.id === "gratis" && !ehAdmin(usuario.email) ? MAX_FOTOS.gratis : MAX_FOTOS.pro;
  if (pagina < 0 || pagina >= maxFotos)
    return NextResponse.json({ error: `Seu plano corrige até ${maxFotos} páginas por redação.${maxFotos === MAX_FOTOS.gratis ? " Para mais, assine o Pro em /planos." : ""}`, motivo: "recurso_pro" }, { status: 403 });

  let lidaEm = body.lidaEm;
  let token = body.token;
  const continuacao = pagina > 0 || tokenFotoConfere(token, usuario.email, lidaEm);
  if (pagina > 0 && !tokenFotoConfere(token, usuario.email, lidaEm)) return NextResponse.json({ error: "A leitura expirou. Comece de novo pela 1ª página." }, { status: 400 });
  if (!continuacao) {
    let uso;
    try {
      uso = await consumirRedacao(usuario.email, requestId);
    } catch (e) {
      console.error("Redação (foto): erro ao registrar uso:", e?.message || e);
      return NextResponse.json({ error: "Não foi possível verificar seu limite agora. Tente de novo." }, { status: 503 });
    }
    if (!uso.ok && uso.mensagem) return NextResponse.json({ error: uso.mensagem, motivo: uso.motivo, limiteAtingido: true }, { status: 429 });
    if (!uso.ok)
      return NextResponse.json({ error: `Você já usou a correção de redação deste mês do plano ${uso.plano}. O limite renova no dia 1º. Para corrigir mais, assine o Pro em /planos.`, motivo: "mes", limiteAtingido: true }, { status: 429 });
    lidaEm = new Date().toISOString();
    token = tokenFoto(usuario.email, lidaEm);
  }

  const pedido = { sistema: SISTEMA_TRANSCRICAO, prompt: montarPromptTranscricao(), temperatura: 0, arquivo: { base64, mime } };
  let r = temGemini() ? await geminiJson(pedido) : { ok: false };
  if (!r.ok && temOpenAI()) r = await openaiJson({ ...pedido, modelo: process.env.MODELO_TEXTO || "gpt-4o" });
  const t = r.ok ? normalizarTranscricao(r.json) : { ok: false, erro: "A leitura da foto falhou. Tente de novo em instantes." };
  if (!t.ok) {
    if (!continuacao) await devolverRedacao(usuario.email, requestId);
    console.error("Redação (foto): leitura falhou", { status: r.status });
    return NextResponse.json({ error: `${t.erro}${continuacao ? "" : " (Não contou no seu limite.)"}` }, { status: 422 });
  }
  return NextResponse.json({ linhas: t.linhas, lidaEm, token });
}

export const POST = comRequestId("/api/redacao/ler-foto", postRota);
