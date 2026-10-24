// Aviso para quem não tem o Pro: a Redação inteira é do Pro (decisão do Paulo, 24/10/2026)
export default function SoPro({ recurso = "A Redação" }) {
  return (
    <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm text-indigo-950">
      <p className="font-bold">{recurso} é do plano Pro.</p>
      <p className="mt-1">No Pro você constrói redações com dicas, corrige pelo texto ou pela foto da folha e recebe a correção marcada como a de um professor, com a sua letra.</p>
      <a href="/planos" className="mt-3 inline-block rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">
        Ver o Pro
      </a>
    </div>
  );
}
