import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { bancoLigado } from "@/lib/banco";
import { configPagamentos, clienteAsaas, lerAviso, tokenAvisoConfere } from "@/lib/pagamentos";
import { processarAviso } from "@/lib/cobranca";

// Avisos do Asaas (pagamentos e assinaturas). Sem login: quem chama é o Asaas.
// Segurança: confere o token do aviso (header "asaas-access-token" = ASAAS_WEBHOOK_TOKEN) e,
// sobretudo, RELÊ o pagamento/assinatura na API com a nossa chave — o corpo recebido não ativa nada sozinho.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function postRota(request, _ctx, requestId) {
  const cfg = configPagamentos();
  if (!cfg.ok || !bancoLigado()) return NextResponse.json({ ok: true, ignorado: true }); // 200: o Asaas não fica repetindo
  if (!tokenAvisoConfere(request.headers.get("asaas-access-token"), cfg.tokenAviso)) {
    return NextResponse.json({ error: "Token do aviso inválido." }, { status: 401 });
  }
  let corpo = {};
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ ok: true, ignorado: true });
  }
  const aviso = lerAviso(corpo);
  try {
    const r = await processarAviso(aviso, clienteAsaas(cfg));
    console.log(JSON.stringify({ app: "edugera", evento: "pagamento_aviso", request_id: requestId, tipo: aviso?.evento || null, recurso: aviso?.recurso || null, feito: r.feito, status: r.status || null }));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Aviso de pagamento falhou:", e?.status, e?.message);
    return NextResponse.json({ error: "Tente de novo." }, { status: 500 }); // 500: o Asaas reenvia depois
  }
}

export const POST = comRequestId("/api/pagamentos/webhook", postRota);
