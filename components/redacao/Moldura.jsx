import "@/components/app-identidade.css";

// Moldura das páginas /redacao (servidor ou cliente), com a identidade do site
export default function Moldura({ titulo, subtitulo, voltar = "/redacao", children }) {
  return (
    <main className="app-casca min-h-screen bg-creme px-4 py-10 text-tinta">
      <div className="mx-auto max-w-3xl">
        <a href={voltar} className="text-sm font-semibold text-roxo hover:underline">
          {voltar === "/criar" ? "Voltar ao EduGera" : "Redação"}
        </a>
        <section className="app-papel mt-5 rounded-3xl p-5 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wide text-coral-escuro">Redação</p>
          <h1 className="app-titulo mt-1 text-3xl text-marinho">{titulo}</h1>
          {subtitulo && <p className="mt-2 text-sm text-slate-600">{subtitulo}</p>}
          {children}
        </section>
      </div>
    </main>
  );
}
