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

// Tema da avaliação → que tipo de questão o sistema sabe montar
export function grandezaDoTema(texto = "") {
  const t = texto.toLowerCase();
  if (/volume|capacidade|bloco|paralelep/.test(t)) return "volume";
  if (/per[ií]metro/.test(t)) return "perimetro";
  if (/[áa]rea/.test(t)) return "area";
  return null;
}

// Uma questão do sistema para a vaga k (varia a forma e as medidas)
export function questaoDoSistema(d = {}, k = 0, { habilidades = [], dificuldade = "media" } = {}) {
  const g = grandezaDoTema(`${d.tema} ${d.habilidade || ""}`);
  if (!g) return null;
  if (g === "volume") return montar({ forma: "bloco", k, grandeza: g, unidade: "cm", habilidades, dificuldade });
  const formas = g === "perimetro" ? ["retangulo", "quadrado"] : dificuldade === "dificil" ? ["L", "triangulo", "retangulo"] : ["retangulo", "triangulo", "quadrado", "L"];
  return montar({ forma: formas[k % formas.length], k, grandeza: g, unidade: "m", habilidades, dificuldade });
}
