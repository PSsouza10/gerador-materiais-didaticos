import { authConfigurado, usuarioAtual } from "@/lib/auth";
import Moldura from "@/components/redacao/Moldura";
import Entrar from "@/components/redacao/Entrar";
import MinhaLetra from "@/components/redacao/MinhaLetra";
import SoPro from "@/components/redacao/SoPro";
import { temConstrutorRedacao } from "@/lib/uso";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minha letra · EduGera", robots: { index: false, follow: false } };

export default async function PaginaMinhaLetra() {
  const usuario = authConfigurado ? await usuarioAtual() : null;
  const pro = usuario ? await temConstrutorRedacao(usuario.email).catch(() => false) : false;
  return (
    <Moldura titulo="Minha letra" subtitulo="Cadastre a sua caligrafia: as correções na foto da redação saem escritas com a sua letra.">
      {usuario && !pro ? <SoPro recurso="Minha letra" /> : usuario ? <MinhaLetra /> : <Entrar voltarPara="/redacao/minha-letra" />}
    </Moldura>
  );
}
