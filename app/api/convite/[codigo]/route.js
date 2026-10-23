import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { bancoLigado } from "@/lib/banco";
import { lerCampanha, situacao, resgatar } from "@/lib/campanhas";

// Link de campanha: GET mostra se ainda vale (público); POST ativa os dias de Pro na conta logada.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const semCache = { "Cache-Control": "no-store" };

async function getRota(_request, { params }) {
  if (!bancoLigado()) return NextResponse.json({ valida: false, motivo: "Indisponível neste ambiente." }, { status: 503, headers: semCache });
  const c = await lerCampanha(params.codigo);
  const s = situacao(c);
  const usuario = authConfigurado ? await usuarioAtual() : null;
  return NextResponse.json({ ...s, dias: c?.dias || null, fim: c?.fim || null, logado: !!usuario }, { headers: semCache });
}

async function postRota(_request, { params }) {
  if (!bancoLigado() || !authConfigurado) return NextResponse.json({ error: "Indisponível neste ambiente." }, { status: 503, headers: semCache });
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ error: "Entre com sua conta Google para ativar." }, { status: 401, headers: semCache });
  const r = await resgatar(usuario.email, params.codigo);
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 409, headers: semCache });
  return NextResponse.json(r, { headers: semCache });
}

export const GET = comRequestId("/api/convite/[codigo]", getRota);
export const POST = comRequestId("/api/convite/[codigo]", postRota);
