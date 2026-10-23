import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consultarUso } from "@/lib/uso";
import { ehProducao } from "@/lib/ambiente";
import { bancoLigado } from "@/lib/banco";
import { ehCoordenador } from "@/lib/cadernos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Estado do login e das gerações restantes, para a interface
async function getRota() {
  if (!authConfigurado) return NextResponse.json({ authConfigurado: false, usuario: null });
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ authConfigurado: true, usuario: null });
  let uso = null;
  try {
    uso = await consultarUso(usuario.email);
  } catch (e) {
    console.error("Erro ao consultar uso:", e);
  }
  // coordenador do piloto (Ciclo de Recomposição): pode distribuir cadernos
  const coordenador = bancoLigado() ? await ehCoordenador(usuario.email).catch(() => false) : false;
  // o e-mail não volta para o navegador (ele não precisa dele)
  // zerarTeste: o botão "Zerar minhas gerações" (só administrador, só no site de teste)
  return NextResponse.json({ authConfigurado: true, usuario: { nome: usuario.nome }, uso, coordenador, zerarTeste: !ehProducao() && !!uso?.admin });
}

// request_id em cada pedido (cabeçalho x-request-id + registro); a resposta não muda
export const GET = comRequestId("/api/uso", getRota);
