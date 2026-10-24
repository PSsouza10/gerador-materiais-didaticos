import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { temConstrutorRedacao } from "@/lib/uso";
import Moldura from "@/components/redacao/Moldura";
import Entrar from "@/components/redacao/Entrar";
import Construtor from "@/components/redacao/Construtor";
import SoPro from "@/components/redacao/SoPro";

export const dynamic = "force-dynamic";
export const metadata = { title: "Construir redação · EduGera", robots: { index: false, follow: false } };

// Redação: só Pro (decisão do Paulo, 24/10/2026)
export default async function PaginaConstruir() {
  const usuario = authConfigurado ? await usuarioAtual() : null;
  const pro = usuario ? await temConstrutorRedacao(usuario.email).catch(() => false) : false;
  return (
    <Moldura titulo="Construtor de redação" subtitulo="9 etapas: você escreve cada parte e o EduGera monta o texto.">
      {!usuario ? (
        <Entrar voltarPara="/redacao/construir" />
      ) : !pro ? (
        <SoPro recurso="O construtor de redação" />
      ) : (
        <Construtor />
      )}
    </Moldura>
  );
}
