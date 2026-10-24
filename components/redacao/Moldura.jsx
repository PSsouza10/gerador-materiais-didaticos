// Moldura das páginas /redacao (servidor ou cliente)
export default function Moldura({ titulo, subtitulo, voltar = "/redacao", children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <a href={voltar} className="text-sm font-semibold text-indigo-600 hover:underline">
          {voltar === "/criar" ? "Voltar ao EduGera" : "Redação"}
        </a>
        <section className="mt-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Redação</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{titulo}</h1>
          {subtitulo && <p className="mt-2 text-sm text-slate-600">{subtitulo}</p>}
          {children}
        </section>
      </div>
    </main>
  );
}
