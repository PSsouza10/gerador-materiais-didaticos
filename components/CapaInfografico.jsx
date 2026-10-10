"use client";
import React, { forwardRef, useRef } from "react";
import { useAjusteAoCaber } from "@/lib/ajuste";
import Chip from "@/components/Chip";
import Tx from "@/components/Tx";
import { GraduationCap, BadgeCheck } from "lucide-react";
import { obterNivel } from "@/lib/niveis";
import { bnccDoMaterial, rodapeBncc, linhaEtapa } from "@/lib/material";
import TurmaEduGera from "@/components/TurmaEduGera";

// Capa "infográfico": pôster colorido com título em letras de bolha, mascote 3D
// da IA apontando para uma lousa e cartões "O que significa?", "Exemplos
// importantes" e "Aplicações no cotidiano".
// Todo texto e toda conta são HTML real vindos do material (já conferido):
// a IA de imagem só desenha o personagem, porque ela erra texto e matemática.
// Só usa recursos que o html2canvas desenha bem (sem blur/backdrop-filter).

const CORES = ["#f43f5e", "#f97316", "#eab308", "#22c55e", "#0ea5e9", "#6366f1", "#a855f7"];
const TILES = [
  ["#fde68a", "#f59e0b", "#92400e"],
  ["#fecaca", "#ef4444", "#991b1b"],
  ["#bae6fd", "#0ea5e9", "#075985"],
  ["#bbf7d0", "#22c55e", "#166534"],
  ["#ddd6fe", "#8b5cf6", "#5b21b6"],
];
const CONTORNO = (px, sombra) =>
  [
    `0 ${px}px 0 #fff`, `${px}px 0 0 #fff`, `-${px}px 0 0 #fff`, `0 -${px}px 0 #fff`,
    `${px * 0.7}px ${px * 0.7}px 0 #fff`, `-${px * 0.7}px ${px * 0.7}px 0 #fff`,
    `${px * 0.7}px -${px * 0.7}px 0 #fff`, `-${px * 0.7}px -${px * 0.7}px 0 #fff`,
    ...Array.from({ length: Math.round(sombra) }, (_, i) => `0 ${px + i + 1}px 0 ${i === Math.round(sombra) - 1 ? "#1e1b4b" : "#3730a3"}`),
  ].join(", ");

const OPERADOR = /^(=|×|x|\*|·|\+|−|-|÷|\/|≈|≠|<|>|≤|≥)$/;

// Título em letras coloridas (cada palavra não quebra no meio)
function TituloBolha({ texto, tamanho }) {
  let k = 0;
  return (
    <h2 aria-label={texto} className="text-center font-black uppercase leading-[1.08]" style={{ fontSize: tamanho, letterSpacing: "0.01em" }}>
      {texto.split(/\s+/).map((palavra, i) => (
        <React.Fragment key={i}>
          {i > 0 && " "}
          <span className="inline-block whitespace-nowrap" aria-hidden="true">
            {[...palavra].map((l, j) => (
              <span key={j} style={{ color: CORES[k++ % CORES.length], textShadow: CONTORNO(Math.max(3, tamanho / 16), Math.max(4, tamanho / 11)) }}>
                {l}
              </span>
            ))}
          </span>
        </React.Fragment>
      ))}
    </h2>
  );
}

// Subtítulo em duas cores ("O QUE" azul + "SIGNIFICA?" laranja)
function Secao({ a, b, className = "" }) {
  const sombra = CONTORNO(2.5, 3);
  return (
    <h3 className={`font-black uppercase leading-none tracking-wide ${className}`} style={{ fontSize: 21 }}>
      <span style={{ color: "#0ea5e9", textShadow: sombra }}>{a} </span>
      <span style={{ color: "#f97316", textShadow: sombra }}>{b}</span>
    </h3>
  );
}

// Formas 3D flutuantes do fundo
function Formas() {
  return (
    <svg className="absolute inset-0" width="794" height="1123" viewBox="0 0 794 1123" aria-hidden="true">
      <defs>
        <linearGradient id="gRoxo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c4b5fd" /><stop offset="1" stopColor="#7c3aed" /></linearGradient>
        <linearGradient id="gVerde" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#86efac" /><stop offset="1" stopColor="#16a34a" /></linearGradient>
        <linearGradient id="gLaranja" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fdba74" /><stop offset="1" stopColor="#ea580c" /></linearGradient>
        <linearGradient id="gAzul" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7dd3fc" /><stop offset="1" stopColor="#0284c7" /></linearGradient>
      </defs>
      <polygon points="22,96 44,108 44,132 22,144 0,132 0,108" fill="url(#gRoxo)" />
      <polygon points="700,300 730,316 700,332" fill="url(#gVerde)" />
      <polygon points="770,96 796,104 806,128 792,150 766,152 750,132 752,108" fill="url(#gLaranja)" />
      <rect x="20" y="300" width="22" height="22" rx="5" transform="rotate(20 31 311)" fill="url(#gAzul)" />
      <polygon points="12,590 28,572 44,590 28,608" fill="url(#gVerde)" />
      <polygon points="760,640 782,654 760,668" fill="url(#gRoxo)" />
      <circle cx="772" cy="470" r="9" fill="none" stroke="#f472b6" strokeWidth="5" />
      {[[40, 190, 12], [770, 200, 10], [26, 420, 8], [30, 760, 9], [768, 760, 11]].map(([x, y, r], i) => (
        <path key={i} d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z`} fill="#facc15" />
      ))}
    </svg>
  );
}

// "2 × 2 × 2 = 8" → blocos coloridos; só para expressões curtas separadas por espaço
function Blocos({ expressao }) {
  const partes = String(expressao).trim().split(/\s+/);
  let c = 0;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {partes.map((p, i) =>
        OPERADOR.test(p) ? (
          <span key={i} className="px-0.5 text-[30px] font-black text-indigo-500">{p === "*" ? "×" : p}</span>
        ) : (
          (() => {
            const [fundo, borda, texto] = TILES[c++ % TILES.length];
            return (
              <span
                key={i}
                className="inline-flex items-center justify-center rounded-xl px-3 text-[26px] font-black"
                style={{ height: 52, minWidth: 52, background: fundo, color: texto, border: `3px solid ${borda}`, boxShadow: `0 4px 0 ${borda}` }}
              >
                <span style={{ lineHeight: "46px" }}><Tx>{p}</Tx></span>
              </span>
            );
          })()
        )
      )}
    </div>
  );
}

const curta = (s, n) => typeof s === "string" && s.trim().length > 0 && s.length <= n;

const CapaInfografico = forwardRef(function CapaInfografico({ form, material, urlImagem, exemplo = false }, ref) {
  const m = material || {};
  const nivel = obterNivel(form.dificuldade);
  const bncc = bnccDoMaterial(form, m);
  const titulo = form.tema ? m.tituloDidatico || form.tema : "Tema Principal";
  const formulas = (m.formulas || []).filter((f) => f && f.expressao);
  const destaque = formulas.find((f) => curta(f.expressao, 26)) || formulas[0];
  // exemplo numérico curto ("V = 2 × 1,5 × 1 = 3 m³") vira blocos coloridos
  const candidatos = [...(m.aplicacaoPratica?.exemplos || []), ...formulas.map((f) => f.expressao)];
  // blocos só para contas de verdade (pelo menos 2 números soltos), não para fórmulas com palavras
  const conta = candidatos.find((e) => {
    const t = curta(e, 30) && /=/.test(e) ? e.trim().split(/\s+/) : [];
    return t.length >= 3 && t.length <= 9 && t.filter((x) => /^-?[\d.,]+(?:\^\d+)?$/.test(x)).length >= 2;
  });
  const outras = formulas.filter((f) => f !== destaque).slice(0, 3);
  const exemplos = outras.length >= 2 ? outras : []; // um item sozinho no quadro fica pobre
  const conceitos = (m.conceitos || []).slice(0, 5);
  const aplicacao = m.aplicacaoPratica;
  // lousa da turma (sem ilustração de IA): um exemplo curto do próprio conteúdo
  // ("Vou à escola", "3 × 4 = 12"), diferente da conta em blocos e da fórmula em destaque
  const naLousa =
    [...(aplicacao?.exemplos || []), ...formulas.map((f) => f.expressao)]
      .map((e) => String(e || "").replace(/^\s*[→\-–•]\s*/, "").trim())
      .find((e) => e && e.length <= 34 && e !== conta && e !== destaque?.expressao) || form.tema || titulo;

  // pouco conteúdo abaixo (sem conta em blocos nem quadro de exemplos): mascote maior ocupa a página
  const lado = conta || exemplos.length ? 310 : 390;
  const caixa = useRef(null);
  const ajuste = useAjusteAoCaber(caixa, `${titulo}|${JSON.stringify(m.conceitos)}|${JSON.stringify(aplicacao)}|${conta}`);
  const tamanho = titulo.length <= 22 ? 62 : titulo.length <= 40 ? 46 : titulo.length <= 70 ? 36 : 29;

  return (
    <section
      ref={ref}
      className="capa-a4 relative overflow-hidden font-sans text-slate-700"
      style={{ width: "210mm", height: "297mm", background: "linear-gradient(180deg, #f5f3ff 0%, #eef2ff 45%, #f0f9ff 100%)" }}
    >
      <Formas />

      {/* Escola e professor */}
      <div className="absolute inset-x-10 top-7 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="max-w-[480px] break-words text-[13px] font-extrabold text-slate-800">{form.escola || "Material didático"}</p>
            <p className="text-[11px] text-slate-500">{form.professor || "Professor(a)"}</p>
          </div>
        </div>
        {exemplo ? (
          <Chip forma="etiqueta" espacado altura={24} className="bg-amber-400 text-[11px] font-black text-amber-950">EXEMPLO</Chip>
        ) : (
          <Chip altura={24} className="bg-white text-[11px] font-bold text-indigo-600 ring-1 ring-indigo-200">
            {linhaEtapa({ nivel: form.nivel, ano: form.ano })}
          </Chip>
        )}
      </div>

      <div ref={caixa} className="absolute inset-x-10 top-[88px] bottom-[128px] flex flex-col justify-between overflow-hidden">
        <TituloBolha texto={titulo} tamanho={ajuste >= 3 ? Math.round(tamanho * 0.82) : tamanho} />

        {/* Mascote + lousa */}
        <div className="mt-4 flex flex-none items-center gap-5">
          <div className="flex-none overflow-hidden rounded-[28px]" style={{ width: lado, height: lado }}>
            {urlImagem ? (
              <div className="h-full w-full" style={{ backgroundImage: `url(${urlImagem})`, backgroundSize: "cover", backgroundPosition: "center" }} role="img" aria-label={`Ilustração sobre ${form.tema || "o tema"}`} />
            ) : (
              // sem ilustração de IA: a turma do EduGera diante da lousa com o tema
              <TurmaEduGera tema={naLousa} lado={lado} />
            )}
          </div>
          <div
            className={`flex ${lado > 310 ? "min-h-[290px]" : "min-h-[230px]"} flex-1 flex-col items-center justify-center rounded-[22px] bg-white px-5 py-6 text-center`}
            style={{ border: "10px solid #c7d2fe", boxShadow: "0 10px 0 #a5b4fc, 0 18px 30px -12px rgba(79,70,229,.35)" }}
          >
            {destaque ? (
              <>
                <p className="text-[11px] font-black uppercase tracking-widest text-indigo-600">{destaque.nome || "Ideia central"}</p>
                <p className="mt-2 break-words font-black text-indigo-600" style={{ fontSize: destaque.expressao.length <= 14 ? 44 : destaque.expressao.length <= 24 ? 32 : 24, lineHeight: 1.15 }}>
                  <Tx>{destaque.expressao}</Tx>
                </p>
                {destaque.descricao && <p className="mt-3 text-[12.5px] leading-snug text-slate-500"><Tx>{destaque.descricao}</Tx></p>}
              </>
            ) : (
              <p className="text-[15px] font-bold leading-snug text-indigo-600"><Tx>{m.resumoPedagogico || form.tema}</Tx></p>
            )}
          </div>
        </div>

        {conta && ajuste < 2 && (
          <div className="mt-4 flex-none">
            <Blocos expressao={conta} />
          </div>
        )}

        {/* O que significa? + Exemplos importantes */}
        <div className={`mt-4 grid flex-none gap-5 ${exemplos.length ? "grid-cols-[1fr_280px]" : "grid-cols-1"}`}>
          <div>
            {/* Só os termos: as definições estão na página de conteúdo (sem repetir) */}
            <Secao a="Você vai" b="aprender:" />
            <ul className="mt-3 flex flex-wrap gap-2.5">
              {conceitos.map((c, i) => {
                const [fundo, borda, texto] = TILES[i % TILES.length];
                return (
                  <li key={i} className="rounded-full px-4 py-1.5 text-[14px] font-black" style={{ background: fundo, color: texto, border: `2px solid ${borda}`, boxShadow: `0 3px 0 ${borda}` }}>
                    <Tx>{c.termo}</Tx>
                  </li>
                );
              })}
            </ul>
          </div>
          {exemplos.length > 0 && (
            <div className="self-start overflow-hidden rounded-2xl bg-white" style={{ border: "3px solid #7dd3fc", boxShadow: "0 5px 0 #7dd3fc" }}>
              <p className="py-2 text-center text-[13px] font-black uppercase leading-tight text-slate-800">Exemplos importantes</p>
              {exemplos.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 border-t-2 border-sky-100 px-3 py-2">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-[12px] font-black text-white" style={{ background: CORES[(i * 2 + 1) % CORES.length] }}>
                    {i + 1}
                  </span>
                  <span className="text-[15px] font-black text-slate-800"><Tx>{f.expressao}</Tx></span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aplicações no cotidiano */}
        {aplicacao?.titulo && (
          <div className="mt-4 flex-none">
            <Secao a="Aplicações no" b="cotidiano:" />
            <div className="mt-3 rounded-2xl bg-white px-4 py-3 shadow-[0_4px_0_#fde68a]">
              <p className="text-[13.5px] font-extrabold text-slate-800"><Tx>{aplicacao.titulo}</Tx></p>
            </div>
          </div>
        )}
      </div>

      {/* Identificação do aluno */}
      <div className="absolute inset-x-10 bottom-[58px] rounded-2xl bg-white px-5 py-3.5 shadow-[0_4px_0_#e0e7ff]">
        <div className="grid grid-cols-[1fr_130px_150px] gap-x-5 text-[12px] text-slate-500">
          <span className="border-b border-slate-300 pb-1">Nome:</span>
          <span className="border-b border-slate-300 pb-1">Turma: {form.turma || ""}</span>
          <span className="border-b border-slate-300 pb-1">Data: ___/___/___</span>
        </div>
      </div>

      <div className="absolute inset-x-10 bottom-6 flex items-center justify-between gap-4 text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5">
          {bncc?.codigo && <BadgeCheck className={`h-3.5 w-3.5 ${bncc.verificada ? "text-indigo-500" : "text-slate-400"}`} />}
          {form.disciplina} · Nível {nivel.curto}
        </span>
        <span>{rodapeBncc(bncc, exemplo)}</span>
      </div>
    </section>
  );
});

export default CapaInfografico;
