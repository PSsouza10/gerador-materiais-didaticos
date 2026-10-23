import { notFound, redirect } from "next/navigation";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { ehAdmin } from "@/lib/uso";
import FormPiloto from "@/components/ciclo/FormPiloto";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Piloto · EduGera",
  robots: { index: false, follow: false },
};

export default async function PaginaPiloto() {
  const usuario = authConfigurado ? await usuarioAtual() : null;
  if (!usuario) redirect("/");
  if (!ehAdmin(usuario.email)) notFound();
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="text-sm font-semibold text-indigo-600 hover:underline">
          Voltar ao EduGera
        </a>
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Painel administrativo</p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Piloto do Ciclo de Recomposição</h1>
          <p className="mt-2 text-sm text-slate-600">
            Marque quem pode criar cadernos (coordenação) e libere o Pro, sem cobrança, para os professores do piloto: a correção pela foto é do Pro. Os e-mails não são
            guardados; o banco recebe só o código da conta.
          </p>
          <FormPiloto />
        </section>
      </div>
    </main>
  );
}
