"use client";
import { useEffect, useRef } from "react";

// Quadro para o professor escrever com o dedo ou a caneta (tinta vermelha, fundo transparente).
// Devolve a escrita recortada: { src, w, h }.
export default function PadMao({ titulo, aoUsar, aoFechar }) {
  const ref = useRef(null);
  const desenhando = useRef(null);
  const tocou = useRef(false);

  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext("2d");
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.strokeStyle = "rgb(196, 22, 28)";
    ctx.lineWidth = 5;
  }, []);

  const ponto = (e) => {
    const r = ref.current.getBoundingClientRect();
    return [((e.clientX - r.left) * ref.current.width) / r.width, ((e.clientY - r.top) * ref.current.height) / r.height];
  };
  function inicio(e) {
    e.preventDefault();
    ref.current.setPointerCapture?.(e.pointerId);
    desenhando.current = ponto(e);
    tocou.current = true;
  }
  function move(e) {
    if (!desenhando.current) return;
    const ctx = ref.current.getContext("2d");
    const [x, y] = ponto(e);
    const [px, py] = desenhando.current;
    ctx.lineWidth = e.pressure && e.pointerType === "pen" ? 3 + e.pressure * 5 : 5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
    ctx.lineTo(x, y);
    ctx.stroke();
    desenhando.current = [x, y];
  }
  const fim = () => (desenhando.current = null);
  function limpar() {
    ref.current.getContext("2d").clearRect(0, 0, ref.current.width, ref.current.height);
    tocou.current = false;
  }
  function usar() {
    const c = ref.current;
    const { data, width: W, height: H } = c.getContext("2d").getImageData(0, 0, c.width, c.height);
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (data[(y * W + x) * 4 + 3] > 20) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    if (x1 < 0) return aoFechar();
    const m = 6;
    x0 = Math.max(0, x0 - m);
    y0 = Math.max(0, y0 - m);
    x1 = Math.min(W - 1, x1 + m);
    y1 = Math.min(H - 1, y1 + m);
    const o = document.createElement("canvas");
    o.width = x1 - x0 + 1;
    o.height = y1 - y0 + 1;
    o.getContext("2d").drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
    aoUsar({ src: o.toDataURL("image/png"), w: o.width, h: o.height });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl">
        <p className="text-sm font-bold text-slate-900">{titulo}</p>
        <p className="text-xs text-slate-500">Escreva com o dedo ou a caneta, do tamanho que quiser.</p>
        <canvas
          ref={ref}
          width={1000}
          height={340}
          className="mt-2 w-full touch-none rounded-xl border border-slate-300"
          style={{ background: "repeating-linear-gradient(#fffdf6, #fffdf6 38px, #eadfc8 39px)" }}
          onPointerDown={inicio}
          onPointerMove={move}
          onPointerUp={fim}
          onPointerCancel={fim}
          onPointerLeave={fim}
        />
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={usar} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Usar
          </button>
          <button type="button" onClick={limpar} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800">
            Limpar
          </button>
          <button type="button" onClick={aoFechar} className="ml-auto text-sm font-semibold text-slate-500 hover:underline">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
