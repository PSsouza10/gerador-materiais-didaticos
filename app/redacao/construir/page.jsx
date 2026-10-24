import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { temConstrutorRedacao } from "@/lib/uso";
import Moldura from "@/components/redacao/Moldura";
import Entrar from "@/components/redacao/Entrar";
import Construtor from "@/components/redacao/Construtor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Construir redação · EduGera", robots: { index: false, follow: false } };

// Construtor guiado: só Pro (decisão do Paulo, 24/10/2026)
export default async function PaginaConstruir() {
  const usuario = authConfigurado ? await usuarioAtual() : null;
  const pro = usuario ? await temConstrutorRedacao(usuario.email).catch(() => false) : false;
  return (
    <Moldura titulo="Construtor de redação" subtitulo="9 etapas: você escreve cada parte e o EduGera monta o texto.">
      {!usuario ? (
        <Entrar voltarPara="/redacao/construir" />
      ) : !pro ? (
        <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm text-indigo-950">
          <p className="font-bold">O construtor de redação é do plano Pro.</p>
          <p className="mt-1">No Grátis você pode corrigir 1 redação por mês (até 2 laudas).</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/planos" className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">
              Ver o Pro
            </a>
            <a href="/redacao/corrigir" className="rounded-xl border border-indigo-300 bg-white px-4 py-2 font-semibold text-indigo-800">
              Corrigir uma redação
            </a>
          </div>
        </div>
      ) : (
        <Construtor />
      )}
    </Moldura>
  );
}
