// Leitura da folha-modelo "Minha letra" na foto, sem IA (roda no navegador do professor):
//   1) acha os 4 quadrados pretos dos cantos;
//   2) calcula a homografia folha (mm) → foto (px), que corrige perspectiva e inclinação;
//   3) recorta a zona de escrita de cada célula e separa a tinta do papel.
// Trabalha com { data (RGBA), width, height }, como o ImageData do canvas: testável no node.
import { CENTROS_MARCADORES, MARCADOR, CARACTERES_MODELO, zonaDaCelula } from "./letraProfessor.js";

export function luminancias({ data, width, height }) {
  const l = new Float32Array(width * height);
  for (let i = 0; i < l.length; i++) l[i] = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) / 255;
  return l;
}

// Quadrados escuros, cheios e grandes, um perto de cada canto da foto → [TL, TR, BL, BR] ou null
export function acharMarcadores(img) {
  const { width: W, height: H } = img;
  const passo = Math.max(1, Math.round(Math.max(W, H) / 700)); // procura numa versão reduzida
  const w = Math.floor(W / passo);
  const h = Math.floor(H / passo);
  const lum = luminancias(img);
  const reduzida = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) reduzida[y * w + x] = lum[y * passo * W + x * passo];
  // limiar pela luz da foto: metade da luminância mediana (foto escura também funciona)
  const mediana = Float32Array.from(reduzida).sort()[reduzida.length >> 1];
  const limiar = Math.min(0.38, mediana * 0.5);
  const escuro = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) escuro[i] = reduzida[i] < limiar ? 1 : 0;
  const visto = new Uint8Array(w * h);
  const candidatos = [];
  const fila = new Int32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (!escuro[i] || visto[i]) continue;
    let ini = 0;
    let fim = 0;
    fila[fim++] = i;
    visto[i] = 1;
    let area = 0;
    let sx = 0;
    let sy = 0;
    let x0 = w;
    let x1 = 0;
    let y0 = h;
    let y1 = 0;
    while (ini < fim) {
      const p = fila[ini++];
      const px = p % w;
      const py = (p / w) | 0;
      area++;
      sx += px;
      sy += py;
      if (px < x0) x0 = px;
      if (px > x1) x1 = px;
      if (py < y0) y0 = py;
      if (py > y1) y1 = py;
      for (const q of [p - 1, p + 1, p - w, p + w]) {
        if (q < 0 || q >= w * h || visto[q] || !escuro[q]) continue;
        if ((q === p - 1 && px === 0) || (q === p + 1 && px === w - 1)) continue;
        visto[q] = 1;
        fila[fim++] = q;
      }
    }
    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;
    const cheio = area / (bw * bh);
    const proporcao = bw / bh;
    if (area >= w * h * 0.0004 && cheio > 0.7 && proporcao > 0.55 && proporcao < 1.8) candidatos.push({ x: (sx / area) * passo, y: (sy / area) * passo, area });
  }
  if (candidatos.length < 4) return null;
  const grandes = candidatos.sort((a, b) => b.area - a.area).slice(0, 12);
  const cantos = [[0, 0], [W, 0], [0, H], [W, H]];
  const usados = new Set();
  const achados = cantos.map(([cx, cy]) => {
    let melhor = null;
    for (const [k, c] of grandes.entries()) {
      if (usados.has(k)) continue;
      const d = Math.hypot(c.x - cx, c.y - cy);
      if (!melhor || d < melhor.d) melhor = { k, d, c };
    }
    if (melhor) usados.add(melhor.k);
    return melhor?.c;
  });
  if (achados.some((c) => !c)) return null;
  // os 4 precisam ter tamanho parecido (evita confundir com uma mancha de tinta)
  const areas = achados.map((c) => c.area);
  if (Math.max(...areas) > Math.min(...areas) * 4) return null;
  return achados.map((c) => [c.x, c.y]);
}

// Homografia por 4 pares (DLT com h33 = 1): devolve f(x, y) → [x', y']
export function homografia(de, para) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = de[i];
    const [u, v] = para[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = resolver(A, b);
  if (!h) return null;
  return (x, y) => {
    const z = h[6] * x + h[7] * y + 1;
    return [(h[0] * x + h[1] * y + h[2]) / z, (h[3] * x + h[4] * y + h[5]) / z];
  };
}

function resolver(A, b) {
  const n = b.length;
  const M = A.map((l, i) => [...l, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((l, i) => l[n] / l[i]);
}

// Recorta a zona de escrita (mm) → { w, h, alfa: Uint8ClampedArray } com a tinta (0 = papel).
// Corta as sobras laterais; a altura fica a da zona, para manter a linha de base.
export function recortarZona(img, lum, mmParaFoto, zona, pxPorMm = 10) {
  const w = Math.round(zona.largura * pxPorMm);
  const h = Math.round(zona.altura * pxPorMm);
  const amostra = new Float32Array(w * h);
  const { width: W, height: H } = img;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [fx, fy] = mmParaFoto(zona.x + (x + 0.5) / pxPorMm, zona.y + (y + 0.5) / pxPorMm);
      const ix = Math.min(W - 1, Math.max(0, Math.round(fx)));
      const iy = Math.min(H - 1, Math.max(0, Math.round(fy)));
      amostra[y * w + x] = lum[iy * W + ix];
    }
  const ordenada = Float32Array.from(amostra).sort();
  const papel = ordenada[Math.floor(ordenada.length * 0.85)] || 1;
  const alfa = new Uint8ClampedArray(w * h);
  let tinta = 0;
  for (let i = 0; i < alfa.length; i++) {
    const t = (papel * 0.72 - amostra[i]) / (papel * 0.4);
    alfa[i] = t <= 0 ? 0 : Math.min(255, Math.round(t * 255));
    if (alfa[i] > 128) tinta++;
  }
  if (tinta < Math.max(18, w * h * 0.0012)) return null; // célula em branco (o ponto final é pequeno)
  let x0 = w;
  let x1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (alfa[y * w + x] > 96) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
      }
  if (x1 < x0) return null;
  x0 = Math.max(0, x0 - 2);
  x1 = Math.min(w - 1, x1 + 2);
  const nw = x1 - x0 + 1;
  const corte = new Uint8ClampedArray(nw * h);
  for (let y = 0; y < h; y++) corte.set(alfa.subarray(y * w + x0, y * w + x1 + 1), y * nw);
  return { w: nw, h, alfa: corte };
}

// Foto da folha-modelo → { ok, celulas: [{ caractere, w, h, alfa }], faltam } ou { ok:false, erro }
export function lerFolhaModelo(img) {
  const marcas = acharMarcadores(img);
  if (!marcas) return { ok: false, erro: "Não achei os 4 quadrados pretos. Fotografe a folha inteira, de frente, com boa luz." };
  const mmParaFoto = homografia(CENTROS_MARCADORES, marcas);
  if (!mmParaFoto) return { ok: false, erro: "Não consegui alinhar a folha. Tire outra foto, mais de frente." };
  // conferência: o lado do marcador na foto não pode ser absurdo (foto de outra coisa)
  const [ax, ay] = mmParaFoto(MARCADOR.cantos[0][0], MARCADOR.cantos[0][1]);
  const [bx, by] = mmParaFoto(MARCADOR.cantos[0][0] + MARCADOR.lado, MARCADOR.cantos[0][1]);
  if (Math.hypot(bx - ax, by - ay) < 6) return { ok: false, erro: "A folha ficou pequena demais na foto. Chegue mais perto." };
  const lum = luminancias(img);
  const celulas = [];
  CARACTERES_MODELO.forEach((caractere, i) => {
    const r = recortarZona(img, lum, mmParaFoto, zonaDaCelula(i));
    if (r) celulas.push({ caractere, ...r });
  });
  const faltam = [...new Set(CARACTERES_MODELO)].filter((c) => !celulas.some((x) => x.caractere === c));
  return { ok: true, celulas, faltam };
}
