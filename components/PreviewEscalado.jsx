"use client";
import React, { useEffect, useRef, useState } from "react";

// Task 2.1 — Live preview: mostra a folha A4 real (210 mm ≈ 794 px) reduzida
// para caber na coluna, mantendo a proporção exata. A escala acompanha a
// largura da coluna e a altura acompanha o conteúdo (várias páginas).
const LARGURA_A4_PX = 793.7; // 210 mm a 96 dpi
const ALTURA_A4_PX = 1122.5; // 297 mm

export default function PreviewEscalado({ children, larguraMax = 794 }) {
  const moldura = useRef(null);
  const conteudo = useRef(null);
  const [escala, setEscala] = useState(0.5);
  const [altura, setAltura] = useState(ALTURA_A4_PX);

  useEffect(() => {
    const medir = () => {
      if (!moldura.current || !conteudo.current) return;
      const largura = Math.min(moldura.current.parentElement.clientWidth, larguraMax);
      setEscala(largura / LARGURA_A4_PX);
      setAltura(Math.max(conteudo.current.scrollHeight, ALTURA_A4_PX));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(moldura.current.parentElement);
    ro.observe(conteudo.current);
    return () => ro.disconnect();
  }, [larguraMax]);

  const paginas = Math.max(1, Math.round((altura / ALTURA_A4_PX) * 10) / 10);

  return (
    <div className="area-impressao">
      <div
        ref={moldura}
        className="moldura-preview relative mx-auto overflow-hidden rounded-md bg-white shadow-[0_10px_30px_-8px_rgba(30,41,59,0.25)] ring-1 ring-slate-200"
        style={{ width: LARGURA_A4_PX * escala, height: altura * escala }}
      >
        <div
          ref={conteudo}
          className="escala-preview origin-top-left"
          style={{ width: LARGURA_A4_PX, transform: `scale(${escala})` }}
        >
          {children}
        </div>
        {/* Marcas de fim de página A4 (só na tela) */}
        {Array.from({ length: Math.floor(altura / ALTURA_A4_PX) }, (_, i) => i + 1)
          .filter((p) => p * ALTURA_A4_PX < altura - 4)
          .map((p) => (
            <div
              key={p}
              className="nao-imprimir pointer-events-none absolute inset-x-0 border-t border-dashed border-rose-300"
              style={{ top: p * ALTURA_A4_PX * escala }}
            >
              <span className="absolute right-1 -top-4 rounded bg-rose-50 px-1 text-[9px] font-semibold text-rose-400">
                fim da pág. {p}
              </span>
            </div>
          ))}
      </div>
      <p className="nao-imprimir mt-2 text-center text-[11px] text-slate-400">
        A4 · {escala >= 1 ? "100%" : `${Math.round(escala * 100)}%`} · ≈ {paginas.toLocaleString("pt-BR")}{" "}
        {paginas > 1 ? "páginas" : "página"}
      </p>
    </div>
  );
}
