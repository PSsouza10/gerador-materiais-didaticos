import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { bancoLigado } from "@/lib/banco";
import { validarGlifos } from "@/lib/letraProfessor";
import { lerLetra, salvarLetra, apagarLetra } from "@/lib/letraBanco";
import { temConstrutorRedacao } from "@/lib/uso";

// "Minha letra" da conta: ler (GET), salvar (PUT) e apagar (DELETE). Só a própria conta.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const semCache = { "Cache-Control": "no-store" };

async function conta() {
  if (!authConfigurado || !bancoLigado()) return { erro: NextResponse.json({ error: "Indisponível neste ambiente." }, { status: 503, headers: semCache }) };
  const usuario = await usuarioAtual();
  if (!usuario) return { erro: NextResponse.json({ error: "Entre com sua conta." }, { status: 401, headers: semCache }) };
  return { usuario };
}

async function getRota() {
  const { usuario, erro } = await conta();
  if (erro) return erro;
  return NextResponse.json({ glifos: await lerLetra(usuario.email) }, { headers: semCache });
}

async function putRota(request) {
  const { usuario, erro } = await conta();
  if (erro) return erro;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400, headers: semCache });
  }
  if (!(await temConstrutorRedacao(usuario.email))) return NextResponse.json({ error: "Minha letra é do plano Pro.", motivo: "recurso_pro" }, { status: 403, headers: semCache });
  const v = validarGlifos(body?.glifos);
  if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400, headers: semCache });
  await salvarLetra(usuario.email, v.glifos);
  return NextResponse.json({ ok: true, letras: Object.keys(v.glifos).length }, { headers: semCache });
}

async function deleteRota() {
  const { usuario, erro } = await conta();
  if (erro) return erro;
  await apagarLetra(usuario.email);
  return NextResponse.json({ ok: true }, { headers: semCache });
}

export const GET = comRequestId("/api/redacao/letra", getRota);
export const PUT = comRequestId("/api/redacao/letra", putRota);
export const DELETE = comRequestId("/api/redacao/letra", deleteRota);
