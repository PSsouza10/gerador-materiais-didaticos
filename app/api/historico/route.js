import { NextResponse } from "next/server";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { lerHistorico, sincronizarHistorico, LIMITE_ITENS } from "@/lib/historico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

async function conta() {
  if (!authConfigurado || !process.env.BLOB_READ_WRITE_TOKEN) return null;
  return usuarioAtual();
}

// Lista "Minhas Apostilas" da conta
export async function GET() {
  const u = await conta();
  if (!u) return NextResponse.json({ error: "Entre com sua conta." }, { status: 401 });
  try {
    return NextResponse.json({ itens: await lerHistorico(u.email) });
  } catch (e) {
    console.error("Erro ao ler histórico:", e);
    return NextResponse.json({ error: "Não foi possível ler o histórico." }, { status: 500 });
  }
}

// { itens?: [...], removidos?: [id] } → junta com o que já está na conta e devolve a lista
export async function POST(request) {
  const u = await conta();
  if (!u) return NextResponse.json({ error: "Entre com sua conta." }, { status: 401 });
  try {
    const bruto = await request.text();
    if (bruto.length > 200_000) return NextResponse.json({ error: "Lista grande demais." }, { status: 413 });
    const { itens = [], removidos = [] } = JSON.parse(bruto || "{}");
    if (!Array.isArray(itens) || !Array.isArray(removidos)) return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
    const lista = await sincronizarHistorico(u.email, itens.slice(0, LIMITE_ITENS), removidos.filter((r) => typeof r === "string").slice(0, LIMITE_ITENS));
    return NextResponse.json({ itens: lista });
  } catch (e) {
    console.error("Erro ao sincronizar histórico:", e);
    return NextResponse.json({ error: "Não foi possível sincronizar o histórico." }, { status: 500 });
  }
}
