import { notFound } from "next/navigation";
import { ehProducao } from "@/lib/ambiente";
import CapasTeste from "@/components/CapasTeste";

// Prévias da capa "História que Ensina" para aprovação visual e testes automáticos.
// Só no ambiente de teste/preview: no site real responde 404.
export const metadata = { title: "Prévias de capas · EduGera (teste)", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function Pagina() {
  if (ehProducao()) notFound();
  return <CapasTeste />;
}
