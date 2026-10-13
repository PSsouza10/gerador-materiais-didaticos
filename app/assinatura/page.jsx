import { redirect } from "next/navigation";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consultarUso } from "@/lib/uso";
import { bancoLigado } from "@/lib/banco";
import { ultimaCobranca } from "@/lib/contas";
import { configPagamentos } from "@/lib/pagamentos";
import { suporteEmail, suporteWhatsapp } from "@/lib/planos";
import MinhaAssinatura from "@/components/planos/MinhaAssinatura";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minha assinatura · EduGera", robots: { index: false, follow: false } };

// Plano atual, validade e cancelamento. O professor volta aqui depois de pagar no Asaas.
export default async function PaginaAssinatura({ searchParams }) {
  const usuario = authConfigurado ? await usuarioAtual() : null;
  if (!usuario) redirect("/planos");
  let uso = null;
  let cobranca = null;
  try {
    uso = await consultarUso(usuario.email);
    if (bancoLigado()) cobranca = await ultimaCobranca(usuario.email);
  } catch (e) {
    console.error("Minha assinatura indisponível:", e?.message || e);
  }
  return (
    <MinhaAssinatura
      plano={uso?.plano || null}
      cobranca={cobranca}
      retorno={searchParams?.retorno === "1"}
      podeCancelar={configPagamentos().ok && cobranca?.tipo === "assinatura" && cobranca?.status === "ACTIVE"}
      suporte={suporteEmail()}
      whatsapp={suporteWhatsapp()}
    />
  );
}
