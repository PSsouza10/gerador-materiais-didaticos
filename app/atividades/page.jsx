import Link from "next/link";
import MolduraAtividades, { ChamadaCriar, PilulasAnos } from "@/components/atividades/MolduraAtividades";
import { ATIVIDADES } from "@/lib/atividadesDados";
import { SITE } from "@/lib/atividades";

const TITULO = "Atividades por disciplina e ano alinhadas à BNCC · EduGera";
const DESCRICAO =
  "Gere apostilas, fichas de estudo e exercícios com gabarito para cada disciplina e ano do Ensino Fundamental, alinhados às habilidades oficiais da BNCC.";

export const metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/atividades" },
  openGraph: { url: "/atividades", title: TITULO, description: DESCRICAO },
};

export default function HubAtividades() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "EduGera", item: SITE },
      { "@type": "ListItem", position: 2, name: "Atividades" },
    ],
  };
  return (
    <MolduraAtividades trilha={[{ rotulo: "EduGera", href: "/" }, { rotulo: "Atividades" }]} jsonLd={jsonLd}>
      <section className="pt-6">
        <p className="eyebrow">Atividades BNCC</p>
        <h1 className="font-titulo mt-3 text-[2.2rem] font-semibold leading-[1.1] text-marinho sm:text-[2.8rem]">
          Atividades por disciplina e ano
        </h1>
        <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-tinta">
          Escolha a disciplina e o ano para ver as habilidades da BNCC e gerar apostilas, exercícios e fichas com gabarito,
          ilustração e PDF pronto para imprimir.
        </p>
      </section>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {ATIVIDADES.disciplinas.map(({ disciplina, slug, combos }) => (
          <section key={slug} className="rounded-3xl border border-marinho/10 bg-white p-5 shadow-sm">
            <h2 className="font-titulo text-[1.35rem] font-semibold text-marinho">
              <Link href={`/atividades/${slug}`} className="hover:text-roxo">{disciplina}</Link>
            </h2>
            <PilulasAnos itens={combos.map((c) => ({ href: `/atividades/${slug}/${c.ano.slug}`, rotulo: c.ano.rotulo }))} />
          </section>
        ))}
      </div>

      <ChamadaCriar texto="Pronto para criar seu material?" botao="Criar minha apostila" />
    </MolduraAtividades>
  );
}
