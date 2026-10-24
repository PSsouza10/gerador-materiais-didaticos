// Escrita "à mão" com as letras do professor: tela (SVG) e exportação (canvas) usam o mesmo layout.
import { escreverComLetra } from "@/lib/letraProfessor";

export const TINTA_RGB = [196, 22, 28];

// Recorte da folha-modelo (alfa) → PNG vermelho com fundo transparente
export function alfaParaPng({ w, h, alfa }) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const im = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    im.data[i * 4] = TINTA_RGB[0];
    im.data[i * 4 + 1] = TINTA_RGB[1];
    im.data[i * 4 + 2] = TINTA_RGB[2];
    im.data[i * 4 + 3] = alfa[i];
  }
  ctx.putImageData(im, 0, 0);
  return c.toDataURL("image/png");
}

export function EscritaSvg({ texto, glifos, tamanho, x, base, larguraMax, entreLinhas }) {
  const { itens } = escreverComLetra(texto, glifos, { tamanho, x0: x, base, larguraMax, entreLinhas });
  return (
    <g>
      {itens.map((it, i) => (
        <image key={i} href={it.src} x={it.x} y={it.y} width={it.w} height={it.h} transform={`rotate(${it.rot} ${it.x + it.w / 2} ${it.y + it.h / 2})`} preserveAspectRatio="none" />
      ))}
    </g>
  );
}

const cache = new Map();
const imagem = (src) => {
  if (!cache.has(src))
    cache.set(
      src,
      new Promise((ok) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = () => ok(null);
        i.src = src;
      })
    );
  return cache.get(src);
};

export async function desenharEscrita(ctx, texto, glifos, opcoes) {
  const { itens } = escreverComLetra(texto, glifos, opcoes);
  for (const it of itens) {
    const im = await imagem(it.src);
    if (!im) continue;
    ctx.save();
    ctx.translate(it.x + it.w / 2, it.y + it.h / 2);
    ctx.rotate((it.rot * Math.PI) / 180);
    ctx.drawImage(im, -it.w / 2, -it.h / 2, it.w, it.h);
    ctx.restore();
  }
}
