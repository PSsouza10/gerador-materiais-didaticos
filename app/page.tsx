import { redirect } from "next/navigation";
import Fachada from "@/components/fachada/Fachada";
import { usuarioAtual } from "@/lib/auth";

// "/" : fachada pública para visitantes. Quem já está logado (sessão confirmada
// pelo NextAuth no servidor) vai direto para o gerador em /criar, como antes.
export const metadata = {
  alternates: { canonical: "/" },
};

// depende do cookie de sessão: nunca servir a mesma resposta para todos
export const dynamic = "force-dynamic";

export default async function Home() {
  let logado = false;
  try {
    logado = !!(await usuarioAtual());
  } catch {
    logado = false; // sessão ilegível ou login fora do ar: mostra a fachada
  }
  if (logado) redirect("/criar");
  return <Fachada />;
}
