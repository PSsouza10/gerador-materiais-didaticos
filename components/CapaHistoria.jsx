"use client";
import "@fontsource/figtree/latin-400.css";
import "@fontsource/figtree/latin-600.css";
import "@fontsource/figtree/latin-700.css";
import "@fontsource/figtree/latin-800.css";
import React, { forwardRef, useLayoutEffect, useEffect, useRef, useState } from "react";
import { useAjusteAoCaber } from "@/lib/ajuste";
import { bnccDoMaterial, rodapeBncc } from "@/lib/material";
import { elencoDaCena } from "@/lib/cena";
import { Rosto } from "@/components/CenaCotidiano";
import {
  temaDaDisciplina,
  linhaDisciplina,
  partesTitulo,
  tamanhoInicialTitulo,
  TITULO_MIN,
  linhasIdentificacao,
  seloBncc,
  descricaoDaCapa,
  chamadaDaCena,
} from "@/lib/capaHistoria";

// Capa "História que Ensina" (Premium): capa editorial de coleção didática.
// Coluna única em fluxo (nada posicionado por cima de texto): marca → disciplina/ano →
// título → descrição → ilustração (ocupa o que sobra) → identificação → rodapé.
// Margem de segurança de 15 mm. Só recursos que o html2canvas desenha igual no PDF
// (sem blur, máscara ou texto recortado).

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const AZUL = "#161a4f";
const MARGEM = 57; // 15 mm
const ALTURA_TITULO = 300; // no máximo ~4 linhas do título

// Título: começa no tamanho pela quantidade de letras e diminui até caber (sem cortar)
function useTamanhoQueCabe(ref, chave, inicial) {
  const [px, setPx] = useState(inicial);
  useIso(() => setPx(inicial), [chave, inicial]);
  useIso(() => {
    const el = ref.current;
    if (!el || px <= TITULO_MIN) return;
    // passou da altura máxima da caixa (ou da largura): diminui. Folga de 4 px para a
    // fonte (acentos e descendentes passam um pouco da linha sem que falte espaço).
    if (el.scrollHeight > el.clientHeight + 4 || el.scrollWidth > el.clientWidth + 1) setPx((v) => Math.max(TITULO_MIN, Math.round(v * 0.93)));
  });
  return px;
}

function Logo({ cor = AZUL }) {
  return (
    <span className="inline-flex items-center gap-2.5" data-capa="logo">
      <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
        <path d="M24 13c-4.5-3.6-10.6-5-17-4.4v27.2c6.4-.6 12.5.8 17 4.4z" fill="#5b45d6" />
        <path d="M24 13c4.5-3.6 10.6-5 17-4.4v27.2c-6.4-.6-12.5.8-17 4.4z" fill="#ee6a43" />
        <path d="M24 13v27.2" stroke="#fffaf2" strokeWidth="1.6" />
        <path d="M25.5 11.2c.4-4.6 3.6-7.8 8.6-8.2-.3 4.9-3.5 8.1-8.6 8.2z" fill="#3c9a62" />
        <path d="M22.6 11.4c-.8-3.4-3.3-5.6-6.9-5.8.4 3.6 2.8 5.7 6.9 5.8z" fill="#7cc495" />
      </svg>
      <span style={{ fontFamily: "Fredoka, system-ui, sans-serif", fontWeight: 600, fontSize: 31, color: cor, letterSpacing: "-0.01em", lineHeight: 1 }}>EduGera</span>
    </span>
  );
}

// Selo recortado (12 ondas), só com habilidade conferida
function Selo({ codigo }) {
  const pontos = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    const r = 52 + (i % 4 < 2 ? 3.2 : -1.2);
    return `${(60 + r * Math.cos(a)).toFixed(1)},${(60 + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  return (
    <div className="relative" style={{ width: 120, height: 120 }} data-capa="selo">
      <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true" className="absolute inset-0">
        <polygon points={pontos} fill="#2f7d50" />
        <circle cx="60" cy="60" r="44" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="3 4" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 6c-2-1.3-5-1.8-8-1.5v13c3-.3 6 .2 8 1.5 2-1.3 5-1.8 8-1.5v-13c-3-.3-6 .2-8 1.5z M12 6v13" strokeLinejoin="round" />
        </svg>
        <span style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.05, letterSpacing: "0.02em" }}>BNCC</span>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em" }}>ALINHADA</span>
        <span style={{ fontSize: 9.5, fontWeight: 600, opacity: 0.9, marginTop: 1 }}>{codigo}</span>
      </div>
    </div>
  );
}

function Nuvem({ escala = 1, ...pos }) {
  const e = (v) => Math.round(v * escala);
  return (
    <div aria-hidden="true" className="absolute" style={{ ...pos, width: e(130), height: e(56) }}>
      <div className="absolute rounded-full bg-white" style={{ left: 0, bottom: 0, width: e(130), height: e(30) }} />
      <div className="absolute rounded-full bg-white" style={{ left: e(22), bottom: e(10), width: e(46), height: e(40) }} />
      <div className="absolute rounded-full bg-white" style={{ left: e(56), bottom: e(8), width: e(56), height: e(48) }} />
    </div>
  );
}

// ---------- ilustração do sistema (sem imagem da IA): desenho do tema por disciplina ----------
function Desenho({ tipo, cor, claro }) {
  const T = "#1f2347";
  const comum = { fill: "none", stroke: T, strokeWidth: 3, strokeLinejoin: "round", strokeLinecap: "round" };
  switch (tipo) {
    case "matematica":
      return (
        <g>
          {/* blocos (volume) */}
          {[
            [150, 150],
            [210, 150],
            [180, 100],
          ].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <path d="M0 20 L30 5 L60 20 L30 35 Z" {...comum} fill="#fff" />
              <path d="M0 20 L0 62 L30 77 L30 35 Z" {...comum} fill={claro} />
              <path d="M60 20 L60 62 L30 77 L30 35 Z" {...comum} fill={cor} fillOpacity="0.55" />
            </g>
          ))}
          {/* régua */}
          <g transform="translate(300 190) rotate(-12)">
            <rect width="150" height="26" rx="5" {...comum} fill="#ffd57a" />
            {Array.from({ length: 14 }, (_, i) => (
              <path key={i} d={`M${10 + i * 10} 0 v${i % 5 === 0 ? 12 : 7}`} stroke={T} strokeWidth="2" />
            ))}
          </g>
          {/* formas */}
          <circle cx="470" cy="110" r="34" {...comum} fill={claro} />
          <path d="M520 190 L560 120 L600 190 Z" {...comum} fill="#fff" />
          <rect x="70" y="190" width="56" height="56" rx="6" {...comum} fill="#fff" transform="rotate(-8 98 218)" />
          <path d="M440 60 h26 M453 47 v26" stroke={cor} strokeWidth="6" strokeLinecap="round" />
          <path d="M100 80 h26 M100 92 h26" stroke={cor} strokeWidth="6" strokeLinecap="round" />
        </g>
      );
    case "portugues":
      return (
        <g>
          <path d="M340 90 C 290 60, 210 58, 160 76 L 160 238 C 210 220, 290 222, 340 250 Z" {...comum} fill="#fff" />
          <path d="M340 90 C 390 60, 470 58, 520 76 L 520 238 C 470 220, 390 222, 340 250 Z" {...comum} fill={claro} />
          <path d="M340 90 V 250" {...comum} />
          {[110, 136, 162, 188].map((y) => (
            <g key={y}>
              <path d={`M190 ${y} H310`} stroke={T} strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" />
              <path d={`M370 ${y} H490`} stroke={cor} strokeOpacity="0.45" strokeWidth="4" strokeLinecap="round" />
            </g>
          ))}
          {[
            ["A", 110, 120, -10],
            ["b", 575, 110, 8],
            ["ç", 600, 210, -6],
            ["é", 90, 220, 6],
          ].map(([l, x, y, r]) => (
            <g key={l} transform={`rotate(${r} ${x} ${y})`}>
              <circle cx={x} cy={y - 14} r="30" {...comum} fill="#fff" />
              <text x={x} y={y} textAnchor="middle" fontFamily="Fredoka, system-ui, sans-serif" fontWeight="700" fontSize="38" fill={cor}>
                {l}
              </text>
            </g>
          ))}
          <g transform="translate(400 30) rotate(25)">
            <rect width="120" height="20" rx="4" {...comum} fill="#ffd57a" />
            <path d="M120 0 L145 10 L120 20 Z" {...comum} fill="#fde7c0" />
            <rect x="-14" width="16" height="20" rx="3" {...comum} fill="#f49ac1" />
          </g>
        </g>
      );
    case "ciencias":
      return (
        <g>
          <circle cx="560" cy="92" r="40" fill="#ffd36b" stroke={T} strokeWidth="3" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <path key={i} d={`M${560 + 50 * Math.cos(a)} ${92 + 50 * Math.sin(a)} L${560 + 62 * Math.cos(a)} ${92 + 62 * Math.sin(a)}`} stroke="#f2a33a" strokeWidth="5" strokeLinecap="round" />;
          })}
          <path d="M230 250 C 260 205, 420 205, 450 250 Z" {...comum} fill="#9b6b43" />
          <path d="M340 220 C 338 180, 342 140, 340 100" {...comum} strokeWidth="5" stroke="#2f7d50" />
          <path d="M340 160 C 300 150, 280 120, 290 95 C 320 100, 338 125, 340 160 Z" {...comum} fill="#7cc495" />
          <path d="M340 130 C 380 120, 400 90, 392 62 C 362 68, 342 95, 340 130 Z" {...comum} fill={cor} fillOpacity="0.8" />
          <g transform="translate(110 120)">
            <circle cx="40" cy="40" r="36" {...comum} fill="#ffffff" fillOpacity="0.85" strokeWidth="5" />
            <path d="M66 66 L104 104" stroke={T} strokeWidth="12" strokeLinecap="round" />
            <path d="M24 34 q8 -14 22 -12" stroke="#bcd9f5" strokeWidth="5" fill="none" strokeLinecap="round" />
          </g>
          <path d="M520 200 c10 -24 34 -26 44 -10 c-8 18 -28 22 -44 10 z" {...comum} fill="#7cc495" />
          <path d="M470 150 c4 -18 24 -22 32 -10 c-6 14 -20 18 -32 10 z" {...comum} fill={claro} />
        </g>
      );
    case "historia":
      return (
        <g>
          <g transform="translate(150 70)">
            <path d="M0 0 h70 M0 160 h70 M8 0 c0 60 54 60 54 80 c0 20 -54 20 -54 80 M62 0 c0 60 -54 60 -54 80 c0 20 54 20 54 80" {...comum} fill="#fff" />
            <path d="M18 150 c10 -20 24 -20 34 0 z" fill="#ffd57a" stroke={T} strokeWidth="2" />
          </g>
          <g transform="translate(270 90)">
            <rect x="0" y="0" width="190" height="150" rx="10" {...comum} fill="#fff6e3" />
            <rect x="-14" y="-10" width="24" height="170" rx="12" {...comum} fill={claro} />
            <rect x="180" y="-10" width="24" height="170" rx="12" {...comum} fill={claro} />
            {[30, 56, 82, 108].map((y) => (
              <path key={y} d={`M30 ${y} H160`} stroke={cor} strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />
            ))}
          </g>
          <g transform="translate(510 80)">
            <path d="M0 0 h80 l-8 16 h-64 z" {...comum} fill="#fff" />
            {[12, 30, 48].map((x) => (
              <rect key={x} x={x} y="16" width="14" height="130" {...comum} fill={claro} />
            ))}
            <rect x="-6" y="146" width="92" height="16" {...comum} fill="#fff" />
          </g>
        </g>
      );
    case "geografia":
      return (
        <g>
          <circle cx="340" cy="150" r="100" {...comum} fill="#bfe2f0" />
          <path d="M280 90 c30 -10 50 10 40 30 c-10 20 20 30 10 50 c-14 20 -46 10 -56 -10 c-8 -20 -20 -60 6 -70 z" fill="#7cc495" stroke={T} strokeWidth="2.5" />
          <path d="M370 170 c20 -20 50 -10 50 14 c0 20 -30 36 -50 26 c-10 -6 -12 -28 0 -40 z" fill="#7cc495" stroke={T} strokeWidth="2.5" />
          <ellipse cx="340" cy="150" rx="40" ry="100" {...comum} strokeOpacity="0.35" />
          <path d="M240 150 h200" {...comum} strokeOpacity="0.35" />
          <path d="M340 260 v-10" {...comum} />
          <path d="M290 262 h100" {...comum} strokeWidth="6" />
          <g transform="translate(470 40)">
            <path d="M30 0 C 10 0, 0 16, 0 30 C 0 54, 30 80, 30 80 C 30 80, 60 54, 60 30 C 60 16, 50 0, 30 0 Z" {...comum} fill={cor} />
            <circle cx="30" cy="30" r="10" fill="#fff" />
          </g>
          <path d="M80 250 L150 150 L190 200 L230 140 L300 250 Z" {...comum} fill={claro} />
          <path d="M150 150 l-14 20 h28 z M230 140 l-12 18 h24 z" fill="#fff" stroke="none" />
        </g>
      );
    case "arte":
      return (
        <g>
          <path d="M340 60 C 460 60, 520 140, 480 200 C 456 236, 410 214, 390 236 C 370 258, 330 266, 290 250 C 200 214, 210 60, 340 60 Z" {...comum} fill="#fff6e3" />
          <circle cx="420" cy="214" r="18" {...comum} fill="#fffaf2" />
          {[
            [290, 110, "#ee6a43"],
            [350, 92, "#ffd36b"],
            [410, 112, cor],
            [270, 170, "#5b45d6"],
            [440, 160, "#2f8a57"],
          ].map(([x, y, c]) => (
            <circle key={x} cx={x} cy={y} r="20" fill={c} stroke={T} strokeWidth="2.5" />
          ))}
          <g transform="translate(470 40) rotate(35)">
            <rect width="16" height="150" rx="6" {...comum} fill="#c08a5b" />
            <path d="M-2 150 h20 l-4 28 c-2 8 -10 8 -12 0 z" {...comum} fill={cor} />
          </g>
          <path d="M110 220 c40 -60 90 -60 120 -20" stroke={cor} strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M560 230 c20 -30 50 -30 70 -10" stroke="#5b45d6" strokeWidth="10" fill="none" strokeLinecap="round" />
        </g>
      );
    case "edfisica":
      return (
        <g>
          <circle cx="330" cy="160" r="80" {...comum} fill="#fff" />
          <path d="M330 80 l26 34 -16 40 h-20 l-16 -40 z" fill={cor} stroke={T} strokeWidth="2.5" />
          <path d="M356 114 l42 6 M304 114 l-42 6 M340 154 l26 44 M320 154 l-26 44" {...comum} />
          {[120, 520].map((x) => (
            <g key={x} transform={`translate(${x} 150)`}>
              <path d="M30 0 L60 100 H0 Z" {...comum} fill="#ffb15c" />
              <path d="M12 60 H48 M20 30 H40" stroke="#fff" strokeWidth="8" />
              <rect x="-10" y="100" width="80" height="12" rx="4" {...comum} fill="#ffb15c" />
            </g>
          ))}
          <path d="M440 70 c20 0 30 14 30 24 h-30 z" {...comum} fill={claro} />
        </g>
      );
    case "ingles":
      return (
        <g>
          <g transform="translate(130 60)">
            <rect width="190" height="100" rx="26" {...comum} fill="#fff" />
            <path d="M40 98 L30 132 L74 100" {...comum} fill="#fff" />
            <text x="95" y="64" textAnchor="middle" fontFamily="Fredoka, system-ui, sans-serif" fontWeight="700" fontSize="40" fill={cor}>
              Hello!
            </text>
          </g>
          <g transform="translate(360 110)">
            <rect width="170" height="96" rx="26" {...comum} fill={claro} />
            <path d="M130 94 L140 128 L100 96" {...comum} fill={claro} />
            <text x="85" y="62" textAnchor="middle" fontFamily="Fredoka, system-ui, sans-serif" fontWeight="700" fontSize="38" fill={T}>
              Hi!
            </text>
          </g>
          <path d="M560 70 l8 16 18 2 -13 12 4 18 -17 -9 -16 9 3 -18 -13 -12 18 -2 z" fill="#ffd36b" stroke={T} strokeWidth="2.5" />
        </g>
      );
    case "informatica":
      return (
        <g>
          <rect x="200" y="60" width="280" height="170" rx="14" fill="#1f2347" stroke={T} strokeWidth="3" />
          <rect x="218" y="78" width="244" height="134" rx="6" fill={claro} />
          <text x="340" y="160" textAnchor="middle" fontFamily="DejaVu Sans Mono, monospace" fontWeight="700" fontSize="54" fill={cor}>
            {"</>"}
          </text>
          <path d="M160 240 h360 l-26 22 h-308 z" {...comum} fill="#c7cbe6" />
          <rect x="540" y="200" width="44" height="64" rx="22" {...comum} fill="#fff" />
          <path d="M562 200 v22" {...comum} />
          <circle cx="120" cy="110" r="10" fill={cor} />
          <circle cx="150" cy="80" r="7" fill="#ee6a43" />
          <path d="M100 150 h40 M120 130 v40" stroke={cor} strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case "religioso":
      return (
        <g>
          <path d="M340 230 C 240 170, 230 90, 290 80 C 320 76, 336 96, 340 112 C 344 96, 360 76, 390 80 C 450 90, 440 170, 340 230 Z" {...comum} fill={cor} fillOpacity="0.75" />
          {[
            [170, 90, 14],
            [520, 70, 18],
            [560, 190, 12],
            [130, 200, 16],
          ].map(([x, y, r]) => (
            <path key={x} d={`M${x} ${y - r} l${r * 0.3} ${r * 0.7} ${r * 0.7} ${r * 0.3} -${r * 0.7} ${r * 0.3} -${r * 0.3} ${r * 0.7} -${r * 0.3} -${r * 0.7} -${r * 0.7} -${r * 0.3} ${r * 0.7} -${r * 0.3} z`} fill="#ffd36b" stroke={T} strokeWidth="2" />
          ))}
        </g>
      );
    default:
      return (
        <g>
          <path d="M340 90 C 300 66, 230 64, 190 80 L 190 230 C 230 216, 300 218, 340 240 Z" {...comum} fill="#fff" />
          <path d="M340 90 C 380 66, 450 64, 490 80 L 490 230 C 450 216, 380 218, 340 240 Z" {...comum} fill={claro} />
          <path d="M340 90 V 240" {...comum} />
          <g transform="translate(530 60)">
            <circle cx="30" cy="30" r="28" {...comum} fill="#ffd36b" />
            <rect x="18" y="58" width="24" height="18" rx="4" {...comum} fill="#fff" />
          </g>
        </g>
      );
  }
}

function CenaDoTema({ tema }) {
  return (
    <svg viewBox="40 18 600 262" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true" data-capa="desenho">
      <Desenho tipo={tema.desenho} cor={tema.cor} claro={tema.claro} />
    </svg>
  );
}

const CapaHistoria = forwardRef(function CapaHistoria({ form, material, urlImagem, exemplo = false }, ref) {
  const m = material || {};
  const tema = temaDaDisciplina(form.disciplina);
  const titulo = form.tema ? m.tituloDidatico || form.tema : "Tema Principal";
  const { destaque, resto } = partesTitulo(titulo);
  const etiquetas = linhaDisciplina(form);
  const bncc = bnccDoMaterial(form, m);
  const selo = seloBncc(bncc);
  const descricao = descricaoDaCapa(m);
  const chamada = chamadaDaCena(m);
  const elenco = (elencoDaCena(m.cena) || []).slice(0, 2);
  const turma = elenco.length ? elenco : ["lia", "theo"];
  const ident = linhasIdentificacao(form);

  const caixaTitulo = useRef(null);
  const coluna = useRef(null);
  const px = useTamanhoQueCabe(caixaTitulo, titulo, tamanhoInicialTitulo(titulo));
  // se faltar espaço para a ilustração: 1 = descrição menor, 2 = sem descrição, 3 = sem fala
  const ajuste = useAjusteAoCaber(coluna, `${titulo}|${descricao}|${chamada}|${ident.length}|${px}`);

  return (
    <section
      ref={ref}
      className="capa-a4 capa-historia relative overflow-hidden"
      data-capa="historia"
      style={{ width: "210mm", height: "297mm", background: "#fffaf2", color: AZUL, fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* formas discretas nos cantos (decoração, longe do texto). CSS puro: sai igual no PDF */}
      <div aria-hidden="true" className="absolute rounded-full" style={{ left: -150, top: -170, width: 300, height: 260, background: tema.claro }} />
      <div aria-hidden="true" className="absolute rounded-full" style={{ left: -70, top: -80, width: 140, height: 120, background: tema.cor, opacity: 0.16 }} />
      <div aria-hidden="true" className="absolute rounded-full" style={{ left: 794 - 105, top: 1123 - 85, width: 300, height: 260, background: tema.claro }} />

      <div
        ref={coluna}
        className="absolute flex flex-col"
        style={{ left: MARGEM, right: MARGEM, top: 46, bottom: 40 }}
        data-capa="coluna"
      >
        {/* marca + selo (grade de 3 colunas: o logo fica no centro óptico da página) */}
        <div className="grid flex-none items-center" style={{ gridTemplateColumns: "120px 1fr 120px", minHeight: 120 }}>
          <div className="flex items-start" style={{ alignSelf: "start", paddingTop: 10 }}>
            {exemplo && (
              <span className="rounded-md px-2 py-1 text-[11px] font-black tracking-[0.12em] text-amber-950" style={{ background: "#fbbf24" }} data-capa="exemplo">
                EXEMPLO
              </span>
            )}
          </div>
          <div className="flex justify-center">
            <Logo />
          </div>
          <div className="flex justify-end">{selo && <Selo codigo={selo.codigo} />}</div>
        </div>

        {/* disciplina | ano */}
        {etiquetas.length > 0 && (
          <div className="mt-1 flex flex-none items-center justify-center gap-4" data-capa="disciplina">
            <span className="h-[2px] w-12 flex-none rounded" style={{ background: AZUL, opacity: 0.55 }} />
            <span className="text-center font-extrabold uppercase" style={{ fontSize: 19, letterSpacing: "0.16em", color: AZUL }}>
              {etiquetas.map((e, i) => (
                <React.Fragment key={e}>
                  {i > 0 && <span style={{ color: tema.cor, margin: "0 0.55em" }}>|</span>}
                  {e}
                </React.Fragment>
              ))}
            </span>
            <span className="h-[2px] w-12 flex-none rounded" style={{ background: AZUL, opacity: 0.55 }} />
          </div>
        )}

        {/* título: quebra linha sozinho e diminui até caber, sem cortar */}
        <div ref={caixaTitulo} className="mt-5 flex-none" style={{ maxHeight: ALTURA_TITULO + 4 + Math.round(px * 0.22), paddingBottom: Math.round(px * 0.22) }} data-capa="caixa-titulo">
          <h2
            className="text-center"
            data-capa="titulo"
            style={{ fontFamily: "Fredoka, system-ui, sans-serif", fontWeight: 700, fontSize: px, lineHeight: 1.06, letterSpacing: "-0.01em", color: AZUL, overflowWrap: px <= TITULO_MIN ? "anywhere" : "normal" }}
          >
            <span style={{ color: tema.cor }}>{destaque}</span>
            {resto ? ` ${resto}` : ""}
          </h2>
        </div>

        {/* descrição curta (o resumo do material), inteira — ou nenhuma, se não couber */}
        {descricao && ajuste < 2 && (
          <p
            className="mx-auto mt-4 flex-none rounded-2xl px-6 py-3 text-center"
            data-capa="descricao"
            style={{ background: tema.claro, color: "#2a2f5c", fontSize: ajuste >= 1 ? 13 : 15, lineHeight: 1.5, maxWidth: 600 }}
          >
            <span className="texto-pdf">{descricao}</span>
          </p>
        )}

        {/* ilustração: ocupa todo o espaço que sobra; nunca fica por cima de texto */}
        <div className="relative mt-6 min-h-[300px] flex-1 overflow-hidden" style={{ borderRadius: 34, background: `linear-gradient(180deg, ${tema.ceu} 0%, #ffffff 100%)`, border: `2px solid ${tema.claro}` }} data-capa="ilustracao">
          {urlImagem ? (
            <div className="absolute inset-0" data-capa="imagem" style={{ backgroundImage: `url(${urlImagem})`, backgroundSize: "cover", backgroundPosition: "center 42%" }} />
          ) : (
            <>
              <div aria-hidden="true" className="absolute rounded-[50%]" style={{ left: -120, right: -60, bottom: -150, height: 250, background: tema.chao }} />
              <div aria-hidden="true" className="absolute rounded-[50%]" style={{ left: -60, right: -160, bottom: -190, height: 250, background: tema.claro }} />
              <Nuvem left={26} top={22} escala={1} />
              <Nuvem right={34} top={44} escala={0.72} />
              <div className="absolute inset-x-4" style={{ top: 30, bottom: chamada && ajuste < 3 ? 112 : 96 }}>
                <CenaDoTema tema={tema} />
              </div>
            </>
          )}
          {/* personagens do EduGera chamando para o tema */}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-3 px-6 pb-4" data-capa="personagens" style={urlImagem ? { background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.92) 55%)", paddingTop: 30 } : undefined}>
            <div className="flex flex-none -space-x-3">
              {turma.map((q) => (
                <div key={q} className="rounded-full bg-white p-[3px]" style={{ boxShadow: "0 6px 14px -6px rgba(22,26,79,.45)" }}>
                  <Rosto quem={q} tamanho={78} />
                </div>
              ))}
            </div>
            {chamada && ajuste < 3 && (
              <div className="relative mb-3 rounded-2xl bg-white px-4 py-2.5 text-[14px] font-semibold leading-snug" data-capa="fala" style={{ border: `2px solid ${AZUL}`, maxWidth: 420, color: AZUL }}>
                <span className="texto-pdf">{chamada}</span>
                <span aria-hidden="true" className="absolute" style={{ left: -8, bottom: 12, width: 14, height: 14, background: "#fff", borderLeft: `2px solid ${AZUL}`, borderBottom: `2px solid ${AZUL}`, transform: "rotate(45deg)" }} />
              </div>
            )}
          </div>
        </div>

        {/* escola, professor(a), turma — só o que foi informado */}
        {ident.length > 0 && (
          <div className="mx-auto mt-5 w-full flex-none rounded-2xl bg-white px-6 py-3.5" style={{ border: `2px solid ${tema.claro}`, maxWidth: 600 }} data-capa="identificacao">
            {ident.map(([rotulo, valor]) => (
              <p key={rotulo} className="flex gap-2 py-[3px] text-[14.5px] leading-snug">
                <span className="flex-none font-bold" style={{ color: tema.cor }}>
                  {rotulo}:
                </span>
                <span className="min-w-0 break-words">{valor}</span>
              </p>
            ))}
          </div>
        )}

        {/* rodapé discreto */}
        <div className="mt-4 flex flex-none items-center justify-between gap-4 border-t pt-2.5 text-[10.5px]" style={{ borderColor: "#e8e1d3", color: "#5a5f86" }} data-capa="rodape">
          <span className="flex-none font-bold" style={{ color: AZUL }}>
            EduGera
          </span>
          <span className="text-right">{rodapeBncc(bncc, exemplo)}</span>
        </div>
      </div>
    </section>
  );
});

export default CapaHistoria;
