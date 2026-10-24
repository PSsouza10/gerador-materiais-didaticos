// Etapas do construtor guiado de redação (docs/specs/redacao.md, seção 3).
// Arquivo de dados: para mudar uma dica ou uma faixa de palavras, altere só aqui.
// parte: em qual parágrafo do texto montado a etapa entra (0 = tema, fora do texto).
export const ETAPAS_REDACAO = [
  {
    id: "tema",
    parte: 0,
    titulo: "Tema",
    dica: "Copie o tema da proposta ou escreva com suas palavras o assunto que a banca pediu.",
    min: 3,
    max: 20,
  },
  {
    id: "contexto",
    parte: 1,
    titulo: "Introdução: contexto",
    dica: "Apresente o assunto: um fato, um dado, uma lei ou uma situação da escola que mostre por que o tema importa hoje.",
    min: 12,
    max: 35,
  },
  {
    id: "tese",
    parte: 1,
    titulo: "Introdução: tese",
    dica: "Diga, em uma frase, o que você defende. Essa é a ideia que os parágrafos seguintes vão provar.",
    min: 8,
    max: 30,
  },
  {
    id: "argumento1",
    parte: 2,
    titulo: "Desenvolvimento 1: argumento normativo ou teórico",
    dica: "Sustente a tese com uma norma ou um autor (BNCC, LDB, ECA, PNE). Cite só o que você tem certeza de que existe.",
    min: 15,
    max: 45,
  },
  {
    id: "consequencia1",
    parte: 2,
    titulo: "Desenvolvimento 1: consequência",
    dica: "Explique o que acontece na prática quando essa norma é (ou não é) cumprida. Não repita a tese.",
    min: 12,
    max: 35,
  },
  {
    id: "argumento2",
    parte: 3,
    titulo: "Desenvolvimento 2: argumento prático",
    dica: "Traga um argumento DIFERENTE do primeiro: um exemplo da sala de aula, da escola ou da rede.",
    min: 15,
    max: 45,
  },
  {
    id: "principio2",
    parte: 3,
    titulo: "Desenvolvimento 2: princípio",
    dica: "Mostre o princípio por trás do exemplo (equidade, gestão democrática, aprendizagem de todos...).",
    min: 12,
    max: 35,
  },
  {
    id: "retomada",
    parte: 4,
    titulo: "Conclusão: retomada da tese",
    dica: "Retome a tese com outras palavras, ligando-a ao que você provou nos dois desenvolvimentos.",
    min: 8,
    max: 30,
  },
  {
    id: "proposta",
    parte: 4,
    titulo: "Conclusão: proposta de intervenção",
    dica: "Diga QUEM faz (agente), O QUE faz (ação), COMO faz (meio) e PARA QUÊ (finalidade).",
    min: 15,
    max: 45,
  },
];

// Checklist de revisão mostrado no resultado do construtor
export const CHECKLIST_REDACAO = [
  "A tese aparece na introdução e não é repetida igual no 2º parágrafo.",
  "Cada desenvolvimento traz um argumento diferente.",
  "O repertório (BNCC, LDB, ECA, PNE ou dado real) está citado sem inventar artigo.",
  "A proposta tem agente, ação, meio e finalidade.",
  "Conectivos ligam os parágrafos e nenhuma frase ficou sem verbo.",
];
