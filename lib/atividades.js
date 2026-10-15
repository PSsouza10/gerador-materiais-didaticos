// Páginas públicas para o Google (/atividades, /atividades/[disciplina] e
// /atividades/[disciplina]/[ano]). Uma página para cada disciplina × ano que tem
// habilidades na base oficial da BNCC. Ideia trazida pela auditoria do Kimi,
// revisada e corrigida aqui.
// Funções puras (recebem a lista de habilidades): os testes usam direto; as páginas
// usam lib/atividadesDados.js, que carrega a base oficial.
import { DISCIPLINAS } from "./opcoes.js";
import { DISCIPLINA_PARA_COMPONENTE, cobreAno } from "./bncc.js";

export { SITE } from "./site.js";

const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

export function slugDisciplina(disciplina) {
  return semAcento(disciplina).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}


// 1º ao 9º ano do Ensino Fundamental. (O Ensino Médio da BNCC é por área, não por
// série: as três séries teriam páginas idênticas, o que o Google trata como cópia.)
export const ANOS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((a) => ({
  valor: a,
  slug: `${a}-ano`,
  rotulo: `${a}º ano`,
}));

export function montarAtividades(habilidades = []) {
  const habilidadesDoCombo = (disciplina, valorAno) => {
    const componentes = DISCIPLINA_PARA_COMPONENTE[disciplina] || [];
    return habilidades.filter((h) => componentes.includes(h.d) && cobreAno(h, valorAno) === true);
  };

  // Só existe página para combinação com ao menos 1 habilidade na base.
  const combos = DISCIPLINAS.flatMap((d) =>
    ANOS.map((a) => ({ disciplina: d, ano: a, habilidades: habilidadesDoCombo(d, a.valor) })).filter((c) => c.habilidades.length > 0)
  );

  // Disciplinas com pelo menos uma página, na ordem do gerador, com seus anos.
  const disciplinas = DISCIPLINAS.map((d) => ({
    disciplina: d,
    slug: slugDisciplina(d),
    combos: combos.filter((c) => c.disciplina === d),
  })).filter((x) => x.combos.length > 0);

  const resolverDisciplina = (slugDisc) => disciplinas.find((x) => x.slug === slugDisc) || null;

  const resolverCombo = (slugDisc, slugAno) =>
    combos.find((c) => slugDisciplina(c.disciplina) === slugDisc && c.ano.slug === slugAno) || null;

  // Todos os endereços públicos desta seção (para o sitemap e os testes).
  const caminhos = () => [
    "/atividades",
    ...disciplinas.map((x) => `/atividades/${x.slug}`),
    ...combos.map((c) => `/atividades/${slugDisciplina(c.disciplina)}/${c.ano.slug}`),
  ];

  return { combos, disciplinas, resolverDisciplina, resolverCombo, caminhos };
}

export const cortar = (t, n = 160) => (t.length > n ? `${t.slice(0, n).trimEnd()}…` : t);

// Perguntas frequentes da página de cada ano. Cada resposta descreve o que o
// EduGera faz hoje (conferido no código): login Google obrigatório para gerar,
// código BNCC conferido na base oficial, conferências automáticas de gabarito,
// unidades e alternativas repetidas, plano gratuito sem cobrança.
export function perguntasDoCombo(disciplina, ano) {
  return [
    {
      q: `Como criar atividades de ${disciplina} do ${ano.rotulo}?`,
      a: `Entre com sua conta Google, escolha ${disciplina} e o ${ano.rotulo}, selecione a habilidade da BNCC e digite o tema. O EduGera gera a apostila com exercícios, gabarito e ilustração, e você revisa cada exercício antes de baixar o PDF.`,
    },
    {
      q: `As atividades de ${disciplina} seguem a BNCC?`,
      a: "Sim. O código da habilidade é conferido na base oficial da BNCC antes da geração, e o material sai com o código e o texto da habilidade.",
    },
    {
      q: "A inteligência artificial pode errar o conteúdo?",
      a: "Pode. Por isso o EduGera faz conferências automáticas (gabarito recalculado, unidades de medida, alternativas repetidas) e recomenda revisar o material antes de aplicar em sala.",
    },
    {
      q: "É gratuito?",
      a: "Sim, há um plano gratuito com limite mensal de gerações por conta. Os planos pagos ainda não estão à venda e nenhuma cobrança é feita.",
    },
  ];
}
