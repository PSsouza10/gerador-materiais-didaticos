import React from "react";
import { rotuloReta } from "@/lib/figuras";

// Desenha as figuras didáticas descritas pela IA (ver lib/figuras.js).
// SVG/HTML simples, em tons que funcionam em impressão P&B (contorno escuro,
// preenchimento médio), e só com recursos que o html2canvas desenha bem.

const COR = "#4f46e5";
const PINTADO = "#a5b4fc";
const TRACO = "#334155";

function Reta({ f }) {
  const W = 520;
  const x0 = 30;
  const x1 = W - 30;
  const y = 34;
  const passo = (x1 - x0) / f.divisoes;
  const marcas = Array.from({ length: f.divisoes + 1 }, (_, k) => k);
  const mostra = (k) => f.rotulos === "todos" || (f.rotulos === "extremos" && (k === 0 || k === f.divisoes));
  return (
    <svg width={W} height={70} viewBox={`0 0 ${W} 70`} role="img" aria-label={f.legenda || `Reta numérica de ${rotuloReta(f, 0)} a ${rotuloReta(f, f.divisoes)} dividida em ${f.divisoes} partes iguais`}>
      <line x1={x0 - 12} y1={y} x2={x1 + 12} y2={y} stroke={TRACO} strokeWidth="2.5" />
      <path d={`M${x1 + 12} ${y - 5} L${x1 + 20} ${y} L${x1 + 12} ${y + 5}Z`} fill={TRACO} />
      {marcas.map((k) => (
        <g key={k}>
          <line x1={x0 + k * passo} y1={y - (k === 0 || k === f.divisoes ? 11 : 8)} x2={x0 + k * passo} y2={y + (k === 0 || k === f.divisoes ? 11 : 8)} stroke={TRACO} strokeWidth="2" />
          {mostra(k) && (
            <text x={x0 + k * passo} y={y + 28} textAnchor="middle" fontSize="14" fontWeight="700" fill={TRACO}>
              {rotuloReta(f, k)}
            </text>
          )}
        </g>
      ))}
      {f.marcar != null && (
        <g>
          <circle cx={x0 + f.marcar * passo} cy={y} r="7" fill={COR} />
          <text x={x0 + f.marcar * passo} y={y - 14} textAnchor="middle" fontSize="14" fontWeight="800" fill={COR}>A</text>
        </g>
      )}
    </svg>
  );
}

function Fracao({ f }) {
  if (f.forma === "circulo") {
    const r = 56;
    const c = 62;
    const fatias = Array.from({ length: f.partes }, (_, i) => {
      if (f.partes === 1) return <circle key={i} cx={c} cy={c} r={r} fill={f.pintadas ? PINTADO : "#fff"} stroke={TRACO} strokeWidth="2" />;
      const a0 = (i / f.partes) * 2 * Math.PI - Math.PI / 2;
      const a1 = ((i + 1) / f.partes) * 2 * Math.PI - Math.PI / 2;
      const grande = a1 - a0 > Math.PI ? 1 : 0;
      const d = `M${c} ${c} L${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)} A${r} ${r} 0 ${grande} 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)}Z`;
      return <path key={i} d={d} fill={i < f.pintadas ? PINTADO : "#fff"} stroke={TRACO} strokeWidth="2" />;
    });
    return (
      <svg width={124} height={124} viewBox="0 0 124 124" role="img" aria-label={f.legenda || `Círculo dividido em ${f.partes} partes iguais, ${f.pintadas} pintada(s)`}>
        {fatias}
      </svg>
    );
  }
  const W = 420;
  const w = W / f.partes;
  return (
    <svg width={W + 4} height={54} viewBox={`0 0 ${W + 4} 54`} role="img" aria-label={f.legenda || `Barra dividida em ${f.partes} partes iguais, ${f.pintadas} pintada(s)`}>
      {Array.from({ length: f.partes }, (_, i) => (
        <rect key={i} x={2 + i * w} y={2} width={w} height={50} fill={i < f.pintadas ? PINTADO : "#fff"} stroke={TRACO} strokeWidth="2" />
      ))}
    </svg>
  );
}

function Grade({ f }) {
  const lado = Math.min(30, Math.floor(420 / f.colunas), Math.floor(240 / f.linhas));
  return (
    <svg width={f.colunas * lado + 4} height={f.linhas * lado + 4} role="img" aria-label={f.legenda || `Malha com ${f.linhas} linhas e ${f.colunas} colunas`}>
      {Array.from({ length: f.linhas * f.colunas }, (_, i) => (
        <rect
          key={i}
          x={2 + (i % f.colunas) * lado}
          y={2 + Math.floor(i / f.colunas) * lado}
          width={lado}
          height={lado}
          fill={i < f.pintadas ? PINTADO : "#fff"}
          stroke={TRACO}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

function Tabela({ f }) {
  return (
    <table className="border-collapse text-[11.5px]">
      {f.cabecalho.some(Boolean) && (
        <thead>
          <tr>
            {f.cabecalho.map((c, i) => (
              <th key={i} className="border border-slate-400 bg-indigo-50 px-3 py-1 text-left font-bold text-slate-800">{c}</th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {f.linhas.map((l, i) => (
          <tr key={i}>
            {l.map((c, j) => (
              <td key={j} className="border border-slate-400 px-3 py-1 text-slate-700">{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Barras({ f }) {
  const max = Math.max(...f.itens.map((i) => i.valor), 1);
  const H = 130;
  const larg = Math.min(56, Math.floor(440 / f.itens.length) - 12);
  const W = f.itens.length * (larg + 12) + 40;
  const fmt = (v) => String(Number(v.toPrecision(10))).replace(".", ",");
  return (
    <svg width={W} height={H + 52} viewBox={`0 0 ${W} ${H + 52}`} role="img" aria-label={f.legenda || f.titulo || "Gráfico de barras"}>
      {f.titulo && <text x={W / 2} y={12} textAnchor="middle" fontSize="12" fontWeight="700" fill={TRACO}>{f.titulo}</text>}
      <line x1={30} y1={H + 20} x2={W - 4} y2={H + 20} stroke={TRACO} strokeWidth="1.5" />
      <line x1={30} y1={20} x2={30} y2={H + 20} stroke={TRACO} strokeWidth="1.5" />
      {f.itens.map((it, i) => {
        const h = (it.valor / max) * (H - 14);
        const x = 40 + i * (larg + 12);
        return (
          <g key={i}>
            <rect x={x} y={H + 20 - h} width={larg} height={h} fill={PINTADO} stroke={COR} strokeWidth="1.5" />
            <text x={x + larg / 2} y={H + 14 - h} textAnchor="middle" fontSize="11" fontWeight="700" fill={TRACO}>
              {fmt(it.valor)}{f.unidade ? ` ${f.unidade}` : ""}
            </text>
            <text x={x + larg / 2} y={H + 36} textAnchor="middle" fontSize="10.5" fill={TRACO}>{it.rotulo}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LinhaDoTempo({ f }) {
  return (
    <div className="relative w-full max-w-[560px] px-2 pt-1" role="img" aria-label={f.legenda || "Linha do tempo"}>
      <div className="absolute left-2 right-2 top-[13px] h-[3px] bg-slate-600" />
      <ol className="relative grid gap-2" style={{ gridTemplateColumns: `repeat(${f.eventos.length}, minmax(0, 1fr))` }}>
        {f.eventos.map((e, i) => (
          <li key={i} className="flex flex-col items-center text-center">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-white bg-indigo-600" style={{ marginTop: 6 }} />
            <span className="mt-1 text-[11.5px] font-extrabold text-indigo-700">{e.data}</span>
            <span className="text-[10.5px] leading-tight text-slate-600">{e.texto}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function FiguraDidatica({ figura, className = "" }) {
  if (!figura) return null;
  const Comp = { reta: Reta, fracao: Fracao, grade: Grade, tabela: Tabela, barras: Barras, linha_do_tempo: LinhaDoTempo }[figura.tipo];
  if (!Comp) return null;
  return (
    <figure className={`figura-didatica flex flex-col items-center ${className}`}>
      <Comp f={figura} />
      {figura.legenda && <figcaption className="mt-1 text-[10.5px] italic text-slate-500">{figura.legenda}</figcaption>}
    </figure>
  );
}
