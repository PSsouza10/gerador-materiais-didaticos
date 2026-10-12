import Link from "next/link";
import { notFound } from "next/navigation";
import MolduraAtividades, { ChamadaCriar } from "@/components/atividades/MolduraAtividades";
import { ATIVIDADES } from "@/lib/atividadesDados";
import { SITE } from "@/lib/atividades";

export const dynamicParams = false; // disciplina inexistente → 404

export function generateStaticParams() {
  return ATIVIDADES.disciplinas.map(({ slug }) => ({ disciplina: slug }));
}

export function generateMetadata({ params }) {
  const d = ATIVIDADES.resolverDisciplina(params.disciplina);
  if (!d) return {};
  const titulo = `Atividades de ${d.disciplina} por ano · BNCC · EduGera`;
  const descricao = `Atividades, apostilas e exercícios com gabarito de ${d.disciplina} do ${d.combos[0].ano.rotulo} ao ${d.combos.at(-1).ano.rotulo}, alinhados às habilidades oficiais da BNCC.`;
  const url = `/atividades/${d.slug}`;
  return { title: titulo, description: descricao, alternates: { canonical: url }, openGraph: { url, title: titulo, description: descricao } };
}

export default function PaginaDisciplina({ params }) {
  const d = ATIVIDADES.resolverDisciplina(params.disciplina);
  if (!d) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "EduGera", item: SITE },
      { "@type": "ListItem", position: 2, name: "Atividades", item: `${SITE}/atividades` },
      { "@type": "ListItem", position: 3, name: d.disciplina },
    ],
  };
  return (
    <MolduraAtividades
      trilha={[{ rotulo: "EduGera", href: "/" }, { rotulo: "Atividades", href: "/atividades" }, { rotulo: d.disciplina }]}
      jsonLd={jsonLd}
    >
      <section className="pt-6">
        <p className="eyebrow">Atividades BNCC</p>
        <h1 className="font-titulo mt-3 text-[2.2rem] font-semibold leading-[1.1] text-marinho sm:text-[2.8rem]">
          Atividades de {d.disciplina} por ano
        </h1>
        <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-tinta">
          Escolha o ano para ver as habilidades da BNCC de {d.disciplina} e gerar apostilas, fichas e exercícios com gabarito.
        </p>
      </section>

      <ul className="mt-10 grid gap-3 sm:grid-cols-3">
        {d.combos.map((c) => (
          <li key={c.ano.slug}>
            <Link
              href={`/atividades/${d.slug}/${c.ano.slug}`}
              className="block rounded-3xl border border-marinho/10 bg-white p-5 shadow-sm hover:border-roxo"
            >
              <span className="font-titulo text-[1.3rem] font-semibold text-marinho">{c.ano.rotulo}</span>
              <span className="mt-1 block text-[14px] text-tinta">
                {c.habilidades.length} habilidade{c.habilidades.length > 1 ? "s" : ""} da BNCC
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <ChamadaCriar texto={`Gere seu material de ${d.disciplina} em minutos`} botao={`Criar atividade de ${d.disciplina}`} />
    </MolduraAtividades>
  );
}
