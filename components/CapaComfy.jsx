"use client";
import TurmaEduGera from "@/components/TurmaEduGera";
import React, { forwardRef, useRef } from "react";
import { useAjusteAoCaber, tamanhoTitulo } from "@/lib/ajuste";
import Chip from "@/components/Chip";
import { BadgeCheck, Target, Gauge, User, Sparkles, Play, GraduationCap } from "lucide-react";
import { obterNivel } from "@/lib/niveis";
import { slugify, rodapeBncc, bnccDoMaterial, linhaEtapa } from "@/lib/material";

// Capa A4 (página inteira, sem margem) no visual do ComfyUI: canvas escuro
// quadriculado, "nós" de entrada (BNCC, Tema, Nível, Professor) ligados por
// fios coloridos ao nó de saída "Material Didático", com a ilustração
// pedagógica da IA transparente ao fundo.
//
// Coordenadas em px no tamanho real da folha (210 × 297 mm ≈ 794 × 1123 px).
// Só usa recursos que o html2canvas desenha bem (sem blur/backdrop-filter),
// para o PDF sair igual à tela.

const W = 794;
const H = 1123;

// Cores dos fios, na paleta de tipos do ComfyUI
const FIO = {
  bncc: "#B39DDB", // MODEL (lavanda)
  tema: "#FFD500", // CLIP (amarelo)
  nivel: "#FFA931", // CONDITIONING (laranja)
  prof: "#64B5F6", // IMAGE (azul)
};

const corta = (s = "", n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

// Geometria dos nós
const IN_X = 40;
const IN_W = 262;
const OUT_X = 392;
const OUT_Y = 104;
const OUT_W = 362;
const ENTRADAS = [
  { id: "bncc", y: 104, h: 170, titulo: "Habilidade BNCC", saida: "HABILIDADE", icone: BadgeCheck, cab: "#4a3a6b" },
  { id: "tema", y: 296, h: 96, titulo: "Tema Principal", saida: "TEMA", icone: Target, cab: "#6b5a1f" },
  { id: "nivel", y: 414, h: 96, titulo: "Nível / Adaptação", saida: "NÍVEL", icone: Gauge, cab: "#6e4a1c" },
  { id: "prof", y: 532, h: 120, titulo: "Professor", saida: "AUTORIA", icone: User, cab: "#264a6e" },
];
const TOPO_SOCKET = 17; // centro vertical do socket, a partir do topo do nó
const SLOT_Y = (i) => OUT_Y + 48 + i * 22; // sockets de entrada do nó de saída

function Widget({ rotulo, valor, mono = false }) {
  return (
    <div className="mt-1.5 flex h-[22px] items-center justify-between gap-2 rounded-full bg-[#1b1b1e] px-3 text-[10.5px] leading-[22px] ring-1 ring-white/5">
      <span className="flex-none text-[#8b8b93]">{rotulo}</span>
      <span className={`whitespace-nowrap text-right text-[#e6e6ea] ${mono ? "font-mono" : ""}`}>{valor}</span>
    </div>
  );
}

function No({ x, y, w, h, titulo, icone: Icone, cab, children, socketSaida, rotuloSaida }) {
  return (
    <div
      className="absolute overflow-visible rounded-[10px] bg-[#2a2a2e]/95 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-black/60"
      style={{ left: x, top: y, width: w, height: h }}
    >
      <div
        className="flex h-[34px] items-center gap-2 rounded-t-[10px] px-3 text-[12px] font-semibold leading-[34px] text-[#e8e8ec]"
        style={{ background: cab }}
      >
        <span className="h-2.5 w-2.5 flex-none rounded-full bg-white/25" />
        <Icone className="h-3.5 w-3.5 opacity-80" />
        <span className="whitespace-nowrap">{titulo}</span>
        {rotuloSaida && (
          <span className="ml-auto text-[9.5px] font-bold tracking-wider" style={{ color: socketSaida }}>
            {rotuloSaida}
          </span>
        )}
      </div>
      <div className="px-2.5 pb-2.5 pt-0.5">{children}</div>
    </div>
  );
}

const CapaComfy = forwardRef(function CapaComfy({ form, material, urlImagem, exemplo = false }, ref) {
  const m = material || {};
  const nivel = obterNivel(form.dificuldade);
  const bncc = bnccDoMaterial(form, m);
  const titulo = form.tema ? m.tituloDidatico || form.tema : "Tema Principal";
  const caixa = useRef(null);
  const ajuste = useAjusteAoCaber(caixa, `${titulo}|${m.resumoPedagogico || ""}`);
  const nEx = m.exercicios?.length || 0;
  const arquivo = `apostila_${slugify(form.tema || "material").replace(/-/g, "_") || "material"}.json`;

  // Fios (curvas de Bézier) das entradas até o nó de saída
  const fios = ENTRADAS.map((n, i) => {
    const x1 = IN_X + IN_W;
    const y1 = n.y + TOPO_SOCKET;
    const x2 = OUT_X;
    const y2 = SLOT_Y(i);
    const d = `M ${x1} ${y1} C ${x1 + 70} ${y1}, ${x2 - 70} ${y2}, ${x2} ${y2}`;
    return { id: n.id, d, x1, y1, x2, y2 };
  });

  return (
    <section
      ref={ref}
      className="capa-a4 relative overflow-hidden bg-[#161618] font-sans text-white"
      style={{ width: "210mm", height: "297mm" }}
    >
      {/* 1) Ilustração pedagógica transparente ao fundo */}
      {urlImagem && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${urlImagem})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.32,
          }}
        />
      )}

      {/* 2) Canvas do ComfyUI: grade + símbolos pedagógicos + fios */}
      <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <pattern id="grade-p" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ffffff" strokeOpacity="0.035" strokeWidth="1" />
          </pattern>
          <pattern id="grade-g" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#grade-p)" />
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1" />
          </pattern>
          <pattern id="simbolos" width="190" height="170" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
            <g fill="#ffffff" fillOpacity={urlImagem ? 0.035 : 0.07} fontFamily="Georgia, serif" fontWeight="700">
              <text x="10" y="40" fontSize="34">π</text>
              <text x="70" y="30" fontSize="22">√x</text>
              <text x="130" y="55" fontSize="30">Σ</text>
              <text x="25" y="105" fontSize="24">a²+b²</text>
              <text x="120" y="120" fontSize="28">÷</text>
              <text x="60" y="160" fontSize="22">½</text>
              <text x="150" y="160" fontSize="26">△</text>
            </g>
          </pattern>
          <linearGradient id="veu" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#111113" stopOpacity="0.55" />
            <stop offset="0.55" stopColor="#111113" stopOpacity="0.62" />
            <stop offset="1" stopColor="#0d0d0f" stopOpacity="0.94" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#veu)" />
        <rect width={W} height={H} fill="url(#simbolos)" />
        <rect width={W} height={H} fill="url(#grade-g)" />

        {fios.map((f) => (
          <g key={f.id}>
            <path d={f.d} fill="none" stroke="#000" strokeOpacity="0.5" strokeWidth="6" />
            <path d={f.d} fill="none" stroke={FIO[f.id]} strokeWidth="3" />
            <circle cx={f.x1} cy={f.y1} r="6" fill={FIO[f.id]} stroke="#111" strokeWidth="2" />
            <circle cx={f.x2} cy={f.y2} r="6" fill={FIO[f.id]} stroke="#111" strokeWidth="2" />
          </g>
        ))}
      </svg>

      {/* 3) Barra superior, como a do ComfyUI */}
      <div className="absolute inset-x-0 top-0 flex h-[52px] items-center gap-3 border-b border-white/10 bg-[#0f0f11]/85 px-10">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-indigo-500">
          <GraduationCap className="h-4 w-4 text-white" />
        </div>
        <span className="text-[13px] font-extrabold tracking-wide">EduGera</span>
        <span className="ml-2 rounded-md bg-white/10 px-2.5 py-1 font-mono text-[10.5px] text-[#c9c9d1]">{arquivo}</span>
        <span className="ml-auto flex items-center gap-1.5 rounded-md bg-[#2e7d4f] px-3 py-1 text-[11px] font-bold">
          <Play className="h-3 w-3" fill="currentColor" /> Gerado
        </span>
      </div>

      {/* 4) Nós de entrada */}
      <No {...ENTRADAS[0]} x={IN_X} w={IN_W} icone={ENTRADAS[0].icone} rotuloSaida={ENTRADAS[0].saida} socketSaida={FIO.bncc}>
        <Widget rotulo="código" valor={bncc?.codigo || "—"} mono />
        <p className="mt-2 px-1 text-[10.5px] leading-[1.45] text-[#b9b9c2]">
          {bncc?.texto
            ? bncc.texto.length <= 190
              ? bncc.texto
              : "Descrição completa da habilidade na página seguinte."
            : "Nenhuma habilidade selecionada."}
        </p>
      </No>
      <No {...ENTRADAS[1]} x={IN_X} w={IN_W} icone={ENTRADAS[1].icone} rotuloSaida={ENTRADAS[1].saida} socketSaida={FIO.tema}>
        <Widget rotulo="tema" valor={corta(form.tema || "—", 30)} />
        <Widget rotulo="disciplina" valor={form.disciplina} />
      </No>
      <No {...ENTRADAS[2]} x={IN_X} w={IN_W} icone={ENTRADAS[2].icone} rotuloSaida={ENTRADAS[2].saida} socketSaida={FIO.nivel}>
        <Widget rotulo="dificuldade" valor={nivel.curto} />
        <Widget rotulo="etapa" valor={corta(linhaEtapa({ nivel: form.nivel, ano: form.ano }), 28)} />
      </No>
      <No {...ENTRADAS[3]} x={IN_X} w={IN_W} icone={ENTRADAS[3].icone} rotuloSaida={ENTRADAS[3].saida} socketSaida={FIO.prof}>
        <Widget rotulo="docente" valor={corta(form.professor || "—", 28)} />
        <Widget rotulo="ilustração" valor={form.estilo} />
        <Widget rotulo="exercícios" valor={nEx ? `${nEx} questões` : "—"} />
      </No>

      {/* 5) Nó de saída */}
      <div
        className="absolute rounded-[10px] bg-[#2a2a2e]/95 shadow-[0_10px_30px_rgba(0,0,0,0.5)] ring-1 ring-black/60"
        style={{ left: OUT_X, top: OUT_Y, width: OUT_W }}
      >
        <div className="flex h-[34px] items-center gap-2 rounded-t-[10px] bg-[#2d5a3d] px-3 text-[12px] font-semibold leading-[34px]">
          <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
          <Sparkles className="h-3.5 w-3.5 opacity-80" />
          Material Didático · Saída
        </div>
        <div className="pb-3">
          {ENTRADAS.map((n, i) => (
            <div key={n.id} className="h-[22px] pl-5 text-[10px] font-bold leading-[22px] tracking-wider" style={{ color: FIO[n.id] }}>
              {n.saida.toLowerCase()}
            </div>
          ))}
          <div className="mx-3 mt-2 overflow-hidden rounded-lg bg-[#1b1b1e] ring-1 ring-white/10" style={{ height: 330 }}>
            {urlImagem ? (
              <div
                className="h-full w-full"
                style={{ backgroundImage: `url(${urlImagem})`, backgroundSize: "cover", backgroundPosition: "center" }}
              />
            ) : (
              <TurmaEduGera
                tema={
                  [...(m.aplicacaoPratica?.exemplos || []), ...(m.formulas || []).map((f) => f?.expressao)]
                    .map((e) => String(e || "").replace(/^\s*[→\-–•]\s*/, "").trim())
                    .find((e) => e && e.length <= 34) || form.tema || m.tituloDidatico
                }
                lado={330}
                escuro
              />
            )}
          </div>
          <div className="mx-3 mt-2 flex justify-between font-mono text-[10px] text-[#8b8b93]">
            <span>A4 · 210×297</span>
            <span>{nEx ? `${nEx} exercícios` : "ficha de estudo"}</span>
          </div>
        </div>
      </div>

      {/* 6) Título e identificação — em fluxo, ancorado embaixo; se não couber
          abaixo do grafo, simplifica em vez de cortar (1: sem resumo, 3: título menor) */}
      <div ref={caixa} className="absolute inset-x-10 top-[672px] bottom-[64px] flex flex-col overflow-hidden">
        {/* mt-auto (e não justify-end): o excesso vai para baixo, onde a medição enxerga */}
        <div className="mb-4 mt-auto h-1 w-24 flex-none rounded-full bg-gradient-to-r from-[#B39DDB] via-[#FFA931] to-[#64B5F6]" />
        <h2
          className="flex-none break-words font-black leading-[1.05] tracking-tight text-white"
          style={{ fontSize: tamanhoTitulo(titulo, 46, ajuste >= 3) }}
        >
          {titulo}
        </h2>
        <p className="mt-3 flex-none text-[14px] font-semibold text-[#d4d4dc]">
          {linhaEtapa(form)} · Nível {nivel.curto}
          {bncc?.codigo ? ` · BNCC ${bncc.codigo}` : ""}
        </p>
        {m.resumoPedagogico && ajuste < 1 && (
          <p className="mt-3 max-w-[640px] flex-none text-[12.5px] leading-[1.55] text-[#a9a9b3]">{m.resumoPedagogico}</p>
        )}
        <div className="mt-8 grid flex-none grid-cols-[1fr_130px_130px] gap-5 text-[11px] text-[#c9c9d1]">
          <span className="border-b border-white/30 pb-1">Nome:</span>
          <span className="border-b border-white/30 pb-1">Turma:</span>
          <span className="border-b border-white/30 pb-1">Data: ___/___/___</span>
        </div>
      </div>

      {exemplo && (
        <Chip forma="etiqueta" espacado altura={24} className="absolute right-10 top-[66px] bg-amber-400 text-[11px] font-black text-amber-950">
          EXEMPLO
        </Chip>
      )}

      <div className="absolute inset-x-10 bottom-6 flex justify-between text-[10px] text-[#7c7c86]">
        <span>{form.professor}</span>
        <span>{rodapeBncc(bncc, exemplo)}</span>
      </div>
    </section>
  );
});

export default CapaComfy;
