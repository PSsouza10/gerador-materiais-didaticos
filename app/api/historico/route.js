import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { lerHistorico, sincronizarHistorico, LIMITE_ITENS } from "@/lib/historico";
import { bancoLigado } from "@/lib/banco";
import { listarMateriais, sincronizarMateriais } from "@/lib/contas";
import { garantirImportacao } from "@/lib/importacao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

async function conta() {
  if (!authConfigurado || !process.env.BLOB_READ_WRITE_TOKEN) return null;
  return usuarioAtual();
}

// Lista "Minhas Apostilas" da conta
async function getRota() {
  const u = await conta();
  if (!u) return NextResponse.json({ error: "Entre com sua conta." }, { status: 401 });
  try {
    if (bancoLigado()) {
      await garantirImportacao(u.email);
      return NextResponse.json({ itens: await listarMateriais(u.email) });
    }
    return NextResponse.json({ itens: await lerHistorico(u.email) });
  } catch (e) {
    console.error("Erro ao ler histórico:", e);
    return NextResponse.json({ error: "Não foi possível ler o histórico." }, { status: 500 });
  }
}

// { itens?: [...], removidos?: [id] } → junta com o que já está na conta e devolve a lista
async function postRota(request) {
  const u = await conta();
  if (!u) return NextResponse.json({ error: "Entre com sua conta." }, { status: 401 });
  try {
    const bruto = await request.text();
    if (bruto.length > 200_000) return NextResponse.json({ error: "Lista grande demais." }, { status: 413 });
    const { itens = [], removidos = [] } = JSON.parse(bruto || "{}");
    if (!Array.isArray(itens) || !Array.isArray(removidos)) return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
    const sincronizar = bancoLigado() ? sincronizarMateriais : sincronizarHistorico;
    if (bancoLigado()) await garantirImportacao(u.email);
    const limpos = itens.slice(0, LIMITE_ITENS);
    const fora = removidos.filter((r) => typeof r === "string").slice(0, LIMITE_ITENS);
    const lista = await sincronizar(u.email, limpos, fora);
    // Dupla gravação (Parte B): a lista também vai para o arquivo do Blob (rollback sem perda)
    if (bancoLigado()) await sincronizarHistorico(u.email, lista, fora).catch((e) => console.error("Espelho da lista no Blob falhou:", e?.message || e));
    return NextResponse.json({ itens: lista });
  } catch (e) {
    console.error("Erro ao sincronizar histórico:", e);
    return NextResponse.json({ error: "Não foi possível sincronizar o histórico." }, { status: 500 });
  }
}

// request_id em cada pedido (cabeçalho x-request-id + registro); a resposta não muda
export const GET = comRequestId("/api/historico", getRota);
export const POST = comRequestId("/api/historico", postRota);
