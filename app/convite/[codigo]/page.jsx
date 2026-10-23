import AtivarConvite from "@/components/ciclo/AtivarConvite";
import { normalizarCodigoCampanha } from "@/lib/campanhas";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Convite · EduGera",
  description: "Ative seus dias de Pro grátis no EduGera: simulados da Prova Paulista, correção da turma e materiais da BNCC.",
  robots: { index: false, follow: false },
};

export default function PaginaConvite({ params }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-xl">
        <a href="/" className="text-sm font-semibold text-indigo-600 hover:underline">
          EduGera
        </a>
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <AtivarConvite codigo={normalizarCodigoCampanha(params.codigo)} />
        </section>
      </div>
    </main>
  );
}
