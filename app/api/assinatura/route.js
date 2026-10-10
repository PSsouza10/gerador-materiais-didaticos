import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { bancoLigado } from "@/lib/banco";
import { simulacaoAssinatura } from "@/lib/ambiente";
import { ativarAssinatura, cancelarAssinatura, PLANOS_ASSINAVEIS } from "@/lib/contas";
import { consultarUso } from "@/lib/uso";

// Estrutura de assinatura SEM cobrança real.
//   GET    → plano atual e se a simulação está disponível
//   POST   → { plano: "pro_mensal" | "pro_anual" } ativa o plano SIMULADO (só fora da produção)
//   DELETE → volta para o Grátis (só fora da produção)
// Não existe checkout, pagamento nem webhook: nada aqui cobra ninguém.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const indisponivel = () =>
  NextResponse.json({ error: "A assinatura ainda não está disponível. Nenhuma cobrança é feita." }, { status: 403 });
const podeSimular = () => simulacaoAssinatura() && bancoLigado();

async function conta() {
  return authConfigurado ? usuarioAtual() : null;
}

async function getRota() {
  const u = await conta();
  if (!u) return NextResponse.json({ error: "Entre com sua conta." }, { status: 401 });
  const uso = await consultarUso(u.email);
  return NextResponse.json({ plano: uso.plano, assinatura: uso.assinatura, simulacao: podeSimular(), cobranca: false });
}

async function postRota(request) {
  const u = await conta();
  if (!u) return NextResponse.json({ error: "Entre com sua conta." }, { status: 401 });
  if (!podeSimular()) return indisponivel();
  let plano;
  try {
    ({ plano } = await request.json());
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (!PLANOS_ASSINAVEIS.includes(plano)) return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  const assinatura = await ativarAssinatura(u.email, plano, "simulada");
  return NextResponse.json({ ok: true, assinatura, cobranca: false });
}

async function deleteRota() {
  const u = await conta();
  if (!u) return NextResponse.json({ error: "Entre com sua conta." }, { status: 401 });
  if (!podeSimular()) return indisponivel();
  return NextResponse.json({ ...(await cancelarAssinatura(u.email)), cobranca: false });
}

export const GET = comRequestId("/api/assinatura", getRota);
export const POST = comRequestId("/api/assinatura", postRota);
export const DELETE = comRequestId("/api/assinatura", deleteRota);
