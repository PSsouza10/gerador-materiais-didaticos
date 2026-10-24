import { authConfigurado, usuarioAtual } from "@/lib/auth";
import Moldura from "@/components/redacao/Moldura";
import Entrar from "@/components/redacao/Entrar";
import Corretor from "@/components/redacao/Corretor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Corrigir redação · EduGera", robots: { index: false, follow: false } };

export default async function PaginaCorrigir({ searchParams }) {
  const usuario = authConfigurado ? await usuarioAtual() : null;
  const id = /^\d{1,18}$/.test(searchParams?.id || "") ? searchParams.id : null;
  return (
    <Moldura titulo="Corrigir redação" subtitulo="Cole ou digite o texto. A IA corrige pela rubrica de 5 critérios (10 pontos).">
      {usuario ? <Corretor idSalvo={id} /> : <Entrar voltarPara="/redacao/corrigir" />}
    </Moldura>
  );
}
