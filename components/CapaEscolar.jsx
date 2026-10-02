"use client";
import React, { forwardRef, useRef } from "react";
import { useAjusteAoCaber, tamanhoTitulo } from "@/lib/ajuste";
import Chip from "@/components/Chip";
import { BadgeCheck, GraduationCap, BookOpen, Gauge, Layers } from "lucide-react";
import { obterNivel } from "@/lib/niveis";
import { bnccDoMaterial, rodapeBncc, linhaEtapa } from "@/lib/material";
import { Rosto } from "@/components/CenaCotidiano";
import { elencoDaCena } from "@/lib/cena";

// Capa escolar clara (padrão): fundo branco, economiza tinta. A ilustração
// da IA ocupa a parte de cima, de ponta a ponta, e se funde no branco; os
// personagens do EduGera fazem a pergunta da situação do cotidiano.
// Sem ilustração, entra uma composição de símbolos pedagógicos.
// Só usa recursos que o html2canvas desenha bem (sem blur/backdrop-filter).


function Simbolos() {
  const itens = [
    ["π", 70, 120, 64, -12],
    ["√x", 640, 110, 48, 8],
    ["½", 610, 420, 56, -6],
    ["Σ", 110, 470, 58, 10],
    ["△", 340, 80, 44, 0],
    ["a²+b²", 470, 300, 34, -8],
    ["÷", 200, 300, 50, 6],
    ["%", 690, 240, 44, 0],
    ["∞", 40, 300, 46, 0],
  ];
  return (
    <svg className="absolute inset-0" width="794" height="600" viewBox="0 0 794 600" aria-hidden="true">
      <g fill="#6366f1" fillOpacity="0.1" fontFamily="Georgia, serif" fontWeight="700">
        {itens.map(([t, x, y, s, r], i) => (
          <text key={i} x={x} y={y} fontSize={s} transform={`rotate(${r} ${x} ${y})`}>
            {t}
          </text>
        ))}
      </g>
    </svg>
  );
}

function IlustracaoPadrao() {
  // Livro aberto + lápis + régua, em traço leve
  return (
    <svg width="300" height="220" viewBox="0 0 300 220" aria-hidden="true">
      <g fill="none" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M150 60 C 115 40, 70 40, 40 52 L 40 180 C 70 168, 115 168, 150 188 Z" fill="#eef2ff" />
        <path d="M150 60 C 185 40, 230 40, 260 52 L 260 180 C 230 168, 185 168, 150 188 Z" fill="#f5f3ff" />
        <path d="M150 60 L 150 188" />
        <path d="M65 85 H 125 M65 105 H 125 M65 125 H 110" stroke="#a5b4fc" />
        <path d="M175 85 H 235 M175 105 H 235 M175 125 H 220" stroke="#c4b5fd" />
      </g>
      <g transform="rotate(-35 250 40)">
        <rect x="200" y="30" width="95" height="16" rx="3" fill="#fbbf24" />
        <path d="M295 30 L 315 38 L 295 46 Z" fill="#fde68a" />
        <rect x="192" y="30" width="10" height="16" rx="2" fill="#f472b6" />
      </g>
      <g transform="rotate(8 60 200)">
        <rect x="20" y="192" width="120" height="18" rx="3" fill="#a7f3d0" stroke="#10b981" strokeWidth="2" />
        {Array.from({ length: 11 }, (_, i) => (
          <path key={i} d={`M ${28 + i * 10.4} 192 v ${i % 5 === 0 ? 9 : 5}`} stroke="#10b981" strokeWidth="1.5" />
        ))}
      </g>
    </svg>
  );
}

const CapaEscolar = forwardRef(function CapaEscolar({ form, material, urlImagem, exemplo = false }, ref) {
  const m = material || {};
  const nivel = obterNivel(form.dificuldade);
  const bncc = bnccDoMaterial(form, m);
  const titulo = form.tema ? m.tituloDidatico || form.tema : "Tema Principal";
  // Sem cortar texto: se não couber, a capa simplifica (1: sem resumo, 2: BNCC só
  // com o código, 3: título menor). O texto completo está nas páginas de conteúdo.
  const caixa = useRef(null);
  // chamada dos personagens: a pergunta da cena (ou o título dela)
  const chamada = (m.cena?.pergunta || m.cena?.titulo || "").slice(0, 140);
  const elenco = elencoDaCena(m.cena).slice(0, 2);
  const ajuste = useAjusteAoCaber(caixa, `${titulo}|${m.resumoPedagogico || ""}|${bncc?.texto || ""}`);

  return (
    <section
      ref={ref}
      className="capa-a4 relative overflow-hidden bg-white font-sans text-slate-700"
      style={{ width: "210mm", height: "297mm" }}
    >
      {/* Ilustração única, de ponta a ponta, que se funde no branco (sem moldura nem cópia esmaecida por trás) */}
      <div className="absolute inset-x-0 top-0" style={{ height: 500 }}>
        {urlImagem ? (
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `url(${urlImagem})`, backgroundSize: "cover", backgroundPosition: "center 40%" }}
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50" />
            <Simbolos />
            <div className="absolute inset-x-0 top-[120px] flex justify-center">
              <IlustracaoPadrao />
            </div>
          </>
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 55%, rgba(255,255,255,0.85) 85%, #ffffff 100%)" }}
        />
      </div>

      {/* Faixa superior (sobre a ilustração, num cartão branco para ficar legível) */}
      <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-violet-400 via-indigo-400 to-sky-400" />
      <div className="absolute inset-x-12 top-9 flex items-center justify-between">
        <div className="flex items-center gap-3 rounded-2xl bg-white/95 py-2 pl-2 pr-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="max-w-[460px] break-words text-[14px] font-extrabold text-slate-800">{form.escola || "Material didático"}</p>
            <p className="max-w-[460px] break-words text-[11.5px] text-slate-500">{form.professor || "Professor(a)"}</p>
          </div>
        </div>
        {exemplo ? (
          <Chip forma="etiqueta" espacado altura={24} className="bg-amber-400 text-[11px] font-black text-amber-950">EXEMPLO</Chip>
        ) : (
          <Chip altura={24} className="bg-white text-[11px] font-bold text-indigo-600 ring-1 ring-indigo-200">
            {form.disciplina}
          </Chip>
        )}
      </div>

      {/* Personagens do EduGera chamando para a situação da apostila */}
      {chamada && (
        <div className="absolute right-12 top-[400px] flex items-end gap-2" style={{ maxWidth: 470 }}>
          <div className="relative mb-6 rounded-2xl border-2 border-slate-700 bg-white px-3 py-2 text-[12.5px] font-semibold leading-snug text-slate-800 shadow-sm">
            {chamada}
            <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true" className="absolute -bottom-[10px] right-5">
              <path d="M0 0 L14 0 L12 11Z" fill="#fff" stroke="#334155" strokeWidth="2" strokeLinejoin="round" />
              <rect x="1" y="-2" width="12" height="3" fill="#fff" />
            </svg>
          </div>
          <div className="flex flex-none -space-x-3">
            {elenco.map((q) => (
              <div key={q} className="rounded-full bg-white p-0.5 shadow-sm">
                <Rosto quem={q} tamanho={58} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Título, etiquetas, resumo e BNCC em fluxo: crescem com o texto e empurram o que vem depois */}
      <div ref={caixa} className="absolute inset-x-12 top-[520px] bottom-[192px] flex flex-col overflow-hidden">
        <div className="mb-3 h-1.5 w-20 flex-none rounded-full bg-gradient-to-r from-violet-400 to-sky-400" />
        <h2
          className="flex-none break-words font-black leading-[1.06] tracking-tight text-indigo-950"
          style={{ fontSize: tamanhoTitulo(titulo, 44, ajuste >= 3) }}
        >
          {titulo}
        </h2>
        <div className="mt-4 flex flex-none flex-wrap gap-2 text-[12px] font-bold">
          <Chip icone={BookOpen} altura={26} className="bg-indigo-50 text-indigo-700">
            {form.disciplina}
          </Chip>
          <Chip icone={Layers} altura={26} className="bg-violet-50 text-violet-700">
            {linhaEtapa({ nivel: form.nivel, ano: form.ano })}
          </Chip>
          <Chip icone={Gauge} altura={26} className="bg-sky-50 text-sky-700">
            Nível {nivel.curto}
          </Chip>
        </div>
        {m.resumoPedagogico && ajuste < 1 && (
          <p className="mt-4 max-w-[640px] flex-none text-[13.5px] leading-[1.6] text-slate-600">{m.resumoPedagogico}</p>
        )}

        {/* Habilidade BNCC — só aparece como "alinhado" quando conferida */}
        {bncc?.codigo && (
          <div className="mt-auto flex flex-none gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <BadgeCheck className={`mt-0.5 h-5 w-5 flex-none ${bncc.verificada ? "text-indigo-500" : "text-slate-400"}`} />
            <p className="text-[12px] leading-[1.5] text-slate-600">
              <span className="font-extrabold text-indigo-700">
                {bncc.verificada ? `Habilidade BNCC ${bncc.codigo}` : `Habilidade informada pelo docente · ${bncc.codigo}`}
              </span>
              {bncc.texto ? (ajuste < 2 ? ` — ${bncc.texto}` : " — descrição completa na página seguinte.") : ""}
            </p>
          </div>
        )}
      </div>

      {/* Identificação do aluno */}
      <div className="absolute inset-x-12 bottom-[70px] rounded-2xl border-2 border-slate-200 p-5">
        <div className="grid grid-cols-[1fr_140px] gap-x-6 gap-y-5 text-[12px] text-slate-500">
          <span className="border-b border-slate-300 pb-1">Nome:</span>
          <span className="border-b border-slate-300 pb-1">Nº:</span>
          <span className="border-b border-slate-300 pb-1">Turma:</span>
          <span className="border-b border-slate-300 pb-1">Data: ___/___/___</span>
        </div>
      </div>

      <div className="absolute inset-x-12 bottom-7 flex justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
        <span>{form.professor}</span>
        <span>{rodapeBncc(bncc, exemplo)}</span>
      </div>
    </section>
  );
});

export default CapaEscolar;
