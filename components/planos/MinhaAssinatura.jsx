"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Info } from "lucide-react";
import Marca from "@/components/fachada/Marca";
import "@/components/fachada/fachada.css";

const data = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");

const STATUS = {
  authorized: "Ativa — renova todo mês no cartão",
  cancelled: "Cancelada — não será cobrada de novo",
  paused: "Pausada pelo Mercado Pago (pagamento não aprovado)",
  pending: "Aguardando o pagamento",
  approved: "Paga — plano anual",
  in_process: "Pagamento em análise",
  refunded: "Pagamento devolvido",
  charged_back: "Pagamento contestado",
  rejected: "Pagamento recusado",
  // Asaas
  ACTIVE: "Ativa — renova todo mês no cartão",
  CANCELLED: "Cancelada — não será cobrada de novo",
  CONFIRMED: "Paga (não renova sozinha)",
  RECEIVED: "Paga (não renova sozinha)",
  PENDING: "Aguardando o pagamento",
  OVERDUE: "Pagamento vencido",
  REFUNDED: "Pagamento devolvido",
};

const NOME_PLANO = { pro_mensal: "Pro mensal", pro_anual: "Pro anual" };

export default function MinhaAssinatura({ plano, cobranca, retorno, podeCancelar, suporte, whatsapp }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [msg, setMsg] = useState("");

  const cancelar = async () => {
    setOcupado(true);
    setMsg("");
    try {
      const r = await fetch("/api/pagamentos/cancelar", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Não foi possível cancelar.");
      setMsg(`Assinatura cancelada. Nenhuma nova cobrança será feita. O Pro vale até ${data(j.validoAte)}.`);
      setConfirmar(false);
      router.refresh();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="fachada min-h-screen">
      <header className="mx-auto flex h-[80px] max-w-[880px] items-center gap-4 px-5 sm:px-8">
        <Link href="/" className="rounded-lg" aria-label="EduGera — página inicial">
          <Marca />
        </Link>
        <Link href="/criar" className="btn-contorno ml-auto whitespace-nowrap">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar ao EduGera
        </Link>
      </header>
      <main className="mx-auto max-w-[880px] px-5 pb-20 sm:px-8">
        <h1 className="font-titulo mt-4 text-[2.2rem] font-semibold text-marinho">Minha assinatura</h1>

        {retorno && (
          <p role="status" className="mt-5 flex items-start gap-2 rounded-2xl bg-verde-claro px-4 py-3 text-[15px] font-medium text-verde-escuro">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
            Recebemos o retorno do pagamento. Quando o pagamento for aprovado, o Pro é ativado sozinho — no cartão costuma levar menos de um minuto; recarregue a página se ainda não aparecer.
          </p>
        )}

        <section className="papel mt-6 p-6">
          <p className="text-[13px] font-bold uppercase tracking-wide text-tinta">Plano atual</p>
          <p className="font-titulo mt-1 text-[1.8rem] font-semibold text-marinho">{plano?.nome || "—"}</p>
          {cobranca ? (
            <dl className="mt-4 grid gap-2 text-[15px] text-tinta sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-marinho">Situação</dt>
                <dd>
                  {NOME_PLANO[cobranca.plano] ? `${NOME_PLANO[cobranca.plano]} · ` : ""}
                  {STATUS[cobranca.status] || cobranca.status}
                </dd>
              </div>
              {cobranca.validoAte && (
                <div>
                  {/* mensal no cartão: mostra a data da renovação; os 3 dias de tolerância ficam só por dentro */}
                  {cobranca.ativa && cobranca.tipo === "assinatura" && ["ACTIVE", "authorized"].includes(cobranca.status) ? (
                    <>
                      <dt className="font-semibold text-marinho">Renova em</dt>
                      <dd>{data(new Date(Date.parse(cobranca.validoAte) - 3 * 86400000).toISOString())}</dd>
                    </>
                  ) : (
                    <>
                      <dt className="font-semibold text-marinho">{cobranca.ativa ? "Pro válido até" : "Pro valeu até"}</dt>
                      <dd>{data(cobranca.validoAte)}</dd>
                    </>
                  )}
                </div>
              )}
            </dl>
          ) : (
            <p className="mt-3 text-[15px] text-tinta">Você não tem assinatura paga.</p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/planos" className="btn-secundario">
              Ver planos
            </Link>
            {podeCancelar && !confirmar && (
              <button type="button" onClick={() => setConfirmar(true)} className="btn-contorno">
                Cancelar assinatura
              </button>
            )}
          </div>
          {confirmar && (
            <div className="mt-4 rounded-2xl border border-coral/40 bg-coral-claro p-4 text-[15px] text-marinho">
              <p className="font-semibold">Cancelar a assinatura mensal?</p>
              <p className="mt-1">Nenhuma nova cobrança será feita. Você continua com o Pro até o fim do mês já pago e depois volta para o Grátis. Seus materiais continuam guardados.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={cancelar} disabled={ocupado} className="btn-primario">
                  {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Sim, cancelar
                </button>
                <button type="button" onClick={() => setConfirmar(false)} className="btn-contorno">
                  Manter assinatura
                </button>
              </div>
            </div>
          )}
          {msg && (
            <p role="status" className="mt-4 text-[15px] font-semibold text-marinho">
              {msg}
            </p>
          )}
        </section>

        <p className="mt-6 flex items-start gap-2 text-[14.5px] text-tinta">
          <Info className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span>
            Desistiu nos primeiros 7 dias? Você tem direito à devolução do valor (Código de Defesa do Consumidor, art. 49). Fale com{" "}
            <a className="underline" href={`mailto:${suporte}?subject=${encodeURIComponent("EduGera — reembolso")}`}>
              {suporte}
            </a>
            {whatsapp && (
              <>
                {" "}ou pelo WhatsApp{" "}
                <a className="underline" href={whatsapp.link} target="_blank" rel="noopener noreferrer">
                  {whatsapp.rotulo}
                </a>
              </>
            )}
            .
          </span>
        </p>
      </main>
    </div>
  );
}
