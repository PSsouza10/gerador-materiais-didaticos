import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { ehAdmin, zerarUsoTeste } from "@/lib/uso";
import { ehProducao } from "@/lib/ambiente";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SÓ NO SITE DE TESTE: o administrador zera as próprias gerações do mês para testar de novo.
// Na produção esta rota não existe (404).
async function postRota() {
  if (ehProducao()) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  if (!authConfigurado) return NextResponse.json({ error: "Login não configurado." }, { status: 503 });
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ error: "Entre com sua conta." }, { status: 401 });
  if (!ehAdmin(usuario.email)) return NextResponse.json({ error: "Só administradores podem zerar o uso." }, { status: 403 });
  try {
    const r = await zerarUsoTeste(usuario.email);
    return NextResponse.json({ ok: true, apagados: r.apagados, uso: r.uso });
  } catch (e) {
    console.error("Zerar uso:", e);
    return NextResponse.json({ error: "Não foi possível zerar agora." }, { status: 500 });
  }
}

export const POST = comRequestId("/api/uso/zerar", postRota);
