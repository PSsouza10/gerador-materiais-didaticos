import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { bancoLigado } from "@/lib/banco";
import { configPagamentos, clienteMercadoPago, lerAviso, assinaturaWebhookConfere } from "@/lib/pagamentos";
import { processarAviso } from "@/lib/cobranca";

// Avisos do Mercado Pago (assinatura e pagamento). Sem login: quem chama é o Mercado Pago.
// Segurança: confere a assinatura do aviso (MP_WEBHOOK_SECRET) e, sobretudo, RELÊ o
// recurso na API com o nosso token — o corpo recebido não ativa nada sozinho.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function postRota(request, _ctx, requestId) {
  const cfg = configPagamentos();
  if (!cfg.ok || !bancoLigado()) return NextResponse.json({ ok: true, ignorado: true }); // 200: o MP não fica repetindo
  let corpo = {};
  try {
    corpo = await request.json();
  } catch {
    /* alguns avisos vêm só na URL */
  }
  const aviso = lerAviso(request.url, corpo);
  const ok = assinaturaWebhookConfere({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId: aviso?.id || new URL(request.url).searchParams.get("data.id"),
    segredo: cfg.segredo,
  });
  if (!ok) return NextResponse.json({ error: "Assinatura do aviso inválida." }, { status: 401 });
  try {
    const r = await processarAviso(aviso, clienteMercadoPago(cfg.token));
    console.log(JSON.stringify({ app: "edugera", evento: "pagamento_aviso", request_id: requestId, recurso: aviso?.recurso || null, feito: r.feito, status: r.status || null }));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Aviso de pagamento falhou:", e?.status, e?.message);
    return NextResponse.json({ error: "Tente de novo." }, { status: 500 }); // 500: o MP reenvia depois
  }
}

export const POST = comRequestId("/api/pagamentos/webhook", postRota);
