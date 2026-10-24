// "Minha letra": cada professor cadastra a própria caligrafia numa folha-modelo (impressa,
// preenchida à caneta e fotografada). O EduGera recorta cada letra (lib/visaoModelo.js) e usa
// essas letras para escrever as correções na folha do aluno (components/redacao/FolhaCorrigida).
// Só a própria conta usa a sua letra. Parte pura (sem rede, sem DOM): testável.

// Geometria da folha-modelo em milímetros (A4 em pé). Marcadores pretos nos 4 cantos
// servem para achar a folha na foto, mesmo torta ou de longe.
export const FOLHA = { largura: 210, altura: 297 };
export const MARCADOR = { lado: 12, cantos: [[10, 10], [188, 10], [10, 275], [188, 275]] }; // canto sup. esq. de cada quadrado
export const CENTROS_MARCADORES = MARCADOR.cantos.map(([x, y]) => [x + MARCADOR.lado / 2, y + MARCADOR.lado / 2]); // TL, TR, BL, BR
export const GRADE = { x: 20, y: 38, colunas: 8, linhas: 14, largura: 170, altura: 232 };
export const CELULA = { largura: GRADE.largura / GRADE.colunas, altura: GRADE.altura / GRADE.linhas, faixaRotulo: 3.6, margem: 0.9 };
// Na zona de escrita, a linha de base fica a 68% da altura (abaixo dela: g, j, p, q, ç)
export const BASE_NA_ZONA = 0.68;

// Caracteres pedidos na folha (as minúsculas, 2 vezes: as correções usam mais minúsculas)
const MINUSCULAS = "abcdefghijklmnopqrstuvwxyz".split("");
const ACENTUADAS = "áàâãéêíóôõúç".split("");
const MAIUSCULAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DIGITOS = "0123456789".split("");
const PONTUACAO = [",", ".", "!", "?", ":", ";", "-", "/"];
export const CARACTERES_MODELO = [...MINUSCULAS, ...MINUSCULAS, ...ACENTUADAS, ...MAIUSCULAS, ...DIGITOS, ...PONTUACAO]; // 108 de 112 células

// Zona de escrita da célula i (mm): { x, y, largura, altura }
export function zonaDaCelula(i) {
  const col = i % GRADE.colunas;
  const lin = Math.floor(i / GRADE.colunas);
  const x = GRADE.x + col * CELULA.largura + CELULA.margem;
  const y = GRADE.y + lin * CELULA.altura + CELULA.faixaRotulo;
  return { x, y, largura: CELULA.largura - 2 * CELULA.margem, altura: CELULA.altura - CELULA.faixaRotulo - CELULA.margem };
}

// ---------- glifos guardados: { "a": [{ src, w, h }, ...], ... } ----------
export const MAX_VARIANTES = 3;
export const MAX_BYTES_GLIFO = 24_000;
export const MAX_BYTES_TOTAL = 900_000;
const PNG = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;

export function validarGlifos(glifos) {
  if (!glifos || typeof glifos !== "object" || Array.isArray(glifos)) return { ok: false, erro: "Letras inválidas." };
  const saida = {};
  let total = 0;
  for (const [c, lista] of Object.entries(glifos)) {
    if ([...c].length !== 1 || !Array.isArray(lista)) continue;
    const ok = lista
      .filter((g) => g && typeof g.src === "string" && g.src.length <= MAX_BYTES_GLIFO && PNG.test(g.src) && Number.isInteger(g.w) && Number.isInteger(g.h) && g.w > 0 && g.h > 0 && g.w <= 600 && g.h <= 600)
      .slice(0, MAX_VARIANTES)
      .map(({ src, w, h }) => ({ src, w, h }));
    if (!ok.length) continue;
    total += ok.reduce((s, g) => s + g.src.length, 0);
    saida[c] = ok;
  }
  if (total > MAX_BYTES_TOTAL) return { ok: false, erro: "As letras ficaram grandes demais. Tire a foto um pouco mais de longe." };
  if (Object.keys(saida).filter((c) => /[a-z]/.test(c)).length < 20) return { ok: false, erro: "Encontrei poucas letras. Preencha as minúsculas e fotografe a folha inteira, com os 4 quadrados pretos." };
  return { ok: true, glifos: saida };
}

// Letra que falta → parente mais próximo (á → a, Ç → ç → c, A → a)
const SEM_ACENTO = (c) => c.normalize("NFD").replace(/[̀-ͯ]/g, "");
export function glifoPara(glifos, c, ordem = 0) {
  const opcoes = [c, c.toLowerCase(), SEM_ACENTO(c), SEM_ACENTO(c).toLowerCase(), c.toUpperCase()];
  for (const o of opcoes) {
    const lista = glifos[o];
    if (lista?.length) return lista[ordem % lista.length];
  }
  return null;
}

const sorte = (n) => {
  const x = Math.sin(n * 91.345 + 47.853) * 24634.6345;
  return x - Math.floor(x);
};

// Texto → posições das letras, para escrever "à mão" numa altura de letra (x-height ≈ tamanho).
// Cada glifo tem a altura da zona da célula; a escala põe a linha de base no lugar certo.
// Devolve { itens: [{ src, x, y, w, h, rot }], largura, faltando: [caracteres sem glifo] }
export function escreverComLetra(texto, glifos, { tamanho = 24, x0 = 0, base = 0, larguraMax = Infinity, entreLinhas = tamanho * 2 } = {}) {
  const zonaH = tamanho * 2.4; // zona inteira da célula, na escala do texto
  const espaco = tamanho * 0.55;
  const itens = [];
  const faltando = [];
  const uso = {};
  let x = x0;
  let y = base;
  let n = 0;
  for (const palavra of String(texto).split(/(\s+)/)) {
    if (!palavra) continue;
    if (/^\s+$/.test(palavra)) {
      x += espaco;
      continue;
    }
    const larguraPalavra = [...palavra].reduce((s, c) => {
      const g = glifoPara(glifos, c);
      return s + (g ? (g.w / g.h) * zonaH * 0.94 : espaco);
    }, 0);
    if (x > x0 && x + larguraPalavra > x0 + larguraMax) {
      x = x0;
      y += entreLinhas;
    }
    for (const c of palavra) {
      const ordem = (uso[c] = (uso[c] ?? -1) + 1);
      const g = glifoPara(glifos, c, ordem);
      if (!g) {
        faltando.push(c);
        x += espaco;
        continue;
      }
      const h = zonaH * (0.97 + sorte(n) * 0.06);
      const w = (g.w / g.h) * h;
      itens.push({ src: g.src, x, y: y - h * BASE_NA_ZONA + (sorte(n + 7) - 0.5) * tamanho * 0.08, w, h, rot: (sorte(n + 3) - 0.5) * 4 });
      x += w * 0.94;
      n++;
    }
  }
  return { itens, largura: x - x0, altura: y - base + entreLinhas, faltando: [...new Set(faltando)] };
}
