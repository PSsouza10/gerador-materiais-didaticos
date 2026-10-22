import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import MolduraAtividades, { ChamadaCriar } from "@/components/atividades/MolduraAtividades";
import QuestaoExemplo from "@/components/atividades/QuestaoExemplo";
import { PROVA_PAULISTA } from "@/lib/provaPaulistaDados";
import { SITE, slugDisciplina, cortar } from "@/lib/atividades";
import { nomeDisciplina, slugCodigo, linkGerador, rotuloAnosDaHabilidade, anosDaHabilidade, exemploDaHabilidade } from "@/lib/provaPaulistaSeo";

// Uma página por habilidade da BNCC (1.617). Geradas na primeira visita e guardadas
// (não pesam no build); código inexistente → 404.
export const dynamicParams = true;
export const revalidate = 604800; // 7 dias

export function generateStaticParams() {
  return [];
}

export function generateMetadata({ params }) {
  const h = PROVA_PAULISTA.resolverHabilidade(params.codigo);
  if (!h) return {};
  const titulo = `${h.c} · BNCC ${h.d} · ${rotuloAnosDaHabilidade(h)} · EduGera`;
  const descricao = `${h.c}: ${cortar(h.t, 150)} Gere avaliação no padrão Prova Paulista, apostila e plano de aula desta habilidade.`;
  const url = `/bncc/${slugCodigo(h.c)}`;
  return { title: titulo, description: descricao, alternates: { canonical: url }, openGraph: { url, title: titulo, description: descricao } };
}

export default function PaginaHabilidade({ params }) {
  const h = PROVA_PAULISTA.resolverHabilidade(params.codigo);
  if (!h) notFound();
  if (params.codigo !== slugCodigo(h.c)) permanentRedirect(`/bncc/${slugCodigo(h.c)}`);
  const disciplina = PROVA_PAULISTA.disciplinaDoComponente(h.d);
  const ano = anosDaHabilidade(h)[0] || "";
  const combo = PROVA_PAULISTA.comboDaHabilidade(h);
  const exemplo = exemploDaHabilidade(h);
  const vizinhas = PROVA_PAULISTA.vizinhas(h);
  const nome = disciplina ? nomeDisciplina(disciplina) : h.d;
  const anos = rotuloAnosDaHabilidade(h);
  const prova = linkGerador({ aba: "prova", codigo: h.c, disciplina: disciplina || "", ano });
  const apostila = linkGerador({ aba: "apostila", codigo: h.c, disciplina: disciplina || "", ano });
  const plano = linkGerador({ aba: "plano", codigo: h.c, disciplina: disciplina || "", ano });

  const trilha = [{ rotulo: "EduGera", href: "/" }, { rotulo: "Prova Paulista", href: "/prova-paulista" }];
  if (combo) trilha.push({ rotulo: `${nome} · ${combo.ano.rotulo}`, href: `/prova-paulista/${slugDisciplina(combo.disciplina)}/${combo.ano.slug}` });
  trilha.push({ rotulo: h.c });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trilha.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.rotulo, ...(t.href ? { item: `${SITE}${t.href === "/" ? "" : t.href}` } : {}) })),
  };

  return (
    <MolduraAtividades trilha={trilha} jsonLd={jsonLd}>
      <section className="pt-6">
        <p className="eyebrow">
          BNCC · {h.d} · {anos}
        </p>
        <h1 className="font-titulo mt-3 text-[2.1rem] font-semibold leading-[1.1] text-marinho sm:text-[2.6rem]">Habilidade {h.c}</h1>
        <blockquote className="mt-4 max-w-[68ch] rounded-2xl border-l-4 border-roxo bg-white p-5 text-[17px] leading-relaxed text-marinho">
          {h.t}
        </blockquote>
        <p className="mt-2 text-[13px] text-tinta">Texto oficial da Base Nacional Comum Curricular (BNCC).</p>
      </section>

      <section className="mt-8">
        <h2 className="font-titulo text-[1.5rem] font-semibold text-marinho">Prepare a aula desta habilidade</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href={prova} className="rounded-2xl border border-marinho/10 bg-white p-4 hover:border-roxo">
            <b className="text-marinho">Avaliação Prova Paulista</b>
            <p className="mt-1 text-[14px] text-tinta">Questões de múltipla escolha com descritor, cartão-resposta e gabarito conferido.</p>
          </Link>
          <Link href={apostila} className="rounded-2xl border border-marinho/10 bg-white p-4 hover:border-roxo">
            <b className="text-marinho">Apostila</b>
            <p className="mt-1 text-[14px] text-tinta">Explicação, exemplos e exercícios com gabarito, versão do aluno e do professor.</p>
          </Link>
          <Link href={plano} className="rounded-2xl border border-marinho/10 bg-white p-4 hover:border-roxo">
            <b className="text-marinho">Plano de aula</b>
            <p className="mt-1 text-[14px] text-tinta">Na estrutura do Currículo Paulista, em Word e PDF.</p>
          </Link>
        </div>
      </section>

      {exemplo && (
        <section className="mt-10">
          <h2 className="font-titulo text-[1.5rem] font-semibold text-marinho">Exemplo de questão</h2>
          <QuestaoExemplo questao={exemplo} codigo={h.c} />
        </section>
      )}

      <ChamadaCriar texto={`Material de ${h.c} pronto em minutos`} botao="Criar avaliação desta habilidade" href={prova} sub="Grátis para começar, com sua conta Google." />

      {vizinhas.length > 0 && (
        <section className="mt-12">
          <h2 className="font-titulo text-[1.3rem] font-semibold text-marinho">Outras habilidades {combo ? `de ${nome} do ${combo.ano.rotulo}` : `de ${h.d}`}</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {vizinhas.map((v) => (
              <li key={v.c}>
                <Link href={`/bncc/${slugCodigo(v.c)}`} className="block rounded-xl bg-roxo-claro/60 p-3 text-[14px] text-marinho hover:bg-roxo-claro">
                  <b>{v.c}</b> · {cortar(v.t, 90)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </MolduraAtividades>
  );
}
