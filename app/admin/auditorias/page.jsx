import { notFound, redirect } from "next/navigation";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { ehAdmin } from "@/lib/uso";
import { lerContagemAuditorias } from "@/lib/contadorAuditorias";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Contador de auditorias · EduGera",
  robots: { index: false, follow: false },
};

export default async function PaginaAuditorias() {
  const usuario = authConfigurado ? await usuarioAtual() : null;
  if (!usuario) redirect("/");
  if (!ehAdmin(usuario.email)) notFound();

  let total = null;
  try {
    total = await lerContagemAuditorias();
  } catch (erro) {
    console.error("Contador de auditorias indisponível:", erro?.message || erro);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="text-sm font-semibold text-indigo-600 hover:underline">Voltar ao EduGera</a>
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Painel administrativo</p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Auditorias pedagógicas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            O total registra uma execução da auditoria determinística quando a geração do material é concluída.
            Reabrir um material não gera uma nova contagem. O contador não armazena conteúdo, nomes,
            dados de estudantes nem identificadores de conta.
          </p>
          <div className="mt-6 rounded-2xl bg-indigo-50 p-6">
            <p className="text-sm font-semibold text-indigo-800">Total registrado</p>
            <p className="mt-2 text-4xl font-extrabold tabular-nums text-indigo-950">
              {total === null ? "Indisponível" : total.toLocaleString("pt-BR")}
            </p>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            A contagem começa com a ativação deste recurso; materiais auditados antes dela não entram,
            porque o EduGera não guardava um histórico exato. Se o armazenamento da métrica estiver
            temporariamente indisponível, a geração continua, mas aquele registro pode não ser contado.
          </p>
        </section>
      </div>
    </main>
  );
}
