import Link from "next/link";
import { notFound } from "next/navigation";
import MolduraAtividades, { ChamadaCriar, PilulasAnos } from "@/components/atividades/MolduraAtividades";
import QuestaoExemplo from "@/components/atividades/QuestaoExemplo";
import { PROVA_PAULISTA } from "@/lib/provaPaulistaDados";
import { SITE, slugDisciplina, cortar } from "@/lib/atividades";
import { nomeDisciplina, perguntasProvaPaulista, slugCodigo, linkGerador } from "@/lib/provaPaulistaSeo";

export const dynamicParams = false; // combinação inexistente → 404

export function generateStaticParams() {
  return PROVA_PAULISTA.combos.map(({ disciplina, ano }) => ({ disciplina: slugDisciplina(disciplina), ano: ano.slug }));
}

export function generateMetadata({ params }) {
  const combo = PROVA_PAULISTA.resolverCombo(params.disciplina, params.ano);
  if (!combo) return {};
  const nome = nomeDisciplina(combo.disciplina);
  const titulo = `Simulado Prova Paulista de ${nome} do ${combo.ano.rotulo} · EduGera`;
  const descricao = `Monte um simulado no padrão da Prova Paulista e do SARESP de ${nome} do ${combo.ano.rotulo}: ${combo.habilidades.length} habilidades da BNCC, gabarito conferido, cartão-resposta e correção da turma por habilidade.`;
  const url = `/prova-paulista/${params.disciplina}/${params.ano}`;
  return { title: titulo, description: descricao, alternates: { canonical: url }, openGraph: { url, title: titulo, description: descricao } };
}

export default function PaginaProvaPaulista({ params }) {
  const combo = PROVA_PAULISTA.resolverCombo(params.disciplina, params.ano);
  if (!combo) notFound();
  const { disciplina, ano, habilidades } = combo;
  const nome = nomeDisciplina(disciplina);
  const slug = slugDisciplina(disciplina);
  const exemplo = PROVA_PAULISTA.exemploDoCombo(combo);
  const faq = perguntasProvaPaulista(disciplina, ano);
  const outrosAnos = PROVA_PAULISTA.combos.filter((c) => c.disciplina === disciplina && c.ano.slug !== ano.slug);
  const outrasDisciplinas = PROVA_PAULISTA.combos.filter((c) => c.ano.slug === ano.slug && c.disciplina !== disciplina);
  const gerar = linkGerador({ aba: "prova", disciplina, ano: ano.valor });

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "EduGera", item: SITE },
        { "@type": "ListItem", position: 2, name: "Prova Paulista", item: `${SITE}/prova-paulista` },
        { "@type": "ListItem", position: 3, name: `${nome} · ${ano.rotulo}` },
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
      trilha={[{ rotulo: "EduGera", href: "/" }, { rotulo: "Prova Paulista", href: "/prova-paulista" }, { rotulo: `${nome} · ${ano.rotulo}` }]}
      jsonLd={jsonLd}
    >
      <section className="pt-6">
        <p className="eyebrow">Simulado · Prova Paulista e SARESP</p>
        <h1 className="font-titulo mt-3 text-[2.1rem] font-semibold leading-[1.1] text-marinho sm:text-[2.7rem]">
          Simulado Prova Paulista de {nome} do {ano.rotulo}
        </h1>
        <p className="mt-4 max-w-[64ch] text-[17px] leading-relaxed text-tinta">
          Monte uma avaliação de {nome} do {ano.rotulo} no formato usado na Prova Paulista e no SARESP, escolhendo entre as{" "}
          <strong className="text-marinho">{habilidades.length} habilidades da BNCC</strong> do ano. Cada questão traz texto-base,
          habilidade e descritor, quatro alternativas e a explicação do erro por trás de cada alternativa errada.
        </p>
        <Link href={gerar} className="btn-primario mt-5 inline-flex">
          Criar simulado de {nome} do {ano.rotulo}
        </Link>
      </section>

      {exemplo && (
        <section className="mt-10">
          <h2 className="font-titulo text-[1.6rem] font-semibold text-marinho">Como fica uma questão</h2>
          <QuestaoExemplo questao={exemplo.questao} codigo={exemplo.habilidade.c} />
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-titulo text-[1.6rem] font-semibold text-marinho">Habilidades da BNCC do {ano.rotulo}</h2>
        <ul className="mt-4 grid gap-3">
          {habilidades.map((h) => (
            <li key={h.c}>
              <Link href={`/bncc/${slugCodigo(h.c)}`} className="block rounded-2xl border border-marinho/10 bg-white p-4 hover:border-roxo">
                <span className="rounded-full bg-roxo px-2.5 py-0.5 text-[12px] font-bold text-white">{h.c}</span>
                <p className="mt-2 text-[15px] leading-relaxed text-tinta">{cortar(h.t, 200)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <ChamadaCriar texto={`Simulado de ${nome} do ${ano.rotulo} pronto em minutos`} botao="Criar avaliação" href={gerar} sub="Grátis para começar, com sua conta Google." />

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
          <h2 className="font-titulo text-[1.3rem] font-semibold text-marinho">Outros anos de {nome}</h2>
          <PilulasAnos itens={outrosAnos.map((c) => ({ href: `/prova-paulista/${slug}/${c.ano.slug}`, rotulo: c.ano.rotulo }))} />
        </section>
      )}
      {outrasDisciplinas.length > 0 && (
        <section className="mt-8">
          <h2 className="font-titulo text-[1.3rem] font-semibold text-marinho">Outros componentes do {ano.rotulo}</h2>
          <PilulasAnos itens={outrasDisciplinas.map((c) => ({ href: `/prova-paulista/${slugDisciplina(c.disciplina)}/${ano.slug}`, rotulo: nomeDisciplina(c.disciplina) }))} />
        </section>
      )}
      <p className="mt-8 text-[13px] text-tinta">O EduGera não é afiliado à Secretaria da Educação do Estado de São Paulo. As avaliações são inspiradas no formato da Prova Paulista e do SARESP.</p>
    </MolduraAtividades>
  );
}
