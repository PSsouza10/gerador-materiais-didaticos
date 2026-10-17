import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { ehAdmin } from "@/lib/uso";
import { ehProducao } from "@/lib/ambiente";
import { bancoLigado } from "@/lib/banco";
import { encerrarCobrancasTeste } from "@/lib/contas";

// SÓ NO SITE DE TESTE: o administrador volta uma conta de teste para o Grátis
// (encerra hoje o Pro pago dela) para repetir um teste de compra. Na produção: 404.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function postRota(request) {
  if (ehProducao()) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  if (!authConfigurado || !bancoLigado()) return NextResponse.json({ error: "Banco de teste desligado." }, { status: 503 });
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ error: "Entre com sua conta." }, { status: 401 });
  if (!ehAdmin(usuario.email)) return NextResponse.json({ error: "Só administradores." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  const encerradas = await encerrarCobrancasTeste(email);
  return NextResponse.json({ ok: true, encerradas });
}

export const POST = comRequestId("/api/pagamentos/zerar-teste", postRota);
