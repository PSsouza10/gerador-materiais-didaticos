"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

// Task 2.1 — Live preview: mostra a folha A4 real (210 mm ≈ 794 px) reduzida
// para caber na coluna, mantendo a proporção exata.
//
// A contagem de páginas e as marcas de "fim da página" simulam as MESMAS
// regras do PDF/impressão: área útil de 267 mm por página (297 − 2×15 mm de
// margem), blocos que não podem ser cortados vão inteiros para a página
// seguinte, e a capa ocupa uma página própria.
const MM = 793.7 / 210;
const LARGURA_A4_PX = 793.7;
const ALTURA_A4_PX = 297 * MM;
const MARGEM_PX = 15 * MM;
const UTIL_PX = ALTURA_A4_PX - 2 * MARGEM_PX;
const SELETOR_BLOCOS = ".cabecalho-escola, .cartao-bncc, .bloco-exercicio, .quebra-antes";

// Retorna as posições (em px, dentro da área de conteúdo da folha) onde começam as páginas 2, 3...
export function simularQuebras(folha) {
  const base = folha.getBoundingClientRect().top;
  const escala = folha.getBoundingClientRect().height / folha.offsetHeight || 1;
  const topoConteudo = parseFloat(getComputedStyle(folha).paddingTop) || 0;
  const altConteudo = folha.scrollHeight - topoConteudo - (parseFloat(getComputedStyle(folha).paddingBottom) || 0);
  const blocos = [...folha.querySelectorAll(SELETOR_BLOCOS)]
    .filter((el) => !el.parentElement.closest(".bloco-exercicio"))
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { topo: (r.top - base) / escala - topoConteudo, alt: r.height / escala, forcada: el.classList.contains("quebra-antes") };
    })
    .sort((a, b) => a.topo - b.topo);

  const quebras = [];
  let desloc = 0;
  let limite = UTIL_PX;
  const naturais = (ate) => {
    while (ate >= limite) {
      quebras.push(limite - desloc);
      limite += UTIL_PX;
    }
  };
  for (const b of blocos) {
    naturais(b.topo + desloc);
    const inicioPagina = limite - UTIL_PX;
    if (b.forcada && b.topo + desloc > inicioPagina + 1) {
      quebras.push(b.topo);
      desloc += limite - (b.topo + desloc);
      limite += UTIL_PX;
    } else if (b.topo + desloc + b.alt > limite && b.alt <= UTIL_PX && b.topo + desloc > inicioPagina + 1) {
      quebras.push(b.topo);
      desloc += limite - (b.topo + desloc);
      limite += UTIL_PX;
    }
  }
  naturais(altConteudo + desloc - 1);
  return { quebras, topoConteudo };
}

export default function PreviewEscalado({ children, larguraMax = 794, onPaginas }) {
  const moldura = useRef(null);
  const conteudo = useRef(null);
  const [escala, setEscala] = useState(0.5);
  const [altura, setAltura] = useState(ALTURA_A4_PX);
  const [marcas, setMarcas] = useState({ capa: false, linhas: [], paginas: 1, paginasFolha: 1 });

  const medir = () => {
    if (!moldura.current || !conteudo.current) return;
    const largura = Math.min(moldura.current.parentElement.clientWidth, larguraMax);
    setEscala(largura / LARGURA_A4_PX);
    setAltura(Math.max(conteudo.current.scrollHeight, ALTURA_A4_PX));

    const capa = conteudo.current.querySelector(".capa-a4");
    const folha = conteudo.current.querySelector(".folha-a4");
    if (!folha) return;
    const { quebras, topoConteudo } = simularQuebras(folha);
    const y0 = folha.offsetTop + topoConteudo;
    const novo = {
      capa: !!capa,
      linhas: quebras.map((q) => y0 + q),
      paginasFolha: quebras.length + 1,
      paginas: quebras.length + 1 + (capa ? 1 : 0),
    };
    setMarcas((m) => (JSON.stringify(m) === JSON.stringify(novo) ? m : novo));
  };

  useEffect(() => {
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(moldura.current.parentElement);
    ro.observe(conteudo.current);
    const mo = new MutationObserver(medir);
    mo.observe(conteudo.current, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class"] });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [larguraMax]);

  useLayoutEffect(() => {
    onPaginas?.(marcas);
  }, [marcas, onPaginas]);

  const Marca = ({ y, texto }) => (
    <div
      className="nao-imprimir pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-rose-300"
      style={{ top: y * escala }}
    >
      <span className="absolute right-1 -top-4 rounded bg-rose-50 px-1 text-[10px] font-semibold text-rose-700">{texto}</span>
    </div>
  );

  return (
    <div className="area-impressao">
      <div
        ref={moldura}
        className="moldura-preview relative mx-auto overflow-hidden rounded-md bg-white shadow-[0_10px_30px_-8px_rgba(30,41,59,0.25)] ring-1 ring-slate-200"
        style={{ width: LARGURA_A4_PX * escala, height: altura * escala }}
      >
        <div ref={conteudo} className="escala-preview origin-top-left" style={{ width: LARGURA_A4_PX, transform: `scale(${escala})` }}>
          {children}
        </div>
        {marcas.capa && <Marca y={ALTURA_A4_PX} texto="fim da capa" />}
        {marcas.linhas.map((y, i) => (
          <Marca key={i} y={y} texto={`página ${i + (marcas.capa ? 3 : 2)} começa aqui`} />
        ))}
      </div>
      <p className="nao-imprimir mt-2 text-center text-[11px] text-slate-600" aria-live="polite">
        A4 · {escala >= 1 ? "100%" : `${Math.round(escala * 100)}%`} · {marcas.paginas} {marcas.paginas > 1 ? "páginas" : "página"} no PDF
        {marcas.capa ? " (com capa)" : ""}
      </p>
    </div>
  );
}
