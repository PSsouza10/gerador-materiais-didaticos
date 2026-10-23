import PainelCaderno from "@/components/ciclo/PainelCaderno";
import { normalizarCodigo } from "@/lib/ciclo";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Painel do caderno · EduGera",
  robots: { index: false, follow: false },
};

export default function PaginaPainel({ params }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <p className="flex gap-4 text-sm font-semibold">
          <a href="/cadernos" className="text-indigo-600 hover:underline">
            Meus cadernos
          </a>
          <a href="/criar?aba=prova" className="text-indigo-600 hover:underline">
            Gerador
          </a>
        </p>
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <PainelCaderno codigo={normalizarCodigo(params.codigo)} />
        </section>
      </div>
    </main>
  );
}
