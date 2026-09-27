import { NextResponse } from "next/server";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consultarUso } from "@/lib/uso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Estado do login e das gerações restantes, para a interface
export async function GET() {
  if (!authConfigurado) return NextResponse.json({ authConfigurado: false, usuario: null });
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ authConfigurado: true, usuario: null });
  let uso = null;
  try {
    uso = await consultarUso(usuario.email);
  } catch (e) {
    console.error("Erro ao consultar uso:", e);
  }
  return NextResponse.json({ authConfigurado: true, usuario, uso });
}
