import Link from "next/link";

// Moldura simples e legível para as páginas públicas (privacidade, termos).
export const ATUALIZADO_EM = "27 de setembro de 2026";
export const CONTATO = "pssouzasj@gmail.com";

export default function PaginaLegal({ titulo, children }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-bold text-indigo-600 hover:underline">
          ← EduGera · Apostilas BNCC
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900 sm:text-3xl">{titulo}</h1>
        <p className="mt-1 text-sm text-slate-500">Última atualização: {ATUALIZADO_EM}</p>
        <div className="legal mt-6 space-y-4 text-[15px] leading-relaxed text-slate-700">{children}</div>
        <nav aria-label="Documentos" className="mt-10 flex flex-wrap gap-4 border-t border-slate-100 pt-5 text-sm">
          <Link href="/privacidade" className="text-indigo-600 hover:underline">
            Política de Privacidade
          </Link>
          <Link href="/termos" className="text-indigo-600 hover:underline">
            Termos de Uso
          </Link>
          <a href={`mailto:${CONTATO}`} className="text-indigo-600 hover:underline">
            Contato
          </a>
        </nav>
      </article>
    </div>
  );
}

export const H2 = ({ children }) => <h2 className="pt-3 text-lg font-bold text-slate-900">{children}</h2>;
export const Lista = ({ children }) => <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
