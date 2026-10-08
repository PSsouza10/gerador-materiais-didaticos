// Respostas fixas da "IA" no ambiente de TESTE (IA_SIMULADA=1; nunca em produção).
// Permitem testar geração, revisão, correção, PDF e histórico sem gastar crédito e
// sem nenhum dado real. O título começa com [TESTE] para não confundir com material de verdade.

export const APOSTILA_SIMULADA = {
  tituloDidatico: "[TESTE] Multiplicação no Dia a Dia",
  resumoPedagogico: "Multiplicar é somar parcelas iguais: 3 × 4 = 4 + 4 + 4 = 12.",
  conceitos: [
    { termo: "Multiplicação", definicao: "Operação que junta parcelas iguais." },
    { termo: "Fator", definicao: "Cada número que é multiplicado." },
    { termo: "Produto", definicao: "Resultado da multiplicação." },
  ],
  formulas: [{ nome: "Multiplicação", expressao: "fator × fator = produto", descricao: "Ex.: 3 × 4 = 12." }],
  dicas: ["Troque a ordem dos fatores para conferir.", "Use a tabuada do 10 como apoio.", "Desenhe grupos iguais."],
  lembreteImportante: "A ordem dos fatores não altera o produto.",
  aplicacaoPratica: {
    titulo: "Na feira",
    situacao: "A Vó Ana compra 3 dúzias de ovos.",
    exemplos: ["3 × 12 = 36 ovos", "4 × 5 = 20 laranjas"],
  },
  figuraExplicativa: { tipo: "grade", linhas: 3, colunas: 4, pintadas: 12, legenda: "3 linhas de 4: 3 × 4 = 12" },
  cena: {
    titulo: "Ovos na feira",
    lugar: "feira",
    falas: [
      { quem: "theo", texto: "Vó, 3 caixas com 12 ovos dá 15 ovos, né?" },
      { quem: "vo", texto: "Conte de novo, Théo: cada caixa tem 12." },
      { quem: "lia", texto: "Então são 12 + 12 + 12?" },
    ],
    figura: { tipo: "tabela", cabecalho: ["Caixa", "Ovos"], linhas: [["1", "12"], ["2", "12"], ["3", "12"]], legenda: "" },
    pergunta: "Quantos ovos há nas 3 caixas?",
  },
  exercicios: [
    {
      fala: { quem: "theo", texto: "Comprei 3 pacotes com 12 figurinhas cada." },
      enunciado: "Quantas figurinhas o Théo comprou?",
      tipo: "multipla_escolha",
      exigencia: "aplicar",
      alternativas: ["a) 15", "b) 24", "c) 36", "d) 48"],
      figura: null,
      resolucao: "3 × 12 = 36. Portanto, são 36 figurinhas.",
      resposta: "c) 36",
    },
    {
      fala: { quem: "lia", texto: "Arrumei as cadeiras em 4 filas de 5." },
      enunciado: "Observe a malha e responda: quantas cadeiras há?",
      tipo: "aberta",
      exigencia: "compreender",
      alternativas: [],
      figura: { tipo: "grade", linhas: 4, colunas: 5, pintadas: 20, legenda: "" },
      resolucao: "4 × 5 = 20. Portanto, há 20 cadeiras.",
      resposta: "20 cadeiras",
    },
    {
      fala: { quem: "edu", texto: "Um colega disse que 6 × 7 = 48." },
      enunciado: "O colega está certo? Explique e corrija.",
      tipo: "explicar",
      exigencia: "analisar",
      alternativas: [],
      figura: null,
      resolucao: "6 × 7 = 42. Portanto, ele errou: o produto é 42.",
      resposta: "Não. 6 × 7 = 42.",
    },
    {
      fala: { quem: "vo", texto: "Cada bolo leva 2 ovos e vou fazer 5 bolos." },
      enunciado: "Complete a tabela: quantos ovos são necessários para 5 bolos? ____",
      tipo: "completar",
      exigencia: "aplicar",
      alternativas: [],
      figura: { tipo: "tabela", cabecalho: ["Bolos", "Ovos"], linhas: [["1", "2"], ["5", "____"]], legenda: "" },
      resolucao: "5 × 2 = 10. Portanto, são 10 ovos.",
      resposta: "10 ovos",
    },
    {
      fala: { quem: "lia", texto: "Será que 8 × 3 é igual a 3 × 8?" },
      enunciado: "Verdadeiro ou falso: 1) 8 × 3 = 3 × 8. 2) 8 × 3 = 11.",
      tipo: "verdadeiro_falso",
      exigencia: "lembrar",
      alternativas: [],
      figura: null,
      resolucao: "8 × 3 = 24 e 3 × 8 = 24. Portanto, 1) V e 2) F.",
      resposta: "1) V; 2) F",
    },
  ],
};

export const REVISAO_SIMULADA = { apontamentos: [] };

export const EXERCICIO_SIMULADO = {
  fala: { quem: "edu", texto: "Uma caixa tem 6 lápis. Quantos lápis há em 4 caixas?" },
  enunciado: "Calcule o total de lápis em 4 caixas.",
  tipo: "aberta",
  exigencia: "aplicar",
  alternativas: [],
  figura: null,
  resolucao: "4 × 6 = 24. Portanto, são 24 lápis.",
  resposta: "24 lápis",
};

// Qual resposta fixa combina com o pedido (pelo formato que o pedido exige)
export function respostaSimulada(prompt = "") {
  if (/"apontamentos"/.test(prompt)) return REVISAO_SIMULADA;
  if (/Reescreva UM exercício/.test(prompt)) return EXERCICIO_SIMULADO;
  return APOSTILA_SIMULADA;
}
