import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { bancoLigado } from "@/lib/banco";
import { lerRedacao, apagarRedacao } from "@/lib/redacoesBanco";

// Uma redação do histórico: ver (GET) e apagar (DELETE). Só a própria conta.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const semCache = { "Cache-Control": "no-store" };

async function conta() {
  if (!authConfigurado || !bancoLigado()) return { erro: NextResponse.json({ error: "Histórico indisponível." }, { status: 503, headers: semCache }) };
  const usuario = await usuarioAtual();
  if (!usuario) return { erro: NextResponse.json({ error: "Entre com sua conta." }, { status: 401, headers: semCache }) };
  return { usuario };
}

async function getRota(_request, { params }) {
  const { usuario, erro } = await conta();
  if (erro) return erro;
  const r = await lerRedacao(usuario.email, params.id);
  if (!r) return NextResponse.json({ error: "Redação não encontrada." }, { status: 404, headers: semCache });
  return NextResponse.json(r, { headers: semCache });
}

async function deleteRota(_request, { params }) {
  const { usuario, erro } = await conta();
  if (erro) return erro;
  const ok = await apagarRedacao(usuario.email, params.id);
  if (!ok) return NextResponse.json({ error: "Redação não encontrada." }, { status: 404, headers: semCache });
  return NextResponse.json({ ok: true }, { headers: semCache });
}

export const GET = comRequestId("/api/redacao/[id]", getRota);
export const DELETE = comRequestId("/api/redacao/[id]", deleteRota);
