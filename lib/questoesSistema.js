// Questões montadas pelo PRÓPRIO SISTEMA (sem IA) para área, perímetro e volume.
// Usadas no lugar de uma questão da IA que não passou na conferência mesmo depois de refeita:
// figura, resolução, alternativas e explicações dos erros são todas calculadas aqui,
// então o gabarito está sempre certo.
import { normalizarFigura } from "./figuras.js";
import { errosTipicos, LETRAS } from "./avaliacao.js";

const br = (v) => String(Math.round(v * 100) / 100).replace(".", ",");

// Situações (variam com o número da vaga, para não repetir)
const CENAS = {
  retangulo: [["o piso retangular da sala de leitura", "piso"], ["a horta retangular da escola", "horta"], ["o tapete retangular do quarto", "tapete"]],
  quadrado: [["um azulejo quadrado da cozinha", "azulejo"], ["a toalha quadrada da mesa", "toalha"]],
  triangulo: [["um canteiro em forma de triângulo retângulo", "canteiro"], ["uma placa triangular de sinalização", "placa"]],
  L: [["a planta de um jardim em forma de L", "jardim"], ["a planta de uma sala em forma de L", "sala"]],
  bloco: [["uma caixa de sapatos", "caixa"], ["um aquário", "aquário"], ["um baú de brinquedos", "baú"]],
};
const MEDIDAS = {
  retangulo: [[8, 5], [9, 4], [12, 7], [10, 6]],
  quadrado: [[7], [9], [6], [12]],
  triangulo: [[6, 4], [10, 6], [8, 5], [12, 7]],
  L: [[[0, 0], [8, 0], [8, 3], [3, 3], [3, 6], [0, 6]], [[0, 0], [10, 0], [10, 4], [4, 4], [4, 7], [0, 7]], [[0, 0], [9, 0], [9, 2], [5, 2], [5, 6], [0, 6]]],
  bloco: [[30, 20, 10], [40, 25, 20], [50, 30, 20], [20, 15, 10]],
};

function montar({ forma, k, grandeza, unidade, habilidades, dificuldade }) {
  const [cena, nome] = CENAS[forma][k % CENAS[forma].length];
  const m = MEDIDAS[forma][k % MEDIDAS[forma].length];
  let figura;
  let valor;
  let resolucao;
  if (forma === "bloco") {
    figura = normalizarFigura({ tipo: "bloco", comprimento: m[0], largura: m[1], altura: m[2], unidade, legenda: nome[0].toUpperCase() + nome.slice(1) });
    valor = m[0] * m[1] * m[2];
    resolucao = `V = ${m[0]} × ${m[1]} × ${m[2]} = ${valor}. Portanto, o volume é ${br(valor)} ${unidade}³.`;
  } else if (forma === "L") {
    figura = normalizarFigura({ tipo: "contorno", unidade, pontos: m, cotas: [], legenda: `Planta do ${nome}` });
    const [, [W], [, h1], [x2], [, H]] = [m[0], m[1], m[2], m[3], m[4]];
    const a1 = W * h1;
    const a2 = x2 * (H - h1);
    valor = a1 + a2;
    resolucao = `Dividindo em dois retângulos: ${W} × ${h1} = ${a1}; ${x2} × ${H - h1} = ${a2}; ${a1} + ${a2} = ${valor}. Portanto, ${br(valor)} ${unidade}².`;
  } else {
    const f = forma === "quadrado" ? { tipo: "poligono", forma, lado: m[0], unidade } : { tipo: "poligono", forma, base: m[0], altura: m[1], unidade };
    figura = normalizarFigura({ ...f, legenda: nome[0].toUpperCase() + nome.slice(1) });
    if (grandeza === "perimetro") {
      valor = forma === "quadrado" ? 4 * m[0] : 2 * (m[0] + m[1]);
      resolucao = forma === "quadrado" ? `P = 4 × ${m[0]} = ${valor}. Portanto, ${br(valor)} ${unidade}.` : `P = 2 × (${m[0]} + ${m[1]}) = ${valor}. Portanto, ${br(valor)} ${unidade}.`;
    } else {
      valor = forma === "quadrado" ? m[0] * m[0] : forma === "triangulo" ? (m[0] * m[1]) / 2 : m[0] * m[1];
      resolucao = forma === "quadrado" ? `A = ${m[0]} × ${m[0]} = ${valor}. Portanto, ${br(valor)} ${unidade}².` : forma === "triangulo" ? `A = (${m[0]} × ${m[1]}) ÷ 2 = ${br(valor)}. Portanto, ${br(valor)} ${unidade}².` : `A = ${m[0]} × ${m[1]} = ${valor}. Portanto, ${br(valor)} ${unidade}².`;
    }
  }
  const un = grandeza === "volume" ? `${unidade}³` : grandeza === "perimetro" ? unidade : `${unidade}²`;
  const comando = grandeza === "volume" ? `Qual é o volume ${nome === "aquário" ? "do" : nome === "caixa" ? "da" : "do"} ${nome}?` : grandeza === "perimetro" ? `Qual é o perímetro ${forma === "quadrado" && nome === "toalha" ? "da" : "do"} ${nome}?` : `Qual é a área ${["horta", "placa", "toalha", "sala"].includes(nome) ? "da" : "do"} ${nome}?`;
  const base = { figura, comando, textoBase: `A figura mostra ${cena}, com as medidas.` };
  const erros = errosTipicos({ ...base, alternativas: [], textoBase: base.textoBase })
    .filter((e) => Math.abs(e.v - valor) > 1e-9)
    .filter((e, i, l) => l.findIndex((x) => Math.abs(x.v - e.v) < 1e-9) === i)
    .slice(0, 3);
  if (erros.length < 3) return null;
  const todos = [{ v: valor, certo: true }, ...erros].sort((a, b) => a.v - b.v);
  const alternativas = todos.map((x) => `${br(x.v)} ${un}`);
  const correta = LETRAS[todos.findIndex((x) => x.certo)];
  const distratores = Object.fromEntries(todos.map((x, i) => [LETRAS[i], x.txt]).filter(([, t]) => t));
  return {
    habilidade: habilidades[0] || null,
    habilidades,
    descritor: grandeza === "volume" ? "Calcular o volume de um bloco retangular" : grandeza === "perimetro" ? "Calcular o perímetro de um polígono" : forma === "L" ? "Calcular a área de uma figura composta por retângulos" : `Calcular a área de um ${forma === "triangulo" ? "triângulo" : forma === "quadrado" ? "quadrado" : "retângulo"}`,
    dificuldade,
    textoBase: base.textoBase,
    figura,
    leituraFigura: `As medidas indicadas na figura (${figura.tipo === "bloco" ? `${m.join(", ")} ${unidade}` : figura.tipo === "contorno" ? "os lados do L" : forma === "quadrado" ? `lado de ${m[0]} ${unidade}` : `${m[0]} ${unidade} e ${m[1]} ${unidade}`}).`,
    comando,
    alternativas,
    correta,
    resolucao,
    distratores,
    semGabarito: false,
    doSistema: true,
  };
}

// ---------- Gráficos (barras e linhas) ----------
const DADOS_GRAFICO = [
  { titulo: "Livros lidos pela turma", unidade: "livros", rotulos: ["jan", "fev", "mar", "abr", "mai"], valores: [12, 18, 15, 24, 20], cena: "a quantidade de livros que a turma leu em cada mês" },
  { titulo: "Picolés vendidos na cantina", unidade: "picolés", rotulos: ["seg", "ter", "qua", "qui", "sex"], valores: [35, 20, 45, 30, 50], cena: "quantos picolés a cantina vendeu em cada dia da semana" },
  { titulo: "Chuva no mês (mm)", unidade: "mm", rotulos: ["jan", "fev", "mar", "abr", "mai"], valores: [240, 210, 160, 90, 70], cena: "a quantidade de chuva, em milímetros, em cada mês" },
  { titulo: "Alunos por esporte preferido", unidade: "alunos", rotulos: ["futebol", "vôlei", "basquete", "natação"], valores: [14, 9, 6, 11], cena: "o esporte preferido dos alunos de uma turma" },
];

function questaoGrafico(k, habilidades, dificuldade) {
  const g = DADOS_GRAFICO[k % DADOS_GRAFICO.length];
  const tipo = k % 2 === 0 ? "barras" : "linhas";
  const figura = normalizarFigura({ tipo, titulo: g.titulo, unidade: "", itens: g.rotulos.map((r, i) => ({ rotulo: r, valor: g.valores[i] })), legenda: g.titulo });
  const textoBase = `O gráfico mostra ${g.cena}.`;
  const modo = dificuldade === "facil" ? 0 : dificuldade === "media" ? 1 : 2;
  const v = g.valores;
  const r = g.rotulos;
  const iMax = v.indexOf(Math.max(...v));
  const iMin = v.indexOf(Math.min(...v));
  let comando;
  let certo;
  let erros;
  let resolucao;
  let un = g.unidade;
  if (modo === 0) {
    // leitura: qual categoria tem o maior valor (alternativas de texto)
    comando = `Em qual ${/mês|chuva|livros/.test(g.cena) ? "mês" : /dia/.test(g.cena) ? "dia" : "esporte"} o valor foi o MAIOR?`;
    const outros = r.map((x, i) => i).filter((i) => i !== iMax);
    const escolhidos = [iMin, ...outros.filter((i) => i !== iMin)].slice(0, 3);
    const txts = { [iMin]: "Escolheu o menor valor do gráfico, invertendo a pergunta.", [escolhidos[1]]: "Olhou a barra/ponto vizinho ao maior valor.", [escolhidos[2]]: "Escolheu sem comparar todos os valores do gráfico." };
    const todos = [{ t: r[iMax], certo: true }, ...escolhidos.map((i) => ({ t: r[i], txt: txts[i] }))].sort((a, b) => a.t.localeCompare(b.t));
    const correta = LETRAS[todos.findIndex((x) => x.certo)];
    return base({ habilidades, descritor: "Identificar o maior valor em um gráfico", dificuldade, textoBase, figura, leitura: `Comparar os valores do gráfico: o maior é ${v[iMax]} (${r[iMax]}).`, comando, alternativas: todos.map((x) => x.t), correta, resolucao: `Comparando os valores, o maior é ${v[iMax]}, em ${r[iMax]}. Portanto, ${r[iMax]}.`, distratores: Object.fromEntries(todos.map((x, i) => [LETRAS[i], x.txt]).filter(([, t]) => t)) });
  }
  if (modo === 1) {
    // diferença entre o maior e o menor
    comando = `Qual é a diferença entre o maior e o menor valor mostrados no gráfico?`;
    certo = v[iMax] - v[iMin];
    resolucao = `${v[iMax]} − ${v[iMin]} = ${certo}. Portanto, ${certo} ${un}.`;
    erros = [
      { v: v[iMax] + v[iMin], txt: `Somou em vez de subtrair: ${v[iMax]} + ${v[iMin]} = ${v[iMax] + v[iMin]}.` },
      { v: v[iMax], txt: `Leu só o maior valor do gráfico: ${v[iMax]}.` },
      { v: v[iMin], txt: `Leu só o menor valor do gráfico: ${v[iMin]}.` },
      { v: Math.abs(v[v.length - 1] - v[0]), txt: `Subtraiu o último valor do primeiro, e não o maior do menor: ${Math.max(v[0], v[v.length - 1])} − ${Math.min(v[0], v[v.length - 1])} = ${Math.abs(v[v.length - 1] - v[0])}.` },
    ];
  } else {
    // total
    comando = `Qual é o total somando todos os valores do gráfico?`;
    certo = v.reduce((a, b) => a + b, 0);
    resolucao = `${v.join(" + ")} = ${certo}. Portanto, ${certo} ${un}.`;
    const semUltimo = v.slice(0, -1).reduce((a, b) => a + b, 0);
    erros = [
      { v: semUltimo, txt: `Esqueceu o último valor: ${v.slice(0, -1).join(" + ")} = ${semUltimo}.` },
      { v: certo - v[0], txt: `Esqueceu o primeiro valor: ${v.slice(1).join(" + ")} = ${certo - v[0]}.` },
      { v: v[iMax] + v[iMin], txt: `Somou só o maior e o menor valor: ${v[iMax]} + ${v[iMin]} = ${v[iMax] + v[iMin]}.` },
    ];
  }
  const unicos = erros.filter((e, i, l) => e.v !== certo && l.findIndex((x) => x.v === e.v) === i).slice(0, 3);
  if (unicos.length < 3) return null;
  const todos = [{ v: certo, certo: true }, ...unicos].sort((a, b) => a.v - b.v);
  return base({
    habilidades,
    descritor: modo === 1 ? "Calcular a diferença entre valores de um gráfico" : "Calcular o total de valores de um gráfico",
    dificuldade,
    textoBase,
    figura,
    leitura: `Os valores de cada ${tipo === "barras" ? "barra" : "ponto"} do gráfico.`,
    comando,
    alternativas: todos.map((x) => `${x.v} ${un}`),
    correta: LETRAS[todos.findIndex((x) => x.certo)],
    resolucao,
    distratores: Object.fromEntries(todos.map((x, i) => [LETRAS[i], x.txt]).filter(([, t]) => t)),
  });
}

// ---------- Ângulos ----------
const ANGULOS = [35, 50, 65, 120, 140, 25, 70, 110];
function questaoAngulo(k, habilidades, dificuldade) {
  const g = ANGULOS[k % ANGULOS.length];
  const figura = normalizarFigura({ tipo: "angulo", graus: g, mostrarMedida: true, legenda: "Ângulo medido com transferidor" });
  const textoBase = "A figura mostra um ângulo medido com o transferidor.";
  if (dificuldade === "facil") {
    const certo = g < 90 ? "agudo" : g === 90 ? "reto" : "obtuso";
    const opcoes = ["agudo", "obtuso", "raso", "reto"];
    const txt = { agudo: "Confundiu: agudo é menor que 90°.", obtuso: "Confundiu: obtuso fica entre 90° e 180°.", reto: "Confundiu: reto mede exatamente 90°.", raso: "Confundiu: raso mede exatamente 180°." };
    const correta = LETRAS[opcoes.indexOf(certo)];
    return base({ habilidades, descritor: "Classificar um ângulo pela medida", dificuldade, textoBase, figura, leitura: `A medida do ângulo: ${g}°.`, comando: "Como se classifica esse ângulo?", alternativas: opcoes.map((o) => `ângulo ${o}`), correta, resolucao: `O ângulo mede ${g}°, que é ${g < 90 ? "menor que 90°" : "maior que 90° e menor que 180°"}. Portanto, é ${certo}.`, distratores: Object.fromEntries(opcoes.map((o, i) => [LETRAS[i], o === certo ? null : txt[o]]).filter(([, t]) => t)) });
  }
  // complemento (agudo) ou suplemento
  const comp = g < 90 && dificuldade === "media";
  const total = comp ? 90 : 180;
  const certo = total - g;
  const erros = [
    { v: (comp ? 180 : 90) - g, txt: `Usou ${comp ? 180 : 90}° em vez de ${total}°: ${comp ? 180 : 90} − ${g} = ${(comp ? 180 : 90) - g}.` },
    { v: 360 - g, txt: `Usou a volta completa: 360 − ${g} = ${360 - g}.` },
    { v: g, txt: `Repetiu a medida do ângulo da figura: ${g}.` },
    { v: Math.abs(g - 90), txt: `Comparou com o ângulo reto: ${Math.max(g, 90)} − ${Math.min(g, 90)} = ${Math.abs(g - 90)}.` },
  ].filter((e, i, l) => e.v > 0 && e.v !== certo && l.findIndex((x) => x.v === e.v) === i).slice(0, 3);
  if (erros.length < 3) return null;
  const todos = [{ v: certo, certo: true }, ...erros].sort((a, b) => a.v - b.v);
  return base({
    habilidades,
    descritor: comp ? "Calcular o complemento de um ângulo" : "Calcular o suplemento de um ângulo",
    dificuldade,
    textoBase,
    figura,
    leitura: `A medida do ângulo: ${g}°.`,
    comando: comp ? "Quanto falta para esse ângulo completar um ângulo reto (90°)?" : "Quanto falta para esse ângulo completar um ângulo raso (180°)?",
    alternativas: todos.map((x) => `${x.v}°`),
    correta: LETRAS[todos.findIndex((x) => x.certo)],
    resolucao: `${total} − ${g} = ${certo}. Portanto, ${certo}°.`,
    distratores: Object.fromEntries(todos.map((x, i) => [LETRAS[i], x.txt]).filter(([, t]) => t)),
  });
}

function base({ habilidades, descritor, dificuldade, textoBase, figura, leitura, comando, alternativas, correta, resolucao, distratores }) {
  return { habilidade: habilidades[0] || null, habilidades, descritor, dificuldade, textoBase, figura, leituraFigura: leitura, comando, alternativas, correta, resolucao, distratores, semGabarito: false, doSistema: true };
}

// Tema da avaliação → que tipo de questão o sistema sabe montar
export function grandezaDoTema(texto = "") {
  const t = texto.toLowerCase();
  if (/gr[aá]fico|estat[ií]stic|pesquisa|tabela de dados/.test(t)) return "grafico";
  if (/(^|[^a-zà-ú])[âa]ngulo/.test(t)) return "angulo";
  if (/volume|capacidade|bloco|paralelep/.test(t)) return "volume";
  if (/per[ií]metro/.test(t)) return "perimetro";
  if (/[áa]rea/.test(t)) return "area";
  return null;
}

// Uma questão do sistema para a vaga k (varia a forma e as medidas)
export function questaoDoSistema(d = {}, k = 0, { habilidades = [], dificuldade = "media" } = {}) {
  const g = grandezaDoTema(`${d.tema} ${d.habilidade || ""}`);
  if (!g) return null;
  if (g === "grafico") return questaoGrafico(k, habilidades, dificuldade);
  if (g === "angulo") return questaoAngulo(k, habilidades, dificuldade);
  if (g === "volume") return montar({ forma: "bloco", k, grandeza: g, unidade: "cm", habilidades, dificuldade });
  const formas = g === "perimetro" ? ["retangulo", "quadrado"] : dificuldade === "dificil" ? ["L", "triangulo", "retangulo"] : ["retangulo", "triangulo", "quadrado", "L"];
  return montar({ forma: formas[k % formas.length], k, grandeza: g, unidade: "m", habilidades, dificuldade });
}
