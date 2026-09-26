"use client";
import React, { forwardRef } from "react";
import {
  GraduationCap,
  BookOpen,
  Target,
  Lightbulb,
  Boxes,
  Loader2,
  Image as ImageIcon,
  PencilLine,
  BadgeCheck,
} from "lucide-react";
import { obterNivel } from "@/lib/niveis";

// Folha A4 em tamanho real (210 mm de largura, 15 mm de margem lateral).
// É a MESMA folha usada no live preview (escalada), na impressão, no PDF e
// na página pública compartilhada — o que o professor vê é o que sai.
//
// Classes de quebra de página (Task 1.2), usadas em globals.css e no html2pdf:
//   .cabecalho-escola  .cartao-bncc  .bloco-exercicio

const Rotulo = ({ icon: Icon, children, className = "" }) => (
  <div className={`flex items-center gap-1.5 ${className}`}>
    <Icon className="h-4 w-4" strokeWidth={2.4} />
    <span className="text-[11px] font-extrabold uppercase tracking-wider">{children}</span>
  </div>
);

// Marcador numerado em SVG: o html2canvas (exportação em PDF) renderiza SVG
// como imagem, então o número fica sempre centralizado — texto em caixinhas
// pequenas costuma sair deslocado no PDF.
const Numero = ({ n, tamanho = 20, cor = "#6366f1", redondo = false, className = "" }) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 20 20" className={`inline-block flex-none ${className}`} aria-hidden="true">
    <rect width="20" height="20" rx={redondo ? 10 : 5} fill={cor} />
    <text x="10" y="14.2" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#fff" fontFamily="system-ui, sans-serif">
      {n}
    </text>
  </svg>
);

const CORES_NIVEL = {
  adaptado: "bg-sky-50 text-sky-700 ring-sky-200",
  padrao: "bg-slate-50 text-slate-600 ring-slate-200",
  desafio: "bg-rose-50 text-rose-700 ring-rose-200",
};

const FolhaA4 = forwardRef(function FolhaA4(
  { form, material, urlImagem, loadingImagem = false, mostrarGabarito = false },
  ref
) {
  const m = material || {};
  const nivel = obterNivel(form.dificuldade);
  const bncc = m.bncc?.codigo === form.bncc ? m.bncc : form.bncc ? { codigo: form.bncc, texto: form.habilidade } : null;
  const exercicios = m.exercicios || [];

  return (
    <article ref={ref} className="folha-a4 bg-white text-slate-700 font-sans text-[12.5px] leading-[1.5]">
      {/* Cabeçalho da escola / identificação do aluno */}
      <header className="cabecalho-escola rounded-2xl border-2 border-indigo-100 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">
              <GraduationCap className="h-6 w-6 text-indigo-500" />
            </div>
            <div>
              <p className="text-[15px] font-extrabold text-slate-800">{form.professor || "Professor"}</p>
              <p className="text-[11.5px] text-slate-500">
                {form.disciplina} · {form.nivel}
              </p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-[10.5px] font-bold ring-1 ${CORES_NIVEL[nivel.id]}`}>
            Nível {nivel.curto}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_120px_110px] gap-4 text-[11px] text-slate-500">
          <span className="border-b border-slate-300 pb-1">Nome:</span>
          <span className="border-b border-slate-300 pb-1">Turma:</span>
          <span className="border-b border-slate-300 pb-1">Data: ___/___/___</span>
        </div>
      </header>

      {/* Cartão BNCC */}
      {bncc && (
        <section className="cartao-bncc mt-3 flex gap-3 rounded-xl bg-indigo-50/70 px-4 py-2.5">
          <BadgeCheck className="mt-0.5 h-4 w-4 flex-none text-indigo-500" />
          <p className="text-[11px] leading-snug text-slate-600">
            <span className="font-extrabold text-indigo-600">BNCC {bncc.codigo}</span>
            {bncc.texto ? <> — {bncc.texto}</> : null}
          </p>
        </section>
      )}

      {/* Título */}
      <h1 className="mt-5 text-center text-[28px] font-black leading-tight text-indigo-600">
        {form.tema ? m.tituloDidatico : "Tema Principal"}
      </h1>

      {/* Imagem */}
      <div className="bloco-exercicio mt-4 flex h-[230px] items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
        {loadingImagem ? (
          <div className="flex flex-col items-center gap-2 text-indigo-300">
            <Loader2 className="h-9 w-9 animate-spin" />
            <span className="text-[12px] font-semibold">Gerando ilustração...</span>
          </div>
        ) : urlImagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlImagem} crossOrigin="anonymous" alt="Ilustração gerada por IA" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <ImageIcon className="h-9 w-9" />
            <span className="text-[12px] font-semibold">Imagem IA · {form.estilo}</span>
          </div>
        )}
      </div>

      {m.resumoPedagogico && <p className="mt-4 text-justify text-[13px] text-slate-600">{m.resumoPedagogico}</p>}

      {/* Conceitos e fórmulas */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <section className="bloco-exercicio rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
          <Rotulo icon={BookOpen} className="text-indigo-600">Conceitos-chave</Rotulo>
          <ul className="mt-2 space-y-1.5">
            {(m.conceitos || []).map((c, i) => (
              <li key={i} className="text-[12px] leading-snug">
                <span className="font-bold text-indigo-600">{c.termo}:</span> {c.definicao}
              </li>
            ))}
          </ul>
        </section>

        <section className="bloco-exercicio rounded-xl bg-violet-50 p-3.5">
          <Rotulo icon={Target} className="text-violet-600">Fórmulas &amp; regras</Rotulo>
          <div className="mt-2 space-y-2">
            {(m.formulas || []).map((f, i) => (
              <div key={i} className="rounded-lg bg-white/90 px-2.5 py-1.5">
                <div className="font-mono text-[13px] font-bold text-violet-700">{f.expressao}</div>
                <div className="text-[11px] leading-tight text-slate-500">
                  {f.nome ? <b className="text-slate-600">{f.nome}: </b> : null}
                  {f.descricao}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Dicas */}
      {(m.dicas || []).length > 0 && (
        <section className="bloco-exercicio mt-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3.5">
          <Rotulo icon={Lightbulb} className="text-amber-600">Dicas de resolução</Rotulo>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {m.dicas.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px] leading-snug text-amber-800">
                <Numero n={i + 1} tamanho={16} cor="#fbbf24" redondo className="mt-0.5" />
                <span>{d}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {m.lembreteImportante && (
        <section className="bloco-exercicio mt-3 rounded-xl bg-emerald-50 p-3.5">
          <Rotulo icon={Boxes} className="text-emerald-600">Lembre-se</Rotulo>
          <p className="mt-1.5 text-[12px] text-emerald-800">{m.lembreteImportante}</p>
        </section>
      )}

      {/* Aplicação prática */}
      {(m.aplicacaoPratica?.situacao || m.aplicacaoPratica?.exemplos?.length > 0) && (
        <section className="bloco-exercicio mt-3 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 p-3.5">
          <Rotulo icon={Target} className="text-indigo-600">
            {m.aplicacaoPratica.titulo || "Aplicação prática no cotidiano"}
          </Rotulo>
          <p className="mt-1.5 text-[12px] font-medium text-slate-700">{m.aplicacaoPratica.situacao}</p>
          {m.aplicacaoPratica.exemplos?.length > 0 && (
            <ul className="mt-2 grid grid-cols-2 gap-1.5">
              {m.aplicacaoPratica.exemplos.map((ex, i) => (
                <li key={i} className="rounded-md bg-white/80 px-2.5 py-1 text-[11.5px] font-medium text-indigo-700">
                  → {ex}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Exercícios */}
      {exercicios.length > 0 && (
        <>
          <div className="mt-6 flex items-center gap-2 border-b-2 border-indigo-100 pb-1.5 text-indigo-600">
            <PencilLine className="h-4 w-4" />
            <span className="text-[13px] font-extrabold uppercase tracking-wider">Exercícios</span>
          </div>
          {exercicios.map((ex, i) => (
            <section key={i} className="bloco-exercicio mt-3 rounded-xl border border-slate-200 p-3.5">
              <p className="text-[12.5px]">
                <Numero n={i + 1} className="mr-1.5 -mt-0.5 align-middle" />
                {ex.enunciado}
              </p>
              {ex.alternativas.length > 0 ? (
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 pl-7 text-[12px]">
                  {ex.alternativas.map((a, j) => (
                    <li key={j}>{a}</li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2 space-y-4 pl-7 pt-2">
                  <div className="border-b border-slate-300" />
                  <div className="border-b border-slate-300" />
                  <div className="border-b border-slate-300" />
                </div>
              )}
            </section>
          ))}
        </>
      )}

      {mostrarGabarito && exercicios.length > 0 && (
        <section className="bloco-exercicio mt-5 rounded-xl bg-slate-50 p-3.5">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Gabarito</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[11.5px] text-slate-600">
            {exercicios.map((ex, i) => (
              <li key={i}>{ex.resposta || "—"}</li>
            ))}
          </ol>
        </section>
      )}

      <footer className="mt-6 border-t border-slate-100 pt-2 text-center text-[9.5px] text-slate-400">
        Material gerado com EduGera · alinhado à BNCC
      </footer>
    </article>
  );
});

export default FolhaA4;
