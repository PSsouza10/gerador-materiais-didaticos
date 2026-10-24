import Link from "next/link";
import MolduraAtividades, { ChamadaCriar, PilulasAnos } from "@/components/atividades/MolduraAtividades";
import { PROVA_PAULISTA } from "@/lib/provaPaulistaDados";
import { SITE, slugDisciplina } from "@/lib/atividades";
import { nomeDisciplina, linkGerador } from "@/lib/provaPaulistaSeo";

const TITULO = "Avaliação Prova Paulista e SARESP: simulados por ano e componente · EduGera";
const DESCRICAO =
  "Monte avaliações e simulados no formato da Prova Paulista e do SARESP para cada componente e ano, alinhados à BNCC e ao Currículo Paulista, com gabarito conferido e correção da turma por habilidade.";

export const metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/prova-paulista" },
  openGraph: { url: "/prova-paulista", title: TITULO, description: DESCRICAO },
};

export default function HubProvaPaulista() {
  const porDisciplina = [...new Set(PROVA_PAULISTA.combos.map((c) => c.disciplina))].map((d) => ({
    disciplina: d,
    combos: PROVA_PAULISTA.combos.filter((c) => c.disciplina === d),
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "EduGera", item: SITE },
      { "@type": "ListItem", position: 2, name: "Prova Paulista" },
    ],
  };
  return (
    <MolduraAtividades trilha={[{ rotulo: "EduGera", href: "/" }, { rotulo: "Prova Paulista" }]} jsonLd={jsonLd}>
      <section className="pt-6">
        <p className="eyebrow">Prova Paulista · SARESP · BNCC</p>
        <h1 className="font-titulo mt-3 text-[2.2rem] font-semibold leading-[1.1] text-marinho sm:text-[2.8rem]">
          Avaliação no padrão da Prova Paulista para cada turma
        </h1>
        <p className="mt-4 max-w-[64ch] text-[17px] leading-relaxed text-tinta">
          Escolha o componente e o ano para ver as habilidades da BNCC e montar uma avaliação de múltipla escolha no formato
          usado na Prova Paulista e no SARESP: texto-base, figuras, habilidade e descritor por questão, quatro alternativas,
          cartão-resposta e gabarito comentado para o professor.
        </p>
        <ul className="mt-5 grid max-w-[64ch] gap-2 text-[15px] text-tinta">
          <li>✓ Gabarito conferido pelo sistema e por uma segunda IA, que resolve cada questão sem ver a resposta.</li>
          <li>✓ Troque ou edite qualquer questão antes de imprimir.</li>
          <li>✓ Correção da turma com nota de cada aluno e relatório por habilidade.</li>
        </ul>
      </section>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {porDisciplina.map(({ disciplina, combos }) => (
          <section key={disciplina} className="rounded-3xl border border-marinho/10 bg-white p-5 shadow-sm">
            <h2 className="font-titulo text-[1.35rem] font-semibold text-marinho">{nomeDisciplina(disciplina)}</h2>
            <PilulasAnos itens={combos.map((c) => ({ href: `/prova-paulista/${slugDisciplina(disciplina)}/${c.ano.slug}`, rotulo: c.ano.rotulo }))} />
          </section>
        ))}
      </div>

      <ChamadaCriar texto="Monte o simulado da sua turma em minutos" botao="Criar avaliação" href={linkGerador({ aba: "prova" })} sub="Grátis para começar, com sua conta Google." />

      <p className="mt-8 text-[13px] text-tinta">
        O EduGera não é afiliado à Secretaria da Educação do Estado de São Paulo. As avaliações são inspiradas no formato da
        Prova Paulista e do SARESP. Veja também as <Link href="/atividades" className="text-roxo underline">atividades por ano</Link>.
      </p>
    </MolduraAtividades>
  );
}
