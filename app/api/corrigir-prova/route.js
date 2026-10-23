import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consumirCorrecaoProva, devolverCorrecaoProva, temCorrecaoPro } from "@/lib/uso";
import { geminiJson, openaiJson, temGemini, temOpenAI } from "@/lib/provedoresIA";
import { validarPedidoCorrecaoProva, montarPromptCorrecaoProva, normalizarCorrecaoProva, avisosDaCorrecao, PDF_MAX_BYTES } from "@/lib/correcaoProva";
import { montarPromptRedacao, normalizarRedacao, contarPaginasPdf, passaDoGratis, MENSAGEM_LAUDAS } from "@/lib/correcaoRedacao";

// Correção de UMA prova feita pelo aluno: o professor envia as páginas (fotos juntadas em PDF
// no navegador, ou um PDF) e, se quiser, o gabarito. O arquivo não é guardado.
// Limite mensal próprio (Grátis: 1 por mês), devolvido se a falha for nossa ou a folha ilegível.
// Modo redação (tipo "redacao"): Grátis só até 1 lauda; 2 ou mais laudas pedem o Pro.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SISTEMA = "Você é professor experiente e corrige provas escritas à mão com atenção e justiça, a partir de fotos. Responda em português do Brasil, só com JSON válido.";

async function postRota(request, _ctx, requestId) {
  if (!temGemini() && !temOpenAI()) return NextResponse.json({ error: "IA não configurada." }, { status: 500 });
  if (!authConfigurado) return NextResponse.json({ error: "Login não configurado." }, { status: 503 });
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ error: "Entre com sua conta para corrigir provas." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido (arquivo grande demais?)." }, { status: 400 });
  }
  const v = validarPedidoCorrecaoProva(body);
  if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 });
  const b64 = typeof body.pdf === "string" ? body.pdf.replace(/^data:[^,]*,/, "") : "";
  if (!b64 || (b64.length * 3) / 4 > PDF_MAX_BYTES) return NextResponse.json({ error: "Envie a prova com até 3 MB (fotos menores ou menos páginas)." }, { status: 400 });
  const bytes = Buffer.from(b64, "base64");
  if (!bytes.subarray(0, 5).toString("latin1").startsWith("%PDF")) return NextResponse.json({ error: "O arquivo da prova não é válido." }, { status: 400 });
  const d = v.dados;
  const redacao = d.tipo === "redacao";
  const pro = redacao ? await temCorrecaoPro(usuario.email).catch(() => false) : true;
  if (redacao && !pro && passaDoGratis(contarPaginasPdf(bytes))) return NextResponse.json({ error: MENSAGEM_LAUDAS, motivo: "recurso_pro" }, { status: 403 });

  let uso;
  try {
    uso = await consumirCorrecaoProva(usuario.email, requestId);
  } catch (e) {
    console.error("Erro ao registrar uso (correção de prova):", e);
    return NextResponse.json({ error: "Não foi possível verificar seu limite agora. Tente de novo." }, { status: 503 });
  }
  if (!uso.ok && uso.mensagem) return NextResponse.json({ error: uso.mensagem, motivo: uso.motivo, limiteAtingido: true }, { status: 429 });
  if (!uso.ok) {
    const n = uso.limite === 1 ? "a correção de prova" : `as ${uso.limite} correções de prova`;
    return NextResponse.json({ error: `Você já usou ${n} deste mês do plano ${uso.plano}. O limite renova no dia 1º. Veja os planos em /planos.`, motivo: "mes", limiteAtingido: true }, { status: 429 });
  }

  const pedido = { sistema: SISTEMA, prompt: redacao ? montarPromptRedacao(d) : montarPromptCorrecaoProva(d), temperatura: 0.1, arquivo: { base64: b64, mime: "application/pdf", nome: "prova.pdf" } };
  // leitura de letra à mão: mesma ordem da foto do cartão (Gemini, reserva OpenAI)
  let r = temGemini() ? await geminiJson(pedido) : { ok: false, status: 0, erro: "sem Gemini" };
  if (!r.ok && temOpenAI()) {
    console.error("Corrigir prova: Gemini falhou, tentando a OpenAI", { request_id: requestId, status: r.status, erro: r.erro });
    r = await openaiJson({ ...pedido, modelo: process.env.MODELO_TEXTO || "gpt-4o" });
  }
  if (!r.ok) {
    console.error("Corrigir prova: falhou", { request_id: requestId, status: r.status, erro: r.erro });
    await devolverCorrecaoProva(usuario.email, requestId);
    return NextResponse.json({ error: "Não foi possível corrigir agora. Tente de novo (não contou no seu limite)." }, { status: 502 });
  }
  const correcao = redacao ? normalizarRedacao(r.json, d) : normalizarCorrecaoProva(r.json, d);
  // a contagem do arquivo pode falhar (PDF diferente): a IA também diz quantas páginas leu
  if (redacao && !pro && passaDoGratis(correcao.paginasLidas)) {
    await devolverCorrecaoProva(usuario.email, requestId);
    return NextResponse.json({ error: MENSAGEM_LAUDAS, motivo: "recurso_pro" }, { status: 403 });
  }
  if (!correcao.legivel) {
    await devolverCorrecaoProva(usuario.email, requestId);
    return NextResponse.json({ error: "Não consegui ler a prova nessas fotos. Tire de novo, de cima, com a folha inteira e boa luz (não contou no seu limite)." }, { status: 422 });
  }
  return NextResponse.json({ correcao, avisos: redacao ? [] : avisosDaCorrecao(correcao) });
}

export const POST = comRequestId("/api/corrigir-prova", postRota);
