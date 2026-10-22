import FiguraDidatica from "@/components/FiguraDidatica";

// Questão de exemplo no padrão Prova Paulista, montada e calculada pelo próprio EduGera.
export default function QuestaoExemplo({ questao, codigo }) {
  if (!questao) return null;
  const letras = ["A", "B", "C", "D"];
  return (
    <figure className="mt-4 rounded-3xl border border-marinho/10 bg-white p-5 shadow-sm sm:p-6">
      <figcaption className="text-[13px] font-bold uppercase tracking-wide text-roxo">
        Exemplo de questão · {codigo} · {questao.descritor}
      </figcaption>
      {questao.textoBase && <p className="mt-3 text-[16px] leading-relaxed text-tinta">{questao.textoBase}</p>}
      {questao.figura && (
        <div className="mt-3 flex justify-center">
          <FiguraDidatica figura={questao.figura} />
        </div>
      )}
      <p className="mt-3 text-[16px] font-semibold text-marinho">{questao.comando}</p>
      <ol className="mt-2 grid gap-1.5">
        {questao.alternativas.map((a, i) => (
          <li key={i} className="text-[15px] text-tinta">
            <b className="text-marinho">({letras[i]})</b> {a}
          </li>
        ))}
      </ol>
      <details className="mt-3 rounded-2xl bg-roxo-claro/60 p-3">
        <summary className="cursor-pointer text-[14px] font-semibold text-marinho">Ver gabarito e resolução</summary>
        <p className="mt-2 text-[14px] text-tinta">
          <b className="text-marinho">Gabarito: {questao.correta}.</b> {questao.resolucao}
        </p>
      </details>
    </figure>
  );
}
