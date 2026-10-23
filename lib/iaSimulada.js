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
    { habilidade: "EF07MA30", descritor: "Calcular o volume de um bloco retangular em cm³", dificuldade: "facil", textoBase: "A figura mostra uma caixa de sapatos com a forma de um bloco retangular e suas medidas.", figura: { tipo: "bloco", comprimento: 30, largura: 20, altura: 10, unidade: "cm", legenda: "Caixa de sapatos" }, leituraFigura: "As três medidas da caixa: 30 cm, 20 cm e 10 cm.", comando: "Qual é o volume dessa caixa?", alternativas: ["A) 60 cm³", "B) 600 cm³", "C) 6 000 cm³", "D) 60 000 cm³"], resolucao: "V = 30 × 20 × 10 = 6000. Portanto, o volume é 6 000 cm³.", correta: "C", distratores: { A: "Somou as três medidas (30 + 20 + 10 = 60).", B: "Multiplicou só comprimento e largura (30 × 20 = 600).", D: "Acrescentou um zero a mais ao multiplicar." } },
    { habilidade: "EF07MA30", descritor: "Identificar a fórmula do volume de um bloco retangular", dificuldade: "facil", textoBase: "Para calcular quanto cabe em uma caixa, Rafa escreveu: volume = comprimento + largura + altura.", figura: null, comando: "Qual expressão Rafa deveria ter usado?", alternativas: ["A) comprimento × largura × altura", "B) comprimento × largura", "C) 2 × (comprimento + largura)", "D) comprimento + largura + altura"], resolucao: "O volume do bloco retangular é o produto das três dimensões: comprimento × largura × altura.", correta: "A", distratores: { B: "Confundiu volume com área da base.", C: "Confundiu volume com perímetro da base.", D: "Repetiu o erro de Rafa, somando as medidas." } },
    { habilidade: "EF07MA30", descritor: "Converter decímetros cúbicos em litros", dificuldade: "media", textoBase: "Um aquário tem as medidas mostradas na tabela. Cada 1 dm³ corresponde a 1 litro.", leituraFigura: "As três medidas do aquário na tabela: 5 dm, 3 dm e 4 dm.", figura: { tipo: "tabela", cabecalho: ["Medida", "Valor"], linhas: [["Comprimento", "5 dm"], ["Largura", "3 dm"], ["Altura", "4 dm"]], legenda: "Medidas do aquário" }, comando: "Observe a tabela. Quantos litros de água cabem no aquário cheio?", alternativas: ["A) 12 litros", "B) 20 litros", "C) 60 litros", "D) 600 litros"], resolucao: "V = 5 × 3 × 4 = 60. Portanto, cabem 60 litros.", correta: "B", distratores: { A: "Somou as medidas.", B: "Multiplicou só comprimento e altura.", D: "Converteu dm³ em litros multiplicando por 10." } },
    { habilidade: "EF07MA30", descritor: "Comparar volumes de blocos retangulares", dificuldade: "media", textoBase: "A caixa-d'água de uma escola tem 2 m de comprimento, 1 m de largura e 1 m de altura. A de uma casa tem 1 m de comprimento, 1 m de largura e 1 m de altura.", figura: null, comando: "Quantas vezes o volume da caixa da escola é maior que o da casa?", alternativas: ["A) 1 vez", "B) 2 vezes", "C) 3 vezes", "D) 4 vezes"], resolucao: "Escola: 2 × 1 × 1 = 2 m³; casa: 1 × 1 × 1 = 1 m³; 2 ÷ 1 = 2. Portanto, 2 vezes.", correta: "B", distratores: { A: "Achou que caixas com a mesma altura têm o mesmo volume.", C: "Somou as medidas da caixa da escola (2 + 1 = 3).", D: "Elevou ao quadrado a medida que dobrou." } },
    { habilidades: ["EF07MA30", "EF07MA36"], descritor: "Ler gráfico de linhas e converter metros cúbicos em litros", dificuldade: "dificil", textoBase: "O gráfico mostra o consumo de água da família de Bia, de janeiro a abril, conforme a conta de água. Cada 1 m³ corresponde a 1 000 litros.", figura: { tipo: "linhas", titulo: "Consumo de água (m³)", unidade: "m³", itens: [{ rotulo: "jan", valor: 12 }, { rotulo: "fev", valor: 15 }, { rotulo: "mar", valor: 18 }, { rotulo: "abr", valor: 14 }], legenda: "Consumo de água da família de Bia" }, leituraFigura: "Os consumos de janeiro (12 m³) e de março (18 m³) no gráfico.", comando: "Quantos litros de água a família consumiu a mais em março do que em janeiro?", alternativas: ["A) 600 litros", "B) 6 000 litros", "C) 12 000 litros", "D) 18 000 litros"], resolucao: "18 − 12 = 6 m³; 6 × 1000 = 6000. Portanto, 6 000 litros a mais.", correta: "B", distratores: { A: "Converteu multiplicando por 100 (6 × 100 = 600).", C: "Usou só o consumo de janeiro (12 × 1000 = 12 000).", D: "Usou só o consumo de março (18 × 1000 = 18 000)." } },
  ],
};

// Avaliação de ÁREA com os mesmos tipos de erro que a IA real cometeu (16/10/2026):
// gabarito fora das alternativas, explicação com conta errada, medidas repetidas no texto
// e figura composta sem desenho. A 2ª tentativa ("itensRefeitos") devolve as questões certas.
const qa = (o) => ({ habilidades: ["EF07MA32"], ...o });
export const AVALIACAO_AREA_SIMULADA = {
  titulo: "[TESTE] Avaliação — Área de retângulos, quadrados e triângulos",
  itens: [
    qa({ habilidades: ["EF07MA31"], descritor: "Calcular a área de um retângulo", dificuldade: "facil", textoBase: "A figura mostra o tapete da sala de leitura da escola.", figura: { tipo: "poligono", forma: "retangulo", base: 8, altura: 5, unidade: "m", legenda: "" }, leituraFigura: "As medidas do tapete: 8 m e 5 m.", comando: "Qual é a área do tapete?", alternativas: ["A) 13 m²", "B) 26 m²", "C) 40 m²", "D) 64 m²"], resolucao: "A = 8 × 5 = 40 m². Portanto, a área é 40 m².", correta: "C", distratores: { A: "Somou as medidas: 8 + 5 = 13.", B: "Calculou o perímetro: 2 × (8 + 5) = 26.", D: "Multiplicou a base por ela mesma: 8 × 8 = 64." } }),
    qa({ habilidades: ["EF07MA31"], descritor: "Calcular a área de um quadrado", dificuldade: "facil", textoBase: "A figura mostra um azulejo quadrado.", figura: { tipo: "poligono", forma: "quadrado", lado: 6, unidade: "cm", legenda: "Azulejo" }, leituraFigura: "A medida do lado: 6 cm.", comando: "Qual é a área do azulejo?", alternativas: ["A) 12 cm²", "B) 24 cm²", "C) 36 cm²", "D) 72 cm²"], resolucao: "A = 6 × 6 = 36 cm². Portanto, 36 cm².", correta: "C", distratores: { A: "Somou dois lados: 6 + 6 = 12.", B: "Calculou o perímetro: 4 × 6 = 20.", D: "Multiplicou o lado por 12: 6 × 12 = 72." } }),
    qa({ descritor: "Calcular a área de um triângulo", dificuldade: "media", textoBase: "Um terreno triangular tem base de 6 m e altura de 4 m, como mostra a figura.", figura: { tipo: "poligono", forma: "triangulo", base: 6, altura: 4, unidade: "m", legenda: "Terreno" }, leituraFigura: "A base (6 m) e a altura (4 m) do triângulo.", comando: "Qual é a área do terreno?", alternativas: ["A) 10 m²", "B) 12 m²", "C) 20 m²", "D) 24 m²"], resolucao: "A = (6 × 4) ÷ 2 = 12 m². Portanto, 12 m².", correta: "B", distratores: { A: "Somou base e altura: 6 + 4 = 10.", C: "Calculou 2 × (6 + 4) = 20, como se fosse o perímetro de um retângulo.", D: "Esqueceu de dividir por 2: 6 × 4 = 24." } }),
    qa({ descritor: "Calcular a área de uma figura composta por retângulo e triângulo", dificuldade: "dificil", textoBase: "A fachada de uma casa é formada por um retângulo de 10 m por 5 m e, em cima, um triângulo com base de 10 m e altura de 3 m.", figura: null, leituraFigura: "", comando: "Qual é a área total da fachada?", alternativas: ["A) 65 m²", "B) 75 m²", "C) 80 m²", "D) 85 m²"], resolucao: "Retângulo: 10 × 5 = 50 m²; triângulo: (5 × 3) ÷ 2 = 7,5 m²; 50 + 7,5 = 57,5 m². Portanto, 57,5 m².", correta: "A", distratores: { B: "Somou: 50 + 15 = 65.", C: "Multiplicou por 8: 10 × 8 = 80.", D: "Somou tudo: 10 + 5 + 10 + 3 = 85." } }),
    qa({ descritor: "Calcular a área de uma figura em forma de L", dificuldade: "dificil", textoBase: "Um jardim tem a forma de L: uma parte de 8 m por 3 m e outra de 3 m por 3 m.", figura: null, leituraFigura: "", comando: "Qual é a área do jardim?", alternativas: ["A) 24 m²", "B) 28 m²", "C) 33 m²", "D) 48 m²"], resolucao: "8 × 3 = 24; 3 × 3 = 9; 24 + 9 = 33. Portanto, 33 m².", correta: "C", distratores: { A: "Considerou só a parte maior: 8 × 3 = 24.", B: "Calculou o perímetro: 6 × 4 + 4 × 2 = 40.", D: "Multiplicou as maiores medidas: 8 × 6 = 48." } }),
  ],
};
export const AREA_REFEITOS_SIMULADOS = {
  itensRefeitos: [
    { numero: 2, ...qa({ habilidades: ["EF07MA31"], descritor: "Calcular a área de um quadrado", dificuldade: "facil", textoBase: "A figura mostra um azulejo quadrado.", figura: { tipo: "poligono", forma: "quadrado", lado: 6, unidade: "cm", legenda: "Azulejo" }, leituraFigura: "A medida do lado: 6 cm.", comando: "Qual é a área do azulejo?", alternativas: ["A) 12 cm²", "B) 24 cm²", "C) 36 cm²", "D) 72 cm²"], resolucao: "A = 6 × 6 = 36 cm². Portanto, 36 cm².", correta: "C", distratores: { A: "Somou dois lados: 6 + 6 = 12.", B: "Calculou o perímetro: 4 × 6 = 24.", D: "Multiplicou o lado por ele mesmo e dobrou: 2 × 6 × 6 = 72." } }) },
    { numero: 3, ...qa({ descritor: "Calcular a área de um triângulo", dificuldade: "media", textoBase: "Observe o terreno triangular representado na figura.", figura: { tipo: "poligono", forma: "triangulo", base: 6, altura: 4, unidade: "m", legenda: "Terreno" }, leituraFigura: "A base (6 m) e a altura (4 m) do triângulo.", comando: "Qual é a área do terreno?", alternativas: ["A) 10 m²", "B) 12 m²", "C) 20 m²", "D) 24 m²"], resolucao: "A = (6 × 4) ÷ 2 = 12 m². Portanto, 12 m².", correta: "B", distratores: { A: "Somou base e altura: 6 + 4 = 10.", C: "Calculou 2 × (6 + 4) = 20, como se fosse o perímetro de um retângulo.", D: "Esqueceu de dividir por 2: 6 × 4 = 24." } }) },
    { numero: 4, ...qa({ descritor: "Calcular a área de uma figura composta por retângulo e triângulo", dificuldade: "dificil", textoBase: "A figura mostra a fachada de uma casa, formada por um retângulo e um triângulo.", figura: { tipo: "contorno", unidade: "m", pontos: [[0, 0], [10, 0], [10, 5], [5, 8], [0, 5]], cotas: [{ de: [5, 5], ate: [5, 8] }], legenda: "Fachada da casa" }, leituraFigura: "As medidas do retângulo (10 m e 5 m) e a altura do triângulo (3 m).", comando: "Qual é a área total da fachada?", alternativas: ["A) 30 m²", "B) 50 m²", "C) 65 m²", "D) 80 m²"], resolucao: "Retângulo: 10 × 5 = 50; triângulo: (10 × 3) ÷ 2 = 15; 50 + 15 = 65. Portanto, 65 m².", correta: "C", distratores: { A: "Calculou o perímetro do retângulo: 2 × (10 + 5) = 30.", B: "Esqueceu o triângulo: 10 × 5 = 50.", D: "Não dividiu o triângulo por 2: 10 × 5 + 10 × 3 = 80." } }) },
    { numero: 5, ...qa({ descritor: "Calcular a área de uma figura em forma de L", dificuldade: "dificil", textoBase: "A figura mostra a planta de um jardim em forma de L.", figura: { tipo: "contorno", unidade: "m", pontos: [[0, 0], [8, 0], [8, 3], [3, 3], [3, 6], [0, 6]], cotas: [], legenda: "Planta do jardim" }, leituraFigura: "As medidas dos lados do jardim (8 m, 3 m, 5 m, 3 m, 3 m e 6 m).", comando: "Qual é a área do jardim?", alternativas: ["A) 24 m²", "B) 28 m²", "C) 33 m²", "D) 48 m²"], resolucao: "8 × 3 = 24; 3 × 3 = 9; 24 + 9 = 33. Portanto, 33 m².", correta: "C", distratores: { A: "Considerou só a parte de baixo: 8 × 3 = 24.", B: "Calculou o perímetro: 8 + 3 + 5 + 3 + 3 + 6 = 28.", D: "Tratou o L como um retângulo inteiro: 8 × 6 = 48." } }) },
  ],
};

// Qual resposta fixa combina com o pedido (pelo formato que o pedido exige)
// Diagnóstico no site de teste: as questões simuladas seguem a distribuição pedida (uma habilidade
// por questão) e o texto-base curto não se repete, para o fluxo completo poder ser conferido.
const CONTEXTOS_TESTE = [
  "feira ciências escola municipal bairro",
  "excursão museu histórico cidade vizinha",
  "campeonato futsal quadra coberta ginásio",
  "horta comunitária canteiros praça central",
  "biblioteca itinerante ônibus colorido sábado",
  "festa junina barracas pipoca quentão",
  "padaria esquina fornada pães manhã",
  "maratona leitura sala aula semestre",
  "viagem trem estação plataforma bilhetes",
  "mercado frutas banca verduras domingo",
];
function itensDoPlano(prompt, codigos) {
  const desloca = (prompt.length * 7) % CONTEXTOS_TESTE.length;
  return codigos.map((c, k) => {
    const base = AVALIACAO_SIMULADA.itens[k % AVALIACAO_SIMULADA.itens.length];
    const ctx = CONTEXTOS_TESTE[(k + desloca) % CONTEXTOS_TESTE.length];
    return { ...base, habilidade: c, habilidades: [c], textoBase: `[TESTE ${c}] ${ctx}. ${base.figura ? "Observe a figura." : base.textoBase}` };
  });
}
const codigosDistribuicao = (prompt) => [...prompt.matchAll(/^\d+\. ([A-Z]{2}\d{2}[A-Z]{2}\d{2})\b/gm)].map((m) => m[1]);
const codigosQueFaltam = (prompt) => [...prompt.matchAll(/^- ([A-Z]{2}\d{2}[A-Z]{2}\d{2}) —/gm)].map((m) => m[1]);

export function respostaSimulada(prompt = "") {
  if (/"itensNovos"/.test(prompt) && /ainda faltam/.test(prompt)) return { itensNovos: itensDoPlano(prompt, codigosQueFaltam(prompt)) };
  if (/"distratores"/.test(prompt) && /DISTRIBUIÇÃO OBRIGATÓRIA/.test(prompt)) return { titulo: "[TESTE] Diagnóstico", itens: itensDoPlano(prompt, codigosDistribuicao(prompt)) };
  if (/FOTO de um cartão-resposta/.test(prompt)) return { respostas: ["A", "B", "C", "D", null, "*", "A", "B"], numero: "7", legivel: true, observacao: "[TESTE] leitura simulada" };
  if (/\{"respostas"/.test(prompt)) return { respostas: [] }; // resolução às cegas: não decide nada no teste
  if (/\{"revisao"/.test(prompt)) return { revisao: [] }; // revisão com gabarito: idem
  if (/"itensNovos"/.test(prompt)) return { itensNovos: AVALIACAO_SIMULADA.itens };
  if (/"itensRefeitos"/.test(prompt)) return AREA_REFEITOS_SIMULADOS;
  if (/"distratores"/.test(prompt)) return /Tema: [^\n]*[áa]rea/i.test(prompt) ? AVALIACAO_AREA_SIMULADA : AVALIACAO_SIMULADA;
  if (/"correcoes"/.test(prompt)) return { correcoes: ["[TESTE] revisão simulada"], ...PLANO_SIMULADO };
  if (/"plano_de_aula"/.test(prompt)) return PLANO_SIMULADO;
  if (/"apontamentos"/.test(prompt)) return REVISAO_SIMULADA;
  if (/Reescreva UM exercício/.test(prompt)) return EXERCICIO_SIMULADO;
  return APOSTILA_SIMULADA;
}
