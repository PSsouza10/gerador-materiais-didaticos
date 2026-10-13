import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { bancoLigado } from "@/lib/banco";
import { configPagamentos, clienteAsaas } from "@/lib/pagamentos";
import { cancelarAssinaturaPaga } from "@/lib/cobranca";

// POST → cancela a assinatura mensal no Asaas (para de cobrar; vale até o fim do mês pago)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function postRota() {
  const cfg = configPagamentos();
  if (!cfg.ok) return NextResponse.json({ error: cfg.motivo }, { status: 403 });
  if (!bancoLigado()) return NextResponse.json({ error: "Indisponível no momento." }, { status: 503 });
  const u = authConfigurado ? await usuarioAtual() : null;
  if (!u) return NextResponse.json({ error: "Entre com sua conta." }, { status: 401 });
  try {
    const r = await cancelarAssinaturaPaga(u.email, clienteAsaas(cfg));
    if (!r.ok) return NextResponse.json({ error: r.erro }, { status: r.status });
    return NextResponse.json(r);
  } catch (e) {
    console.error("Cancelamento falhou:", e?.status, e?.message);
    return NextResponse.json({ error: "Não foi possível cancelar agora. Tente de novo ou fale com o suporte." }, { status: 502 });
  }
}

export const POST = comRequestId("/api/pagamentos/cancelar", postRota);
