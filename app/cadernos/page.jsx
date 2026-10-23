import { notFound, redirect } from "next/navigation";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { bancoLigado } from "@/lib/banco";
import { cadernosDoUsuario, ehCoordenador } from "@/lib/cadernos";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Meus cadernos · EduGera",
  robots: { index: false, follow: false },
};

// Coordenador do piloto: os cadernos que criou, com envios e links para o painel
export default async function PaginaCadernos() {
  const usuario = authConfigurado ? await usuarioAtual() : null;
  if (!usuario) redirect("/");
  if (!bancoLigado() || !(await ehCoordenador(usuario.email))) notFound();
  const cadernos = await cadernosDoUsuario(usuario.email);
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <a href="/criar?aba=prova" className="text-sm font-semibold text-indigo-600 hover:underline">
          Gerador
        </a>
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Ciclo de Recomposição · coordenação</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Meus cadernos</h1>
          <p className="mt-2 text-sm text-slate-600">
            Para criar um caderno: na aba Avaliação, gere (ou abra) a avaliação e clique em <b>Distribuir para as escolas</b>.
          </p>
          {cadernos.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">Nenhum caderno ainda.</p>
          ) : (
            <ul className="mt-6 divide-y divide-slate-100">
              {cadernos.map((c) => (
                <li key={c.codigo} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <b className="text-slate-900">{c.titulo}</b>
                    <span className="block text-slate-500">
                      {c.tipo === "reavaliacao" ? "Mini-reavaliação" : "Diagnóstico"} · código {c.codigo} · {c.questoes} questões · {c.envios} turma(s) · {c.alunos} aluno(s) ·{" "}
                      {new Date(c.criadoEm).toLocaleDateString("pt-BR")}
                    </span>
                  </span>
                  <a href={`/caderno/${c.tipo === "reavaliacao" && c.origem ? c.origem : c.codigo}/painel`} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-800 hover:border-indigo-300">
                    Painel
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
