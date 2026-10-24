import { authConfigurado, usuarioAtual } from "@/lib/auth";
import Moldura from "@/components/redacao/Moldura";
import Entrar from "@/components/redacao/Entrar";
import Corretor from "@/components/redacao/Corretor";
import SoPro from "@/components/redacao/SoPro";
import { temConstrutorRedacao } from "@/lib/uso";

export const dynamic = "force-dynamic";
export const metadata = { title: "Corrigir redação · EduGera", robots: { index: false, follow: false } };

export default async function PaginaCorrigir({ searchParams }) {
  const usuario = authConfigurado ? await usuarioAtual() : null;
  const pro = usuario ? await temConstrutorRedacao(usuario.email).catch(() => false) : false;
  const id = /^\d{1,18}$/.test(searchParams?.id || "") ? searchParams.id : null;
  return (
    <Moldura titulo="Corrigir redação" subtitulo="Digite o texto ou fotografe a folha: a correção volta marcada como a do professor, com nota por critério.">
      {usuario && !pro ? <SoPro recurso="A correção de redação" /> : usuario ? <Corretor idSalvo={id} modoInicial={searchParams?.modo === "foto" ? "foto" : "texto"} /> : <Entrar voltarPara="/redacao/corrigir" />}
    </Moldura>
  );
}
