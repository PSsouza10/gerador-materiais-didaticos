// Páginas públicas para o Google: /prova-paulista, /prova-paulista/[disciplina]/[ano]
// e /bncc/[codigo] (uma página por habilidade da BNCC). Funções puras sobre a base
// oficial (data/bncc-habilidades.json); os testes usam direto.
import { ANOS, slugDisciplina } from "./atividades.js";
import { DISCIPLINAS } from "./opcoes.js";
import { DISCIPLINA_PARA_COMPONENTE, cobreAno, rotuloAno } from "./bncc.js";
import { questaoDoSistema } from "./questoesSistema.js";

const NOME_DISCIPLINA = { Português: "Língua Portuguesa", Informática: "Computação" };
export const nomeDisciplina = (d) => NOME_DISCIPLINA[d] || d;

// Disciplina do gerador a partir do componente da base (a 1ª que o aceita)
const disciplinaDoComponente = (componente) => DISCIPLINAS.find((d) => (DISCIPLINA_PARA_COMPONENTE[d] || []).includes(componente)) || null;

export const slugCodigo = (c = "") => String(c).toLowerCase().replace(/[^a-z0-9]/g, "");

export function anosDaHabilidade(h) {
  if (h.e === "EM") return [];
  return String(h.a || "")
    .split(/\s*,\s*/)
    .filter((a) => /^[1-9]$/.test(a));
}

export function rotuloAnosDaHabilidade(h) {
  if (h.e === "EM") return "Ensino Médio";
  const anos = anosDaHabilidade(h);
  if (!anos.length) return "Ensino Fundamental";
  return `${anos.map((a) => `${a}º`).join(", ").replace(/, ([^,]*)$/, " e $1")} ano do Ensino Fundamental`;
}

// Questão de exemplo montada pelo próprio sistema (só Matemática, temas que ele sabe
// calcular: área, perímetro, volume, gráficos, ângulos). Sem IA: o gabarito é calculado.
// Só mostra quando o próprio texto da habilidade fala do assunto e o ano comporta a conta
// (ex.: volume de bloco não aparece numa habilidade de contagem do 1º ano).
const EXEMPLOS = [
  { tema: "volume de blocos retangulares", re: /\bvolumes?\b/i, anoMin: 5 },
  { tema: "perímetro de polígonos", re: /per[ií]metro/i, anoMin: 4 },
  { tema: "leitura de gráficos", re: /gr[áa]fico/i, anoMin: 3 },
  { tema: "área de retângulos e triângulos", re: /(^|[^a-zà-ú])[áa]reas?\b(?! do conhecimento)/i, anoMin: 4 },
  { tema: "medida de ângulos", re: /(^|[^a-zà-ú])[âa]ngulos?\b/i, anoMin: 6 },
];
export function exemploDaHabilidade(h, k = 0) {
  if (h.d !== "Matemática" || h.e !== "EF") return null;
  const ano = Math.min(...anosDaHabilidade(h).map(Number));
  const e = EXEMPLOS.find((x) => x.re.test(h.t) && ano >= x.anoMin);
  if (!e) return null;
  const q = questaoDoSistema({ tema: e.tema }, k, { habilidades: [{ codigo: h.c, verificada: true }], dificuldade: ano <= 5 ? "facil" : "media" });
  return q && q.correta ? q : null;
}

export function montarProvaPaulista(habilidades = []) {
  const porCodigo = new Map(habilidades.map((h) => [slugCodigo(h.c), h]));

  const combos = DISCIPLINAS.flatMap((d) =>
    ANOS.map((ano) => {
      const comp = DISCIPLINA_PARA_COMPONENTE[d] || [];
      const lista = habilidades.filter((h) => comp.includes(h.d) && cobreAno(h, ano.valor) === true);
      return { disciplina: d, ano, habilidades: lista };
    }).filter((c) => c.habilidades.length > 0)
  );

  const resolverCombo = (slugDisc, slugAno) => combos.find((c) => slugDisciplina(c.disciplina) === slugDisc && c.ano.slug === slugAno) || null;
  const resolverHabilidade = (slug) => porCodigo.get(slugCodigo(slug)) || null;

  // A página de uma habilidade aponta para o combo do 1º ano dela (ou nenhum, no EM)
  const comboDaHabilidade = (h) => {
    const disc = disciplinaDoComponente(h.d);
    const ano = anosDaHabilidade(h)[0];
    return disc && ano ? resolverCombo(slugDisciplina(disc), `${ano}-ano`) : null;
  };

  const vizinhas = (h, n = 6) => {
    const combo = comboDaHabilidade(h);
    const lista = combo ? combo.habilidades : habilidades.filter((x) => x.d === h.d && x.e === h.e);
    const i = lista.findIndex((x) => x.c === h.c);
    return lista.filter((x) => x.c !== h.c).slice(Math.max(0, i - Math.floor(n / 2)), Math.max(0, i - Math.floor(n / 2)) + n);
  };

  // Exemplo de um combo: a 1ª habilidade de Matemática para a qual o sistema monta uma questão
  const exemploDoCombo = (combo) => {
    for (const h of combo.habilidades) {
      const q = exemploDaHabilidade(h);
      if (q) return { habilidade: h, questao: q };
    }
    return null;
  };

  const caminhos = () => [
    "/prova-paulista",
    ...combos.map((c) => `/prova-paulista/${slugDisciplina(c.disciplina)}/${c.ano.slug}`),
    ...habilidades.map((h) => `/bncc/${slugCodigo(h.c)}`),
  ];

  return { combos, resolverCombo, resolverHabilidade, comboDaHabilidade, vizinhas, exemploDoCombo, caminhos, disciplinaDoComponente };
}

// Link para o gerador já na aba certa, com a habilidade e o ano preenchidos
export function linkGerador({ aba = "prova", codigo = "", disciplina = "", ano = "" } = {}) {
  const p = new URLSearchParams();
  p.set("aba", aba);
  if (codigo) p.set("bncc", codigo);
  if (disciplina) p.set("disciplina", disciplina);
  if (ano) p.set("ano", ano);
  return `/criar?${p.toString()}`;
}

export function perguntasProvaPaulista(disciplina, ano) {
  const nome = nomeDisciplina(disciplina);
  return [
    {
      q: `Como montar um simulado da Prova Paulista de ${nome} do ${ano.rotulo}?`,
      a: `Entre com sua conta Google, abra "Avaliação", escolha ${nome}, o ${ano.rotulo} e a habilidade. O EduGera monta a prova com texto-base, figuras, descritor e quatro alternativas por questão, com cartão-resposta e versão do professor com gabarito comentado.`,
    },
    {
      q: "O gabarito é conferido?",
      a: "Sim. O sistema refaz as contas da resolução, confere se a letra marcada é a certa e uma segunda IA resolve cada questão sem ver o gabarito. Questão com problema é refeita ou trocada antes de chegar ao professor, que ainda pode trocar ou editar qualquer questão.",
    },
    {
      q: "Dá para corrigir a prova da turma?",
      a: "Sim. Lance as respostas de cada aluno (no plano Pro, pela foto do cartão-resposta) e veja a nota de cada um e o acerto por habilidade, com o erro mais comum e o que retomar.",
    },
    {
      q: "É gratuito?",
      a: "Há um plano gratuito com 2 gerações por mês. O plano Pro custa R$ 39,90 por mês ou R$ 358,80 por ano e inclui 30 gerações por mês, correção pela foto e relatório da turma em PDF e planilha.",
    },
  ];
}

export { rotuloAno };
