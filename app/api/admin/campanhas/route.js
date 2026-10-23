import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { exigirAdmin, semCache } from "@/lib/admin";
import { bancoLigado } from "@/lib/banco";
import { criarCampanha, listarCampanhas, definirAtiva } from "@/lib/campanhas";

// Campanhas de dias grátis (só administrador): criar, listar e encerrar/reabrir.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getRota() {
  const { erro } = await exigirAdmin();
  if (erro) return erro;
  if (!bancoLigado()) return NextResponse.json({ campanhas: [] }, { headers: semCache });
  return NextResponse.json({ campanhas: await listarCampanhas() }, { headers: semCache });
}

async function postRota(request) {
  const { erro } = await exigirAdmin();
  if (erro) return erro;
  if (!bancoLigado()) return NextResponse.json({ error: "Banco desligado neste ambiente." }, { status: 503, headers: semCache });
  let b;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400, headers: semCache });
  }
  if (b.acao === "ativa") {
    await definirAtiva(b.codigo, b.ativa);
    return NextResponse.json({ ok: true, campanhas: await listarCampanhas() }, { headers: semCache });
  }
  const r = await criarCampanha(b);
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 400, headers: semCache });
  return NextResponse.json({ ok: true, codigo: r.codigo, campanhas: await listarCampanhas() }, { headers: semCache });
}

export const GET = comRequestId("/api/admin/campanhas", getRota);
export const POST = comRequestId("/api/admin/campanhas", postRota);
