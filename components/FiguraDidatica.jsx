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

// Etapas em caixas ligadas por setas; em ciclo, a última volta para a primeira
function Fluxo({ f }) {
  return (
    <div className="flex flex-col items-center" role="img" aria-label={f.legenda || `${f.ciclo ? "Ciclo" : "Sequência"}: ${f.etapas.join(", ")}`}>
      <ol className="flex flex-wrap items-center justify-center gap-y-2">
        {f.etapas.map((e, i) => (
          <li key={i} className="flex items-center">
            <span className="flex min-h-[44px] max-w-[130px] items-center justify-center rounded-xl border-2 border-indigo-400 bg-indigo-50 px-2.5 py-1 text-center text-[11px] font-bold leading-tight text-indigo-900">
              {e}
            </span>
            {i < f.etapas.length - 1 && <span className="px-1.5 text-[18px] font-black text-indigo-500" aria-hidden="true">→</span>}
          </li>
        ))}
      </ol>
      {f.ciclo && <span className="mt-1 text-[11px] font-bold text-indigo-500">↺ volta para &ldquo;{f.etapas[0]}&rdquo;</span>}
    </div>
  );
}

// Mapa conceitual: ideia central e ramos ao redor
function Mapa({ f }) {
  const W = 520;
  const H = 210;
  const cx = W / 2;
  const cy = H / 2;
  const pos = f.ramos.map((_, i) => {
    const a = (i / f.ramos.length) * 2 * Math.PI - Math.PI / 2;
    return [cx + Math.cos(a) * 190, cy + Math.sin(a) * 78];
  });
  return (
    <div className="relative" style={{ width: W, height: H }} role="img" aria-label={f.legenda || `Mapa conceitual: ${f.centro} — ${f.ramos.join(", ")}`}>
      <svg className="absolute inset-0" width={W} height={H} aria-hidden="true">
        {pos.map(([x, y], i) => (
          <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#818cf8" strokeWidth="2" />
        ))}
      </svg>
      {pos.map(([x, y], i) => (
        <span
          key={i}
          className="absolute flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-2 py-1 text-center text-[10.5px] font-semibold leading-tight text-slate-700"
          style={{ left: x - 62, top: y - 17, width: 124, minHeight: 34 }}
        >
          {f.ramos[i]}
        </span>
      ))}
      <span
        className="absolute flex items-center justify-center rounded-full bg-indigo-600 px-3 text-center text-[12px] font-black leading-tight text-white"
        style={{ left: cx - 70, top: cy - 24, width: 140, height: 48 }}
      >
        {f.centro}
      </span>
    </div>
  );
}


// ===== Suportes visuais das avaliações (preto e branco: traço escuro, cinzas, rótulos diretos) =====
const fmtN = (v) => String(Number(Number(v).toPrecision(10))).replace(".", ",");
const comUnidade = (v, u) => `${fmtN(v)}${u ? ` ${u}` : ""}`;

// Bloco retangular em perspectiva cavaleira com as três medidas escritas nas arestas
function Bloco({ f }) {
  const maior = Math.max(f.comprimento, f.largura, f.altura);
  const esc = (v) => 40 + (v / maior) * 150; // 40 a 190 px: proporção aproximada, nunca some
  const c = esc(f.comprimento);
  const a = esc(f.altura) * 0.8;
  const p = esc(f.largura) * 0.45; // profundidade desenhada a 45°
  const x0 = 78;
  const y0 = 20 + p;
  const W = x0 + c + p + 78;
  const H = y0 + a + 34;
  const pt = (x, y) => `${x},${y}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={f.legenda || `Bloco retangular de ${comUnidade(f.comprimento, f.unidade)} por ${comUnidade(f.largura, f.unidade)} por ${comUnidade(f.altura, f.unidade)}`}>
      <polygon points={[pt(x0, y0), pt(x0 + p, y0 - p), pt(x0 + p + c, y0 - p), pt(x0 + c, y0)].join(" ")} fill="#e5e7eb" stroke={TRACO} strokeWidth="2" />
      <polygon points={[pt(x0 + c, y0), pt(x0 + c + p, y0 - p), pt(x0 + c + p, y0 - p + a), pt(x0 + c, y0 + a)].join(" ")} fill="#d1d5db" stroke={TRACO} strokeWidth="2" />
      <rect x={x0} y={y0} width={c} height={a} fill="#f8fafc" stroke={TRACO} strokeWidth="2" />
      <line x1={x0} y1={y0 + a} x2={x0 + p} y2={y0 + a - p} stroke={TRACO} strokeWidth="1.2" strokeDasharray="4 3" />
      <line x1={x0 + p} y1={y0 + a - p} x2={x0 + p} y2={y0 - p} stroke={TRACO} strokeWidth="1.2" strokeDasharray="4 3" />
      <line x1={x0 + p} y1={y0 + a - p} x2={x0 + p + c} y2={y0 + a - p} stroke={TRACO} strokeWidth="1.2" strokeDasharray="4 3" />
      <text x={x0 + c / 2} y={y0 + a + 20} textAnchor="middle" fontSize="13" fontWeight="700" fill={TRACO}>{comUnidade(f.comprimento, f.unidade)}</text>
      <text x={x0 - 8} y={y0 + a / 2 + 4} textAnchor="end" fontSize="13" fontWeight="700" fill={TRACO}>{comUnidade(f.altura, f.unidade)}</text>
      <text x={x0 + c + p / 2 + 8} y={y0 + a - p / 2 + 18} textAnchor="start" fontSize="13" fontWeight="700" fill={TRACO}>{comUnidade(f.largura, f.unidade)}</text>
    </svg>
  );
}

function Poligono({ f }) {
  const u = f.unidade;
  if (f.forma === "quadrado") {
    const L = 140;
    return (
      <svg width={L + 100} height={L + 50} viewBox={`0 0 ${L + 100} ${L + 50}`} role="img" aria-label={f.legenda || `Quadrado de lado ${comUnidade(f.lado, u)}`}>
        <rect x={50} y={10} width={L} height={L} fill="#f1f5f9" stroke={TRACO} strokeWidth="2" />
        <text x={50 + L / 2} y={L + 32} textAnchor="middle" fontSize="13" fontWeight="700" fill={TRACO}>{comUnidade(f.lado, u)}</text>
        <text x={44} y={10 + L / 2 + 4} textAnchor="end" fontSize="13" fontWeight="700" fill={TRACO}>{comUnidade(f.lado, u)}</text>
      </svg>
    );
  }
  const maior = Math.max(f.base, f.altura);
  const b = 60 + (f.base / maior) * 200;
  const h = 40 + (f.altura / maior) * 130;
  const x0 = 70;
  const y0 = 10;
  const W = x0 + b + 90;
  const H = y0 + h + 34;
  if (f.forma === "triangulo") {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={f.legenda || `Triângulo retângulo com catetos de ${comUnidade(f.base, u)} e ${comUnidade(f.altura, u)}`}>
        <polygon points={`${x0},${y0} ${x0},${y0 + h} ${x0 + b},${y0 + h}`} fill="#f1f5f9" stroke={TRACO} strokeWidth="2" />
        <polyline points={`${x0},${y0 + h - 14} ${x0 + 14},${y0 + h - 14} ${x0 + 14},${y0 + h}`} fill="none" stroke={TRACO} strokeWidth="1.5" />
        <text x={x0 + b / 2} y={y0 + h + 20} textAnchor="middle" fontSize="13" fontWeight="700" fill={TRACO}>{comUnidade(f.base, u)}</text>
        <text x={x0 - 8} y={y0 + h / 2 + 4} textAnchor="end" fontSize="13" fontWeight="700" fill={TRACO}>{comUnidade(f.altura, u)}</text>
        {f.hipotenusa != null && (
          <text x={x0 + b / 2 + 10} y={y0 + h / 2 - 6} textAnchor="start" fontSize="13" fontWeight="700" fill={TRACO}>{comUnidade(f.hipotenusa, u)}</text>
        )}
      </svg>
    );
  }
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={f.legenda || `Retângulo de ${comUnidade(f.base, u)} por ${comUnidade(f.altura, u)}`}>
      <rect x={x0} y={y0} width={b} height={h} fill="#f1f5f9" stroke={TRACO} strokeWidth="2" />
      <text x={x0 + b / 2} y={y0 + h + 20} textAnchor="middle" fontSize="13" fontWeight="700" fill={TRACO}>{comUnidade(f.base, u)}</text>
      <text x={x0 - 8} y={y0 + h / 2 + 4} textAnchor="end" fontSize="13" fontWeight="700" fill={TRACO}>{comUnidade(f.altura, u)}</text>
    </svg>
  );
}

function Angulo({ f }) {
  const cx = 40;
  const cy = 130;
  const R = 150;
  const rad = (f.graus * Math.PI) / 180;
  const x2 = cx + R * Math.cos(rad);
  const y2 = cy - R * Math.sin(rad);
  const r = 34;
  const grande = f.graus > 180 ? 1 : 0;
  const minX = Math.min(0, x2 - 10);
  const W = Math.max(cx + R + 20, x2 + 20) - minX;
  const maxY = Math.max(cy + 20, y2 + 20);
  return (
    <svg width={W} height={maxY + 4} viewBox={`${minX} -10 ${W} ${maxY + 14}`} role="img" aria-label={f.legenda || `Ângulo${f.mostrarMedida ? ` de ${fmtN(f.graus)} graus` : ""}`}>
      <line x1={cx} y1={cy} x2={cx + R} y2={cy} stroke={TRACO} strokeWidth="2.2" />
      <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={TRACO} strokeWidth="2.2" />
      {f.graus === 90 ? (
        <polyline points={`${cx + 18},${cy} ${cx + 18},${cy - 18} ${cx},${cy - 18}`} fill="none" stroke={TRACO} strokeWidth="1.6" />
      ) : (
        <path d={`M${cx + r} ${cy} A${r} ${r} 0 ${grande} 0 ${cx + r * Math.cos(rad)} ${cy - r * Math.sin(rad)}`} fill="none" stroke={TRACO} strokeWidth="1.6" />
      )}
      {f.mostrarMedida && (
        <text x={cx + (r + 22) * Math.cos(rad / 2)} y={cy - (r + 22) * Math.sin(rad / 2) + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={TRACO}>{fmtN(f.graus)}°</text>
      )}
    </svg>
  );
}

// Escala "redonda" do eixo vertical (0, 5, 10, 15, 20…), como nos gráficos das provas
function escalaRedonda(max) {
  const bruto = max / 4 || 1;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((k) => k * pot).find((k) => k >= bruto) || 10 * pot;
  const topo = Math.ceil(max / passo) * passo || passo;
  return { topo, marcas: Array.from({ length: Math.round(topo / passo) + 1 }, (_, k) => k * passo) };
}

function Linhas({ f }) {
  const { topo, marcas } = escalaRedonda(Math.max(...f.itens.map((i) => i.valor), 1));
  const T = f.titulo ? 34 : 14; // topo da área do gráfico
  const B = 170; // base
  const passo = Math.min(80, Math.floor(420 / f.itens.length));
  const x0 = 52;
  const W = x0 + 24 + passo * (f.itens.length - 1) + 40;
  const y = (v) => B - (B - T) * (v / topo);
  const pts = f.itens.map((it, i) => [x0 + 24 + i * passo, y(it.valor)]);
  return (
    <svg width={W} height={B + 26} viewBox={`0 0 ${W} ${B + 26}`} role="img" aria-label={f.legenda || f.titulo || "Gráfico de linhas"}>
      {f.titulo && <text x={W / 2} y={13} textAnchor="middle" fontSize="12" fontWeight="700" fill={TRACO}>{f.titulo}</text>}
      {marcas.map((m) => (
        <g key={m}>
          {m > 0 && <line x1={x0} x2={W - 8} y1={y(m)} y2={y(m)} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />}
          <text x={x0 - 6} y={y(m) + 4} textAnchor="end" fontSize="10.5" fill={TRACO}>{fmtN(m)}</text>
        </g>
      ))}
      <line x1={x0} y1={B} x2={W - 8} y2={B} stroke={TRACO} strokeWidth="1.5" />
      <line x1={x0} y1={T - 6} x2={x0} y2={B} stroke={TRACO} strokeWidth="1.5" />
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={TRACO} strokeWidth="2.2" />
      {f.itens.map((it, i) => (
        <g key={i}>
          <circle cx={pts[i][0]} cy={pts[i][1]} r="4" fill="#fff" stroke={TRACO} strokeWidth="2" />
          <text x={pts[i][0]} y={pts[i][1] - 9} textAnchor="middle" fontSize="11" fontWeight="700" fill={TRACO}>{comUnidade(it.valor, f.unidade)}</text>
          <text x={pts[i][0]} y={B + 16} textAnchor="middle" fontSize="10.5" fill={TRACO}>{it.rotulo}</text>
        </g>
      ))}
    </svg>
  );
}

// Fatias em tons de cinza diferentes + rótulo e porcentagem escritos fora da fatia
const CINZAS = ["#f8fafc", "#cbd5e1", "#94a3b8", "#e2e8f0", "#64748b", "#f1f5f9"];
function Setores({ f }) {
  const total = f.itens.reduce((s, i) => s + i.valor, 0) || 1;
  const cx = 200;
  const cy = 110;
  const r = 78;
  let a = -Math.PI / 2;
  const fatias = f.itens.map((it, i) => {
    const ang = (it.valor / total) * 2 * Math.PI;
    const a0 = a;
    a += ang;
    const meio = a0 + ang / 2;
    const pct = (it.valor / total) * 100;
    return { it, i, a0, a1: a, meio, pct };
  });
  return (
    <svg width={400} height={232} viewBox="0 0 400 232" role="img" aria-label={f.legenda || f.titulo || "Gráfico de setores"}>
      {f.titulo && <text x={cx} y={12} textAnchor="middle" fontSize="12" fontWeight="700" fill={TRACO}>{f.titulo}</text>}
      {fatias.map(({ i, a0, a1, it }) =>
        it.valor / total >= 0.9999 ? (
          <circle key={i} cx={cx} cy={cy + 8} r={r} fill={CINZAS[i % 6]} stroke={TRACO} strokeWidth="2" />
        ) : (
          <path
            key={i}
            d={`M${cx} ${cy + 8} L${cx + r * Math.cos(a0)} ${cy + 8 + r * Math.sin(a0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${cx + r * Math.cos(a1)} ${cy + 8 + r * Math.sin(a1)}Z`}
            fill={CINZAS[i % 6]}
            stroke={TRACO}
            strokeWidth="2"
          />
        )
      )}
      {fatias.map(({ i, meio, it, pct }) => {
        const x = cx + (r + 14) * Math.cos(meio);
        const y = cy + 8 + (r + 14) * Math.sin(meio);
        const esq = Math.cos(meio) < -0.1;
        return (
          <text key={`t${i}`} x={x} y={y + 4} textAnchor={esq ? "end" : Math.cos(meio) > 0.1 ? "start" : "middle"} fontSize="11" fontWeight="700" fill={TRACO}>
            {it.rotulo}: {fmtN(Math.round(pct * 10) / 10)}%
          </text>
        );
      })}
    </svg>
  );
}

function Relogio({ f }) {
  const c = 85;
  const h12 = f.hora % 12;
  const angM = (f.minuto / 60) * 2 * Math.PI;
  const angH = ((h12 + f.minuto / 60) / 12) * 2 * Math.PI;
  const ponta = (ang, len) => [c + len * Math.sin(ang), c - len * Math.cos(ang)];
  const [mx, my] = ponta(angM, 64);
  const [hx, hy] = ponta(angH, 42);
  return (
    <svg width={170} height={170} viewBox="0 0 170 170" role="img" aria-label={f.legenda || "Relógio de ponteiros"}>
      <circle cx={c} cy={c} r={80} fill="#fff" stroke={TRACO} strokeWidth="3" />
      {Array.from({ length: 60 }, (_, k) => {
        const [x1, y1] = ponta((k / 60) * 2 * Math.PI, k % 5 ? 74 : 69);
        const [x2, y2] = ponta((k / 60) * 2 * Math.PI, 78);
        return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={TRACO} strokeWidth={k % 5 ? 0.8 : 2} />;
      })}
      {Array.from({ length: 12 }, (_, k) => {
        const [x, y] = ponta(((k + 1) / 12) * 2 * Math.PI, 57);
        return <text key={k} x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill={TRACO}>{k + 1}</text>;
      })}
      <line x1={c} y1={c} x2={hx} y2={hy} stroke={TRACO} strokeWidth="5" strokeLinecap="round" />
      <line x1={c} y1={c} x2={mx} y2={my} stroke={TRACO} strokeWidth="3" strokeLinecap="round" />
      <circle cx={c} cy={c} r="4" fill={TRACO} />
    </svg>
  );
}

const reais = (v) => `R$ ${v.toFixed(2).replace(".", ",")}`;
function Dinheiro({ f }) {
  const pecas = f.itens.flatMap((it) => Array.from({ length: it.quantidade }, () => it.valor));
  return (
    <div className="flex max-w-[560px] flex-wrap items-center justify-center gap-2" role="img" aria-label={f.legenda || `Dinheiro: ${f.itens.map((i) => `${i.quantidade} de ${reais(i.valor)}`).join(", ")}`}>
      {pecas.map((v, k) =>
        v >= 2 ? (
          <svg key={k} width={96} height={48} viewBox="0 0 96 48" aria-hidden="true">
            <rect x={1.5} y={1.5} width={93} height={45} rx={5} fill="#f8fafc" stroke={TRACO} strokeWidth="2" />
            <rect x={6} y={6} width={84} height={36} rx={3} fill="none" stroke="#94a3b8" strokeWidth="1" />
            <text x={48} y={30} textAnchor="middle" fontSize="15" fontWeight="800" fill={TRACO}>{reais(v)}</text>
          </svg>
        ) : (
          <svg key={k} width={52} height={52} viewBox="0 0 52 52" aria-hidden="true">
            <circle cx={26} cy={26} r={24} fill="#e5e7eb" stroke={TRACO} strokeWidth="2" />
            <circle cx={26} cy={26} r={19} fill="none" stroke="#94a3b8" strokeWidth="1" />
            <text x={26} y={27} textAnchor="middle" fontSize="15" fontWeight="800" fill={TRACO}>{v < 1 ? Math.round(v * 100) : 1}</text>
            <text x={26} y={38} textAnchor="middle" fontSize="7.5" fontWeight="700" fill={TRACO}>{v < 1 ? "centavos" : "real"}</text>
          </svg>
        )
      )}
    </div>
  );
}

export default function FiguraDidatica({ figura, className = "", semLegenda = false }) {
  if (!figura) return null;
  const Comp = { reta: Reta, fracao: Fracao, grade: Grade, tabela: Tabela, barras: Barras, linha_do_tempo: LinhaDoTempo, fluxo: Fluxo, mapa: Mapa, bloco: Bloco, poligono: Poligono, angulo: Angulo, linhas: Linhas, setores: Setores, relogio: Relogio, dinheiro: Dinheiro }[figura.tipo];
  if (!Comp) return null;
  return (
    <figure className={`figura-didatica flex flex-col items-center ${className}`}>
      <Comp f={figura} />
      {figura.legenda && !semLegenda && <figcaption className="mt-1 text-[10.5px] italic text-slate-500">{figura.legenda}</figcaption>}
    </figure>
  );
}
