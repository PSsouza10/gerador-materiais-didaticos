// Geometria das marcas de "caneta vermelha" sobre a foto da redação.
// Usada pela tela (SVG) e pela exportação (canvas), para as duas saírem iguais.
// Coordenadas da marca: 0–1000 (padrão do Gemini) → pixels da foto (W × H).

export const TINTA = "rgba(196, 22, 28, 0.88)";
export const FONTE_MAO = "Caveat";
const CIRCULA = new Set(["ortografia", "acentuação", "crase", "outro"]);

// pseudoaleatório estável por marca: o traço "tremido" não muda a cada desenho
const sorte = (n) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export function desenhoDaMarca(m, tipo, W, H, k = 0, deslocamento = { dx: 0, dy: 0 }) {
  const x1 = (m.x1 / 1000) * W + deslocamento.dx;
  const x2 = Math.max((m.x2 / 1000) * W + deslocamento.dx, x1 + W * 0.02);
  const y1 = (m.y1 / 1000) * H + deslocamento.dy;
  const y2 = Math.max((m.y2 / 1000) * H + deslocamento.dy, y1 + H * 0.012);
  const alturaLinha = y2 - y1;
  const traco = Math.max(2, Math.min(W, H) / 380);
  const fonte = Math.max(14, alturaLinha * 0.72);
  const base = { x1, x2, y1, y2, traco, fonte, textoX: Math.min(Math.max(x1, 4), W - fonte * 4), textoY: Math.max(y1 - alturaLinha * 0.12, fonte) };
  if (CIRCULA.has(tipo)) {
    const pad = alturaLinha * 0.18;
    return { ...base, forma: "circulo", cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, rx: (x2 - x1) / 2 + pad, ry: alturaLinha / 2 + pad * 0.6, rot: (sorte(k) - 0.5) * 6 };
  }
  // sublinhado ondulado, como professor faz em concordância, regência, pontuação...
  const yb = y2 + alturaLinha * 0.06;
  const passo = Math.max(alturaLinha * 0.35, 8);
  const amp = alturaLinha * 0.08;
  let d = `M ${x1.toFixed(1)} ${yb.toFixed(1)}`;
  for (let x = x1, i = 0; x < x2; x += passo, i++) d += ` Q ${(x + passo / 2).toFixed(1)} ${(yb + (i % 2 ? -amp : amp)).toFixed(1)} ${Math.min(x + passo, x2).toFixed(1)} ${yb.toFixed(1)}`;
  return { ...base, forma: "sublinhado", d };
}

// O que o professor escreve acima do erro: só as palavras que mudam
// ("os professor" → "os professores" vira "professores"; "cabe a" → "cabe à" vira "à")
export const notaDaMarca = (erro) => {
  const c = String(erro?.correcao || "").trim();
  const antes = new Set(String(erro?.trecho || "").toLowerCase().split(/\s+/));
  const novas = c.split(/\s+/).filter((p) => p && !antes.has(p.toLowerCase()));
  const t = novas.length && novas.length < c.split(/\s+/).length ? novas.join(" ") : c;
  return t.length > 30 ? `${t.slice(0, 28)}…` : t;
};
