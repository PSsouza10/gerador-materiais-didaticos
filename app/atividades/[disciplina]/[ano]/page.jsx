import { notFound } from "next/navigation";
import MolduraAtividades, { ChamadaCriar, PilulasAnos } from "@/components/atividades/MolduraAtividades";
import { ATIVIDADES } from "@/lib/atividadesDados";
import { SITE, slugDisciplina, cortar, perguntasDoCombo } from "@/lib/atividades";

export const dynamicParams = false; // combinação inexistente → 404 (sem página vazia)

export function generateStaticParams() {
  return ATIVIDADES.combos.map(({ disciplina, ano }) => ({ disciplina: slugDisciplina(disciplina), ano: ano.slug }));
}

export function generateMetadata({ params }) {
  const combo = ATIVIDADES.resolverCombo(params.disciplina, params.ano);
  if (!combo) return {};
  const { disciplina, ano, habilidades } = combo;
  const titulo = `Atividades de ${disciplina} do ${ano.rotulo} · BNCC · EduGera`;
  const descricao = `${habilidades.length} habilidades da BNCC de ${disciplina} do ${ano.rotulo} do Ensino Fundamental. Gere apostilas, fichas e exercícios com gabarito, ilustração e PDF pronto para imprimir.`;
  const url = `/atividades/${params.disciplina}/${params.ano}`;
  return { title: titulo, description: descricao, alternates: { canonical: url }, openGraph: { url, title: titulo, description: descricao } };
}

export default function PaginaAtividades({ params }) {
  const combo = ATIVIDADES.resolverCombo(params.disciplina, params.ano);
  if (!combo) notFound();
  const { disciplina, ano, habilidades } = combo;
  const slug = slugDisciplina(disciplina);
  const amostra = habilidades.slice(0, 6);
  const faq = perguntasDoCombo(disciplina, ano);
  const outrosAnos = ATIVIDADES.combos.filter((c) => c.disciplina === disciplina && c.ano.slug !== ano.slug);
  const outrasDisciplinas = ATIVIDADES.combos.filter((c) => c.ano.slug === ano.slug && c.disciplina !== disciplina);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "EduGera", item: SITE },
        { "@type": "ListItem", position: 2, name: "Atividades", item: `${SITE}/atividades` },
        { "@type": "ListItem", position: 3, name: disciplina, item: `${SITE}/atividades/${slug}` },
        { "@type": "ListItem", position: 4, name: ano.rotulo },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <MolduraAtividades
      trilha={[
        { rotulo: "EduGera", href: "/" },
        { rotulo: "Atividades", href: "/atividades" },
        { rotulo: disciplina, href: `/atividades/${slug}` },
        { rotulo: ano.rotulo },
      ]}
      jsonLd={jsonLd}
    >
      <section className="pt-6">
        <p className="eyebrow">Atividades BNCC · Ensino Fundamental</p>
        <h1 className="font-titulo mt-3 text-[2.1rem] font-semibold leading-[1.1] text-marinho sm:text-[2.7rem]">
          Atividades de {disciplina} do {ano.rotulo} alinhadas à BNCC
        </h1>
        <p className="mt-4 max-w-[64ch] text-[17px] leading-relaxed text-tinta">
          Gere apostilas, fichas de estudo e exercícios com gabarito de {disciplina}, prontos para imprimir em A4, com
          ilustração e PDF do aluno e do professor. A base oficial da BNCC tem{" "}
          <strong className="text-marinho">
            {habilidades.length} habilidade{habilidades.length > 1 ? "s" : ""}
          </strong>{" "}
          de {disciplina} para o {ano.rotulo}.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-titulo text-[1.6rem] font-semibold text-marinho">Habilidades da BNCC</h2>
        <ul className="mt-4 grid gap-3">
          {amostra.map((h) => (
            <li key={h.c} className="rounded-2xl border border-marinho/10 bg-white p-4">
              <span className="rounded-full bg-roxo px-2.5 py-0.5 text-[12px] font-bold text-white">{h.c}</span>
              <p className="mt-2 text-[15px] leading-relaxed text-tinta">{cortar(h.t)}</p>
            </li>
          ))}
        </ul>
        {habilidades.length > amostra.length && (
          <p className="mt-3 text-[14px] text-tinta">
            + {habilidades.length - amostra.length} outras habilidades, que você encontra por código ou palavra-chave no gerador.
          </p>
        )}
      </section>

      <ChamadaCriar texto={`Gere seu material de ${disciplina} em minutos`} botao={`Criar atividade de ${disciplina}`} />

      <section className="mt-12">
        <h2 className="font-titulo text-[1.6rem] font-semibold text-marinho">Perguntas frequentes</h2>
        <div className="mt-4 grid gap-3">
          {faq.map((f) => (
            <details key={f.q} className="rounded-2xl border border-marinho/10 bg-white p-4">
              <summary className="cursor-pointer font-semibold text-marinho">{f.q}</summary>
              <p className="mt-2 text-[15px] leading-relaxed text-tinta">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {outrosAnos.length > 0 && (
        <section className="mt-12">
          <h2 className="font-titulo text-[1.3rem] font-semibold text-marinho">Outros anos de {disciplina}</h2>
          <PilulasAnos itens={outrosAnos.map((c) => ({ href: `/atividades/${slug}/${c.ano.slug}`, rotulo: c.ano.rotulo }))} />
        </section>
      )}

      {outrasDisciplinas.length > 0 && (
        <section className="mt-8">
          <h2 className="font-titulo text-[1.3rem] font-semibold text-marinho">Outras disciplinas do {ano.rotulo}</h2>
          <PilulasAnos
            itens={outrasDisciplinas.map((c) => ({ href: `/atividades/${slugDisciplina(c.disciplina)}/${ano.slug}`, rotulo: c.disciplina }))}
          />
        </section>
      )}
    </MolduraAtividades>
  );
}
