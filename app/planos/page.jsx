import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consultarUso } from "@/lib/uso";
import { bancoLigado } from "@/lib/banco";
import { simulacaoAssinatura } from "@/lib/ambiente";
import { ehAdmin } from "@/lib/uso";
import { PLANOS, ORDEM_PLANOS, suporteEmail, suporteWhatsapp, SUPORTE_TEXTO_PADRAO, planoVigente, avisoTransicao } from "@/lib/planos";
import Planos from "@/components/planos/Planos";
import { vendaAberta as provedorAtivo } from "@/lib/provedorPagamento";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Planos · EduGera",
  description: "Planos do EduGera: Grátis, Pro mensal, Pro anual e Escola.",
  alternates: { canonical: "/planos" },
  openGraph: { url: "/planos", title: "Planos · EduGera" },
};

export default async function PaginaPlanos() {
  const usuario = authConfigurado ? await usuarioAtual() : null;
  let uso = null;
  if (usuario) {
    try {
      uso = await consultarUso(usuario.email);
    } catch (e) {
      console.error("Planos: uso indisponível:", e?.message || e);
    }
  }
  return (
    <Planos
      planos={ORDEM_PLANOS.map((id) => PLANOS[id])}
      logado={!!usuario}
      atual={uso?.plano?.id || null}
      assinatura={uso?.assinatura || null}
      simulacao={!!usuario && simulacaoAssinatura() && bancoLigado()}
      suporte={suporteEmail()}
      whatsapp={suporteWhatsapp()}
      pagamento={provedorAtivo().ok && bancoLigado() ? provedorAtivo().provedor : false}
      suportePadrao={SUPORTE_TEXTO_PADRAO}
      aviso={avisoTransicao(planoVigente(PLANOS.gratis).transicao)}
      diagnostico={usuario && ehAdmin(usuario.email) && !(provedorAtivo().ok && bancoLigado()) ? `Pagamento desligado: ${bancoLigado() ? provedorAtivo().motivo : "banco desligado"}` : null}
    />
  );
}
