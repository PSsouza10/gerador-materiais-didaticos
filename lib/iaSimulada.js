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

export const PLANO_SIMULADO = {
  plano_de_aula: {
    unidade_tematica: "[TESTE] Grandezas e medidas",
    objeto_de_conhecimento: "Cálculo de volume de blocos retangulares",
    habilidades: [{ codigo: "EF07MA30", descricao: "texto de teste" }],
    objetivos: ["Calcular o volume de blocos retangulares", "Relacionar volume e capacidade"],
    aulas: [
      { numero: 1, titulo: "Quanto cabe na caixa?", introducao: "Pergunta sobre a caixa-d'água.", desenvolvimento: "Montagem de cubos e contagem.", fechamento: "Registro da fórmula V = c × l × h." },
      { numero: 2, titulo: "Do volume ao litro", introducao: "Retomada da aula anterior.", desenvolvimento: "Conversão de dm³ em litros com embalagens.", fechamento: "Exercícios em dupla e correção coletiva." },
    ],
    recursos: ["Cubos de papel", "Embalagens vazias", "Régua"],
    avaliacao: { criterios: ["Calcula o volume corretamente"], instrumentos: ["Observação", "Exercícios"] },
    recuperacao: "Retomada com material concreto para quem não atingiu o objetivo.",
    adaptacoes: "Apoio visual e exemplos com objetos reais.",
  },
};

// Avaliação (Prova Paulista / SARESP) — o item 3 (aquário) vem com a letra errada de propósito,
// para o ambiente de teste mostrar a correção automática do gabarito.
export const AVALIACAO_SIMULADA = {
  titulo: "[TESTE] Avaliação — Volume de blocos retangulares",
  itens: [
    { habilidade: "EF07MA30", descritor: "Calcular o volume de um bloco retangular em cm³", dificuldade: "facil", textoBase: "Uma caixa de sapatos tem 30 cm de comprimento, 20 cm de largura e 10 cm de altura.", figura: null, comando: "Qual é o volume dessa caixa?", alternativas: ["A) 60 cm³", "B) 600 cm³", "C) 6 000 cm³", "D) 60 000 cm³"], resolucao: "V = 30 × 20 × 10 = 6000. Portanto, o volume é 6 000 cm³.", correta: "C", distratores: { A: "Somou as três medidas (30 + 20 + 10 = 60).", B: "Multiplicou só comprimento e largura (30 × 20 = 600).", D: "Acrescentou um zero a mais ao multiplicar." } },
    { habilidade: "EF07MA30", descritor: "Identificar a fórmula do volume de um bloco retangular", dificuldade: "facil", textoBase: "Para calcular quanto cabe em uma caixa, Rafa escreveu: volume = comprimento + largura + altura.", figura: null, comando: "Qual expressão Rafa deveria ter usado?", alternativas: ["A) comprimento × largura × altura", "B) comprimento × largura", "C) 2 × (comprimento + largura)", "D) comprimento + largura + altura"], resolucao: "O volume do bloco retangular é o produto das três dimensões: comprimento × largura × altura.", correta: "A", distratores: { B: "Confundiu volume com área da base.", C: "Confundiu volume com perímetro da base.", D: "Repetiu o erro de Rafa, somando as medidas." } },
    { habilidade: "EF07MA30", descritor: "Converter decímetros cúbicos em litros", dificuldade: "media", textoBase: "Um aquário tem 5 dm de comprimento, 3 dm de largura e 4 dm de altura. Cada 1 dm³ corresponde a 1 litro.", figura: { tipo: "tabela", cabecalho: ["Medida", "Valor"], linhas: [["Comprimento", "5 dm"], ["Largura", "3 dm"], ["Altura", "4 dm"]], legenda: "Medidas do aquário" }, comando: "Observe a tabela. Quantos litros de água cabem no aquário cheio?", alternativas: ["A) 12 litros", "B) 20 litros", "C) 60 litros", "D) 600 litros"], resolucao: "V = 5 × 3 × 4 = 60. Portanto, cabem 60 litros.", correta: "B", distratores: { A: "Somou as medidas.", B: "Multiplicou só comprimento e altura.", D: "Converteu dm³ em litros multiplicando por 10." } },
    { habilidade: "EF07MA30", descritor: "Comparar volumes de blocos retangulares", dificuldade: "media", textoBase: "A caixa-d'água de uma escola tem 2 m de comprimento, 1 m de largura e 1 m de altura. A de uma casa tem 1 m de comprimento, 1 m de largura e 1 m de altura.", figura: null, comando: "Quantas vezes o volume da caixa da escola é maior que o da casa?", alternativas: ["A) 1 vez", "B) 2 vezes", "C) 3 vezes", "D) 4 vezes"], resolucao: "Escola: 2 × 1 × 1 = 2 m³; casa: 1 × 1 × 1 = 1 m³; 2 ÷ 1 = 2. Portanto, 2 vezes.", correta: "B", distratores: { A: "Achou que caixas com a mesma altura têm o mesmo volume.", C: "Somou as medidas da caixa da escola (2 + 1 = 3).", D: "Elevou ao quadrado a medida que dobrou." } },
    { habilidade: "EF07MA30", descritor: "Resolver problema de volume com metros cúbicos e litros", dificuldade: "dificil", textoBase: "Uma piscina infantil tem 3 m de comprimento, 2 m de largura e 0,5 m de profundidade. Cada 1 m³ corresponde a 1 000 litros.", figura: null, comando: "Quantos litros de água são necessários para encher a piscina?", alternativas: ["A) 300 litros", "B) 3 000 litros", "C) 5 500 litros", "D) 30 000 litros"], resolucao: "V = 3 × 2 × 0,5 = 3 m³; 3 × 1000 = 3000. Portanto, 3 000 litros.", correta: "B", distratores: { A: "Converteu m³ em litros multiplicando por 100.", C: "Somou as medidas (5,5) e multiplicou por 1 000.", D: "Usou 5 m de profundidade em vez de 0,5 m." } },
  ],
};

// Qual resposta fixa combina com o pedido (pelo formato que o pedido exige)
export function respostaSimulada(prompt = "") {
  if (/"distratores"/.test(prompt)) return AVALIACAO_SIMULADA;
  if (/"correcoes"/.test(prompt)) return { correcoes: ["[TESTE] revisão simulada"], ...PLANO_SIMULADO };
  if (/"plano_de_aula"/.test(prompt)) return PLANO_SIMULADO;
  if (/"apontamentos"/.test(prompt)) return REVISAO_SIMULADA;
  if (/Reescreva UM exercício/.test(prompt)) return EXERCICIO_SIMULADO;
  return APOSTILA_SIMULADA;
}
