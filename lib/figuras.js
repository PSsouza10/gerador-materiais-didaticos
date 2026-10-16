// Figuras didáticas desenhadas pelo próprio EduGera (não pela IA de imagem):
// a IA só descreve a figura em JSON; aqui os dados são limpos e limitados, e
// components/FiguraDidatica.jsx desenha em SVG/HTML. Servem a qualquer disciplina:
//   reta            — reta numérica (Matemática)
//   fracao          — barra ou círculo dividido em partes iguais (Matemática)
//   grade           — malha/disposição retangular (multiplicação, área)
//   tabela          — dados e classificações (todas as disciplinas)
//   barras          — gráfico de barras (Geografia, Ciências, Matemática)
//   linha_do_tempo  — eventos em ordem (História, Ciências)
//   fluxo           — etapas ligadas por setas, em linha ou em ciclo (ciclo da água,
//                     cadeia alimentar, processo de produção, etapas de um texto)
//   mapa            — mapa conceitual: ideia central + ramos (qualquer disciplina)
// Suportes visuais das avaliações (Prova Paulista / SARESP), também desenhados aqui,
// para que os números da figura sejam exatamente os dos dados:
//   bloco           — bloco retangular em perspectiva com as três medidas
//   poligono        — retângulo, quadrado ou triângulo retângulo com medidas nos lados
//   angulo          — ângulo com a medida em graus
//   linhas          — gráfico de linhas (evolução no tempo)
//   setores         — gráfico de setores com rótulo e porcentagem em cada fatia
//   relogio         — relógio de ponteiros
//   dinheiro        — cédulas e moedas do real
//   contorno        — figura composta pelos vértices (forma em L, retângulo + triângulo…),
//                     com as medidas dos lados calculadas pelo sistema e cotas tracejadas

export const TIPOS_FIGURA = ["reta", "fracao", "grade", "tabela", "barras", "linha_do_tempo", "fluxo", "mapa", "bloco", "poligono", "angulo", "linhas", "setores", "relogio", "dinheiro", "contorno"];
export const CEDULAS = [200, 100, 50, 20, 10, 5, 2];
export const MOEDAS = [1, 0.5, 0.25, 0.1, 0.05];

// Em Linguagens (Português, Inglês, Arte, Educação Física...) figura em exercício
// só quando ajuda de verdade; obrigar 2 gerava figura forçada (ex.: linha do tempo
// para modos verbais). Nas outras disciplinas, pelo menos 2 exercícios com figura.
export const figurasObrigatorias = (disciplina = "") =>
  !/portugu|ingl|espanhol|l[ií]ngua|arte|educa[cç][aã]o f[ií]sica|linguagens/i.test(disciplina);

const txt = (v, max = 60) => (typeof v === "string" || typeof v === "number" ? String(v).slice(0, max) : "");
const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const inteiro = (v, min, max, padrao) => {
  const n = num(v);
  return n == null ? padrao : Math.min(max, Math.max(min, Math.round(n)));
};

export function normalizarFigura(f) {
  if (!f || typeof f !== "object" || !TIPOS_FIGURA.includes(f.tipo)) return null;
  const legenda = txt(f.legenda, 160);
  switch (f.tipo) {
    case "reta": {
      const inicio = num(f.inicio) ?? 0;
      const fim = num(f.fim) ?? 1;
      if (!(fim > inicio)) return null;
      const divisoes = inteiro(f.divisoes, 1, 20, 4);
      const marcar = f.marcar == null || f.marcar === "" ? null : inteiro(f.marcar, 0, divisoes, null);
      const rotulos = ["nenhum", "extremos", "todos"].includes(f.rotulos) ? f.rotulos : "extremos";
      return { tipo: "reta", inicio, fim, divisoes, marcar, rotulos, legenda };
    }
    case "fracao": {
      const partes = inteiro(f.partes, 1, 16, 4);
      return { tipo: "fracao", forma: f.forma === "circulo" ? "circulo" : "barra", partes, pintadas: inteiro(f.pintadas, 0, partes, 1), legenda };
    }
    case "grade": {
      const linhas = inteiro(f.linhas, 1, 12, 3);
      const colunas = inteiro(f.colunas, 1, 12, 4);
      return { tipo: "grade", linhas, colunas, pintadas: inteiro(f.pintadas, 0, linhas * colunas, 0), legenda };
    }
    case "tabela": {
      const cabecalho = (Array.isArray(f.cabecalho) ? f.cabecalho : []).slice(0, 6).map((c) => txt(c, 40));
      const largura = Math.max(cabecalho.length, 1);
      const linhas = (Array.isArray(f.linhas) ? f.linhas : [])
        .filter(Array.isArray)
        .slice(0, 8)
        .map((l) => Array.from({ length: largura }, (_, i) => txt(l[i], 60)));
      if (!linhas.length) return null;
      return { tipo: "tabela", cabecalho, linhas, legenda };
    }
    case "barras": {
      const itens = (Array.isArray(f.itens) ? f.itens : [])
        .map((i) => ({ rotulo: txt(i?.rotulo, 24), valor: num(i?.valor) }))
        .filter((i) => i.rotulo && i.valor != null && i.valor >= 0)
        .slice(0, 8);
      if (!itens.length) return null;
      return { tipo: "barras", titulo: txt(f.titulo, 80), unidade: txt(f.unidade, 20), itens, legenda };
    }
    case "linha_do_tempo": {
      const eventos = (Array.isArray(f.eventos) ? f.eventos : [])
        .map((e) => ({ data: txt(e?.data, 20), texto: txt(e?.texto, 70) }))
        .filter((e) => e.data || e.texto)
        .slice(0, 6);
      if (!eventos.length) return null;
      return { tipo: "linha_do_tempo", eventos, legenda };
    }
    case "fluxo": {
      const etapas = (Array.isArray(f.etapas) ? f.etapas : []).map((e) => txt(e, 50)).filter(Boolean).slice(0, 6);
      if (etapas.length < 2) return null;
      return { tipo: "fluxo", etapas, ciclo: f.ciclo === true, legenda };
    }
    case "mapa": {
      const centro = txt(f.centro, 40);
      const ramos = (Array.isArray(f.ramos) ? f.ramos : []).map((r) => txt(r, 50)).filter(Boolean).slice(0, 6);
      if (!centro || ramos.length < 2) return null;
      return { tipo: "mapa", centro, ramos, legenda };
    }
    case "bloco": {
      const c = medida(f.comprimento);
      const l = medida(f.largura);
      const a = medida(f.altura);
      if (c == null || l == null || a == null) return null;
      return { tipo: "bloco", comprimento: c, largura: l, altura: a, unidade: txt(f.unidade, 8), legenda };
    }
    case "poligono": {
      const forma = ["retangulo", "quadrado", "triangulo"].includes(f.forma) ? f.forma : null;
      if (!forma) return null;
      const unidade = txt(f.unidade, 8);
      if (forma === "quadrado") {
        const lado = medida(f.lado ?? f.base);
        return lado == null ? null : { tipo: "poligono", forma, lado, unidade, legenda };
      }
      const base = medida(f.base);
      const altura = medida(f.altura);
      if (base == null || altura == null) return null;
      const hipotenusa = forma === "triangulo" ? medida(f.hipotenusa) : null;
      return { tipo: "poligono", forma, base, altura, ...(forma === "triangulo" ? { hipotenusa } : {}), unidade, legenda };
    }
    case "angulo": {
      const graus = num(f.graus);
      if (graus == null || graus <= 0 || graus >= 360) return null;
      return { tipo: "angulo", graus: Math.round(graus * 10) / 10, mostrarMedida: f.mostrarMedida !== false, legenda };
    }
    case "linhas":
    case "setores": {
      const itens = (Array.isArray(f.itens) ? f.itens : [])
        .map((i) => ({ rotulo: txt(i?.rotulo, 24), valor: num(i?.valor) }))
        .filter((i) => i.rotulo && i.valor != null && i.valor >= 0)
        .slice(0, f.tipo === "setores" ? 6 : 12);
      if (itens.length < 2 || (f.tipo === "setores" && !itens.some((i) => i.valor > 0))) return null;
      return { tipo: f.tipo, titulo: txt(f.titulo, 80), unidade: txt(f.unidade, 20), itens, legenda };
    }
    case "relogio": {
      const hora = inteiro(f.hora, 0, 23, null);
      const minuto = inteiro(f.minuto, 0, 59, 0);
      if (hora == null) return null;
      return { tipo: "relogio", hora, minuto, legenda };
    }
    case "dinheiro": {
      const validos = [...CEDULAS, ...MOEDAS];
      const itens = (Array.isArray(f.itens) ? f.itens : [])
        .map((i) => ({ valor: num(i?.valor), quantidade: inteiro(i?.quantidade, 1, 9, 1) }))
        .filter((i) => i.valor != null && validos.some((v) => Math.abs(v - i.valor) < 1e-9))
        .slice(0, 8);
      if (!itens.length) return null;
      return { tipo: "dinheiro", itens, legenda };
    }
    case "contorno": {
      const par = (p) => (Array.isArray(p) && p.length === 2 && p.every((v) => num(v) != null) ? [num(p[0]), num(p[1])] : null);
      // tira pontos repetidos seguidos e o último igual ao primeiro (a figura fecha sozinha)
      const brutos = (Array.isArray(f.pontos) ? f.pontos : []).map(par).filter(Boolean).slice(0, 13);
      const pontos = brutos.filter((p, i) => i === 0 || p[0] !== brutos[i - 1][0] || p[1] !== brutos[i - 1][1]);
      if (pontos.length > 3 && pontos[0][0] === pontos[pontos.length - 1][0] && pontos[0][1] === pontos[pontos.length - 1][1]) pontos.pop();
      if (pontos.length < 3 || pontos.length > 12 || Math.abs(areaPoligono(pontos)) < 1e-9) return null;
      const cotas = (Array.isArray(f.cotas) ? f.cotas : [])
        .map((c) => ({ de: par(c?.de), ate: par(c?.ate) }))
        .filter((c) => c.de && c.ate && distancia(c.de, c.ate) > 0)
        .slice(0, 4);
      return { tipo: "contorno", pontos, cotas, unidade: txt(f.unidade, 8), legenda, simples: poligonoSimples(pontos) };
    }
    default:
      return null;
  }
}

// ---------- geometria das figuras (contas feitas pelo sistema) ----------
// Polígono simples: nenhum lado cruza outro (só os vizinhos se tocam, no vértice)
function cruzam(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const naReta = (p, q, r) => Math.min(p[0], r[0]) <= q[0] + 1e-9 && q[0] <= Math.max(p[0], r[0]) + 1e-9 && Math.min(p[1], r[1]) <= q[1] + 1e-9 && q[1] <= Math.max(p[1], r[1]) + 1e-9;
  const o1 = o(a, b, c), o2 = o(a, b, d), o3 = o(c, d, a), o4 = o(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  return (o1 === 0 && naReta(a, c, b)) || (o2 === 0 && naReta(a, d, b)) || (o3 === 0 && naReta(c, a, d)) || (o4 === 0 && naReta(c, b, d));
}
export function poligonoSimples(p) {
  const n = p.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue; // lados vizinhos
      if (cruzam(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n])) return false;
    }
  return true;
}
export const distancia = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export function areaPoligono(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}
const redondo = (v) => Math.round(v * 1e6) / 1e6;
// lado "legível": comprimento com até 1 casa decimal (3-4-5 sim; √2 não ganha rótulo)
export const ladoRotulado = (v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-6;
export const ladosDoContorno = (f) => f.pontos.map((p, i) => redondo(distancia(p, f.pontos[(i + 1) % f.pontos.length])));

// Área, perímetro e volume que a figura mostra (null quando não se aplica)
export function geometriaDaFigura(f) {
  if (!f) return null;
  if (f.tipo === "bloco") return { volume: redondo(f.comprimento * f.largura * f.altura), area: null, perimetro: null };
  if (f.tipo === "poligono") {
    if (f.forma === "quadrado") return { area: redondo(f.lado * f.lado), perimetro: redondo(4 * f.lado) };
    if (f.forma === "retangulo") return { area: redondo(f.base * f.altura), perimetro: redondo(2 * (f.base + f.altura)) };
    const hip = f.hipotenusa ?? Math.hypot(f.base, f.altura);
    return { area: redondo((f.base * f.altura) / 2), perimetro: redondo(f.base + f.altura + hip) };
  }
  if (f.tipo === "contorno") {
    if (f.simples === false || !poligonoSimples(f.pontos)) return null; // figura que se cruza: não decide nada
    const lados = ladosDoContorno(f);
    return { area: redondo(Math.abs(areaPoligono(f.pontos))), perimetro: lados.every(ladoRotulado) ? redondo(lados.reduce((a, b) => a + b, 0)) : null };
  }
  return null;
}

// medida positiva de figura (até 1 milhão), com até 2 casas
function medida(v) {
  const n = num(v);
  return n == null || n <= 0 || n > 1e6 ? null : Math.round(n * 100) / 100;
}

// Números que a figura mostra ao aluno (para conferir com a resolução)
// Nome padrão quando a IA não dá legenda ("Figura 1 – Retângulo com as medidas")
export function legendaPadrao(f) {
  if (!f) return "";
  const nomes = {
    bloco: "Bloco retangular com as medidas",
    poligono: { retangulo: "Retângulo com as medidas", quadrado: "Quadrado com a medida do lado", triangulo: "Triângulo retângulo com as medidas" }[f.forma],
    contorno: "Figura com as medidas dos lados",
    angulo: "Ângulo",
    linhas: f.titulo || "Gráfico de linhas",
    barras: f.titulo || "Gráfico de barras",
    setores: f.titulo || "Gráfico de setores",
    tabela: "Dados da situação",
    relogio: "Relógio",
    dinheiro: "Cédulas e moedas",
    reta: "Reta numérica",
    grade: "Malha quadriculada",
    fracao: "Figura dividida em partes iguais",
    linha_do_tempo: "Linha do tempo",
    fluxo: f.ciclo ? "Ciclo" : "Esquema em etapas",
    mapa: "Mapa conceitual",
  };
  return nomes[f.tipo] || "Figura";
}

export function numerosDaFigura(f) {
  if (!f) return [];
  const daTabela = (l) => l.flatMap((c) => [...String(c).matchAll(/-?\d+(?:[.,]\d+)?/g)].map((m) => parseFloat(m[0].replace(",", "."))));
  switch (f.tipo) {
    case "bloco":
      return [f.comprimento, f.largura, f.altura];
    case "poligono":
      return f.forma === "quadrado" ? [f.lado] : [f.base, f.altura, f.hipotenusa].filter((x) => x != null);
    case "angulo":
      return f.mostrarMedida ? [f.graus] : [];
    case "barras":
    case "linhas":
    case "setores":
      return f.itens.map((i) => i.valor);
    case "tabela":
      return daTabela([...f.cabecalho, ...f.linhas.flat()]);
    case "relogio":
      return [f.hora, f.minuto];
    case "dinheiro":
      return f.itens.flatMap((i) => [i.valor, i.quantidade]);
    case "reta":
      return [f.inicio, f.fim];
    case "grade":
      return [f.linhas, f.colunas];
    case "fracao":
      return [f.partes, f.pintadas];
    case "contorno":
      return [...ladosDoContorno(f).filter(ladoRotulado), ...f.cotas.map((c) => redondo(distancia(c.de, c.ate)))];
    default:
      return [];
  }
}

// O enunciado depende de algo visual? ("observe a figura", "na reta numérica", "a tabela abaixo"…)
export const citaFigura = (enunciado = "") =>
  /\b(figura|imagem|desenho|reta num[eé]rica|na reta|tabela|gr[aá]fico|linha do tempo|malha|parte colorida|partes coloridas|pintad[ao]s?|esquema|mapa conceitual|fluxograma)\b/i.test(enunciado);

// Qual tipo de figura o enunciado cita? (para reaproveitar a figura do conteúdo)
const CITACOES = [
  [/linha do tempo/i, "linha_do_tempo"],
  [/reta num[eé]rica|\bna reta\b|\ba reta\b/i, "reta"],
  [/tabela/i, "tabela"],
  [/gr[aá]fico/i, "barras"],
  [/mapa conceitual/i, "mapa"],
  [/esquema|fluxograma|\bciclo\b/i, "fluxo"],
  [/malha|quadradinhos/i, "grade"],
  [/parte colorida|partes coloridas|pintad[ao]s?|barra dividida|c[ií]rculo dividido/i, "fracao"],
];
export const tipoCitado = (enunciado = "") => CITACOES.find(([re]) => re.test(enunciado))?.[1] || null;

// Exercício que cita "a linha do tempo", "a reta", "a tabela"... sem trazer figura:
// se a figura do conteúdo (ou da cena) é desse mesmo tipo, ela é a figura citada.
export function completarFigurasCitadas(m) {
  const fontes = [m.figuraExplicativa, m.cena?.figura].filter(Boolean);
  // "marque / localize 3/4 na reta" com o ponto já destacado entrega a resposta: tira o destaque
  const pedeMarcar = (t = "") => /\b(marque|localize|indique|assinale|posicione|represente)\b/i.test(t);
  const semResposta = (e) =>
    e.figura?.tipo === "reta" && e.figura.marcar != null && pedeMarcar(e.enunciado) ? { ...e, figura: { ...e.figura, marcar: null } } : e;
  if (!fontes.length) return { ...m, exercicios: (m.exercicios || []).map(semResposta) };
  const exercicios = (m.exercicios || []).map(semResposta).map((e) => {
    if (e.figura || !citaFigura(e.enunciado)) return e;
    const tipo = tipoCitado(e.enunciado);
    // cópia sem ponto destacado, para não entregar resposta
    const f = fontes.find((x) => x.tipo === tipo);
    return f ? { ...e, figura: f.tipo === "reta" ? { ...f, marcar: null } : f } : e;
  });
  return { ...m, exercicios };
}

// Rótulo do tracinho k da reta: frações quando é de 0 a 1, números nos outros casos
export function rotuloReta(fig, k) {
  const { inicio, fim, divisoes } = fig;
  if (inicio === 0 && fim === 1) return k === 0 ? "0" : k === divisoes ? "1" : `${k}/${divisoes}`;
  const v = inicio + ((fim - inicio) * k) / divisoes;
  return String(Number(v.toPrecision(10))).replace(".", ",");
}
