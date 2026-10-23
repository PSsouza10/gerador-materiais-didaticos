import AbrirCaderno from "@/components/ciclo/AbrirCaderno";
import { normalizarCodigo } from "@/lib/ciclo";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Caderno da rede · EduGera",
  robots: { index: false, follow: false },
};

export default function PaginaCaderno({ params }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <a href="/criar" className="text-sm font-semibold text-indigo-600 hover:underline">
          EduGera
        </a>
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <AbrirCaderno codigo={normalizarCodigo(params.codigo)} />
        </section>
      </div>
    </main>
  );
}
