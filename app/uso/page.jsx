import { redirect } from "next/navigation";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consultarUso, ultimosUsos } from "@/lib/uso";
import { bancoLigado } from "@/lib/banco";
import { listarMateriais } from "@/lib/contas";
import { lerHistorico } from "@/lib/historico";
import { suporteEmail, SUPORTE_EMAIL_PADRAO } from "@/lib/planos";
import PainelUso from "@/components/planos/PainelUso";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Uso e limites · EduGera",
  robots: { index: false, follow: false },
};

// Painel de uso: só para quem entrou. Mostra o plano, o que já foi usado e quando renova.
export default async function PaginaUso() {
  const usuario = authConfigurado ? await usuarioAtual() : null;
  if (!usuario) redirect("/");
  let uso = null;
  let materiais = null;
  let recentes = [];
  try {
    uso = await consultarUso(usuario.email);
    recentes = await ultimosUsos(usuario.email, 10);
    const lista = bancoLigado() ? await listarMateriais(usuario.email) : await lerHistorico(usuario.email);
    materiais = Array.isArray(lista) ? lista.length : null;
  } catch (e) {
    console.error("Painel de uso indisponível:", e?.message || e);
  }
  return <PainelUso uso={uso} materiais={materiais} recentes={recentes} suporte={suporteEmail() || SUPORTE_EMAIL_PADRAO} nome={usuario.nome || ""} />;
}
