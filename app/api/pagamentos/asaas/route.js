import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { bancoLigado, registrarEvento } from "@/lib/banco";
import { ehProducao } from "@/lib/ambiente";
import { configAsaas, clienteAsaas, lerAvisoAsaas, tokenWebhookConfere } from "@/lib/asaas";
import { processarAvisoAsaas } from "@/lib/cobranca";

// Avisos do Asaas. Exige o token do header "asaas-access-token" (ASAAS_WEBHOOK_TOKEN)
// e relê a cobrança na API com a nossa chave: o corpo do aviso não ativa nada sozinho.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function postRota(request, _ctx, requestId) {
  const cfg = configAsaas();
  if (!cfg.ok || !bancoLigado()) return NextResponse.json({ received: true, ignorado: true });
  if (!cfg.tokenWebhook) {
    console.error("Aviso Asaas recusado: ASAAS_WEBHOOK_TOKEN não configurado na Vercel.");
    return NextResponse.json({ error: "Token do aviso não configurado no servidor (ASAAS_WEBHOOK_TOKEN)." }, { status: 401 });
  }
  if (!tokenWebhookConfere(request.headers.get("asaas-access-token"), cfg.tokenWebhook))
    return NextResponse.json({ error: "Token do aviso diferente do configurado (ASAAS_WEBHOOK_TOKEN)." }, { status: 401 });
  let corpo = {};
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ received: true, ignorado: true });
  }
  const aviso = lerAvisoAsaas(corpo);
  try {
    const r = await processarAvisoAsaas(aviso, clienteAsaas(cfg));
    // site de teste: guarda o resultado (sem dados pessoais) para conferir em /api/saude
    if (!ehProducao()) await registrarEvento({ request_id: requestId, rota: `/api/pagamentos/asaas:${aviso?.evento || "?"}:${r.feito}${r.campos ? ":" + r.campos.join("+") : ""}`, metodo: "AVISO", status: 0, ms: 0 });
    console.log(JSON.stringify({ app: "edugera", evento: "asaas_aviso", request_id: requestId, tipo: aviso?.evento || corpo?.event || null, feito: r.feito, status: r.status || null, campos: r.campos || undefined }));
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Aviso Asaas falhou:", e?.status, e?.message);
    return NextResponse.json({ error: "Tente de novo." }, { status: 500 }); // o Asaas reenvia
  }
}

export const POST = comRequestId("/api/pagamentos/asaas", postRota);
