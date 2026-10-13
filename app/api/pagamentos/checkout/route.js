import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { bancoLigado } from "@/lib/banco";
import { configPagamentos, clienteMercadoPago } from "@/lib/pagamentos";
import { iniciarCheckout } from "@/lib/cobranca";

// POST { plano: "pro_mensal" | "pro_anual", emailPagador? } → { url } do Mercado Pago.
// Só funciona onde configPagamentos permite (teste: token TEST; produção: PAGAMENTOS_PRODUCAO=1).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function postRota(request) {
  const cfg = configPagamentos();
  if (!cfg.ok) return NextResponse.json({ error: cfg.motivo }, { status: 403 });
  if (!bancoLigado()) return NextResponse.json({ error: "Assinatura indisponível no momento." }, { status: 503 });
  const u = authConfigurado ? await usuarioAtual() : null;
  if (!u) return NextResponse.json({ error: "Entre com sua conta para assinar." }, { status: 401 });
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const r = await iniciarCheckout({
    email: u.email,
    plano: body?.plano,
    emailPagador: body?.emailPagador || u.email,
    origem: new URL(request.url).origin,
    cliente: clienteMercadoPago(cfg.token),
  });
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: r.status });
  return NextResponse.json({ url: r.url });
}

export const POST = comRequestId("/api/pagamentos/checkout", postRota);
