// Aviso para quem não tem o Pro: a Redação inteira é do Pro (decisão do Paulo, 24/10/2026)
export default function SoPro({ recurso = "A Redação" }) {
  return (
    <div className="mt-6 rounded-2xl border border-roxo/30 bg-roxo-claro p-5 text-sm text-marinho">
      <p className="font-bold">{recurso} é do plano Pro.</p>
      <p className="mt-1">No Pro você constrói redações com dicas, corrige pelo texto ou pela foto da folha e recebe a correção marcada como a de um professor, com a sua letra.</p>
      <a href="/planos" className="mt-3 inline-block rounded-full app-btn-principal px-4 py-2 font-semibold text-white hover:brightness-110">
        Ver o Pro
      </a>
    </div>
  );
}
