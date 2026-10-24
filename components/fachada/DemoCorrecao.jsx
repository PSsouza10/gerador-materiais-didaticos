"use client";
import React, { useEffect, useRef, useState } from "react";
import { Camera, Check, X, Minus, Pause, Play, Loader2, MessageSquareText } from "lucide-react";

// Demonstração animada da Correção de Prova (/criar → Corrigir Prova): foto da prova →
// leitura → questão a questão (certa / parcial / errada) → nota e devolutiva.
// Exemplo inventado, nada é enviado. Pausa fora da tela e tem botão Pausar.

const QUESTOES = [
  { n: 1, pede: "3 pacotes com 12 figurinhas", aluno: "3 × 12 = 36", sit: "certa", pts: 2 },
  { n: 2, pede: "Cadeiras em 4 filas de 5", aluno: "4 × 5 = 20", sit: "certa", pts: 2 },
  { n: 3, pede: "6 × 7 = 48? Corrija", aluno: "Está certo", sit: "errada", pts: 0, nota: "6 × 7 = 42; o aluno aceitou o erro do colega." },
  { n: 4, pede: "Ovos para 5 bolos (2 por bolo)", aluno: "5 + 2 = 7… 10", sit: "parcial", pts: 1, nota: "Chegou a 10, mas começou somando em vez de multiplicar." },
  { n: 5, pede: "8 × 3 é igual a 3 × 8?", aluno: "V — a ordem não muda", sit: "certa", pts: 2 },
];
const TOTAL = QUESTOES.reduce((s, q) => s + q.pts, 0);
const ESTILO = {
  certa: { rotulo: "Certa", cor: "bg-verde text-white", fundo: "bg-verde-claro text-verde-escuro", Icone: Check },
  parcial: { rotulo: "Parcial", cor: "bg-amber-500 text-white", fundo: "bg-amber-50 text-amber-900", Icone: Minus },
  errada: { rotulo: "Errada", cor: "bg-coral text-white", fundo: "bg-coral-claro text-coral-escuro", Icone: X },
};

// fases: 0 foto chegando · 1 lendo · 2 corrigindo questão a questão · 3 nota e devolutiva
const DURACAO = [1600, 2200, 4200, 4800];

function useMenosMovimento() {
  const [menos, setMenos] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMenos(mq.matches);
    const ouvir = (e) => setMenos(e.matches);
    mq.addEventListener?.("change", ouvir);
    return () => mq.removeEventListener?.("change", ouvir);
  }, []);
  return menos;
}

export default function DemoCorrecao({ aoTerminar }) {
  const caixa = useRef(null);
  const menos = useMenosMovimento();
  const [visivel, setVisivel] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [fase, setFase] = useState(0);
  // ao fechar um ciclo completo (última fase → primeira), avisa quem controla as abas
  const faseAnterior = useRef(0);
  useEffect(() => {
    if (faseAnterior.current === DURACAO.length - 1 && fase === 0) aoTerminar?.();
    faseAnterior.current = fase;
  }, [fase, aoTerminar]);
  const [t, setT] = useState(0);

  useEffect(() => {
    const el = caixa.current;
    if (!el || typeof IntersectionObserver === "undefined") return setVisivel(true);
    const obs = new IntersectionObserver(([e]) => setVisivel(e.isIntersecting), { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const rodando = visivel && !pausado && !menos;
  useEffect(() => {
    if (!rodando) return;
    const passo = 80;
    const id = setInterval(() => {
      setT((v) => {
        const nv = v + passo;
        if (nv < DURACAO[fase]) return nv;
        setFase((f) => (f + 1) % DURACAO.length);
        return 0;
      });
    }, passo);
    return () => clearInterval(id);
  }, [rodando, fase]);

  const f = menos ? 3 : fase;
  const p = menos ? 1 : Math.min(1, t / DURACAO[fase]);
  const corrigidas = f < 2 ? 0 : f === 2 ? Math.min(QUESTOES.length, Math.floor(p * (QUESTOES.length + 0.5))) : QUESTOES.length;
  const nota = QUESTOES.slice(0, corrigidas).reduce((s, q) => s + q.pts, 0);

  return (
    <div ref={caixa} className="relative">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
        {/* foto da prova respondida (desenhada, exemplo) */}
        <div aria-hidden="true">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-roxo">
            <Camera className="h-4 w-4" /> Foto da prova respondida
          </p>
          <div
            className={`relative overflow-hidden rounded-[18px] bg-white p-5 shadow-[0_18px_40px_-24px_rgba(22,26,79,0.45)] ring-1 ring-[#e6dcc8] transition-all duration-700 sm:p-6 ${
              f === 0 && p < 0.5 ? "translate-y-3 rotate-1 opacity-0" : "rotate-[-1deg] opacity-100"
            }`}
          >
            <div className="flex items-baseline justify-between border-b border-dashed border-slate-300 pb-2 text-[13px] text-tinta">
              <span>Aluno(a): <span className="font-titulo italic text-[15px] text-marinho">Marina</span></span>
              <span>7º B</span>
            </div>
            <ol className="mt-3 space-y-2.5">
              {QUESTOES.map((q, i) => {
                const feita = i < corrigidas;
                const e = ESTILO[q.sit];
                return (
                  <li key={q.n} className="relative flex items-start gap-2 text-[13.5px]">
                    <span className="font-bold text-marinho">{q.n}.</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-tinta">{q.pede}</span>
                      <span className="block font-titulo italic text-[15px] leading-snug text-[#2a3a8f]">{q.aluno}</span>
                    </span>
                    <span
                      className={`flex h-7 w-7 flex-none items-center justify-center rounded-full transition-all duration-300 ${
                        feita ? `${e.cor} scale-100 opacity-100` : "scale-50 opacity-0"
                      }`}
                    >
                      <e.Icone className="h-4 w-4" strokeWidth={3} />
                    </span>
                  </li>
                );
              })}
            </ol>
            {/* linha de leitura */}
            {f === 1 && (
              <div
                className="pointer-events-none absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-roxo/20 to-transparent"
                style={{ top: `${Math.round(p * 100)}%` }}
              />
            )}
          </div>
          <p className="mt-3 text-center text-[13px] text-tinta">Até 6 fotos por prova. Pode enviar o gabarito ou deixar a IA resolver.</p>
        </div>

        {/* resultado da correção */}
        <div className="papel !rounded-[22px] p-5 sm:p-6" aria-hidden="true">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px] font-bold text-marinho">
              {f === 0 ? "Aguardando as fotos" : f === 1 ? "Lendo a prova..." : f === 2 ? "Corrigindo questão por questão" : "Correção pronta"}
            </p>
            {(f === 1 || f === 2) && <Loader2 className="h-5 w-5 animate-spin text-roxo motion-reduce:animate-none" />}
            {f === 3 && (
              <span className="rounded-full bg-marinho px-4 py-1.5 text-lg font-bold text-white">
                {nota.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} <span className="text-sm font-semibold text-white/70">/ 10</span>
              </span>
            )}
          </div>

          <ul className="mt-4 space-y-2">
            {QUESTOES.map((q, i) => {
              const feita = i < corrigidas;
              const e = ESTILO[q.sit];
              return (
                <li
                  key={q.n}
                  className={`rounded-xl px-3.5 py-2.5 transition-all duration-300 ${feita ? `${e.fundo} opacity-100` : "bg-creme-escuro/60 text-tinta/50 opacity-70"}`}
                >
                  <div className="flex items-center gap-2.5 text-[14px]">
                    <span className="w-6 font-bold">{q.n}</span>
                    <span className="min-w-0 flex-1 truncate">{q.pede}</span>
                    <span className="flex-none font-bold">{feita ? `${e.rotulo} · ${q.pts}/2` : "—"}</span>
                  </div>
                  {feita && q.nota && <p className="mt-1 pl-8 text-[13px] leading-snug opacity-90">{q.nota}</p>}
                </li>
              );
            })}
          </ul>

          <div className={`mt-4 rounded-xl bg-white p-3.5 ring-1 ring-[#e6dcc8] transition-opacity duration-500 ${f === 3 ? "opacity-100" : "opacity-0"}`}>
            <p className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-roxo">
              <MessageSquareText className="h-4 w-4" /> Devolutiva para o aluno
            </p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-tinta">
              Você entende a multiplicação como grupos iguais. Atenção à tabuada do 7 e confira cada conta antes de concordar com outra resposta.
            </p>
          </div>
          <p className="mt-3 text-[13px] text-tinta">Você pode mudar a situação ou os pontos de qualquer questão antes de imprimir.</p>
        </div>
      </div>

      <p className="sr-only">
        Exemplo de correção: 5 questões de multiplicação, três certas, uma parcial e uma errada, nota {TOTAL} de 10, com comentário por questão e devolutiva para o aluno.
      </p>

      {!menos && (
        <button
          type="button"
          onClick={() => setPausado((v) => !v)}
          className="btn-contorno mx-auto mt-8 !flex w-fit !min-h-[44px] text-[15px] font-semibold text-marinho"
          aria-pressed={pausado}
        >
          {pausado ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
          {pausado ? "Continuar demonstração" : "Pausar demonstração"}
        </button>
      )}
    </div>
  );
}
