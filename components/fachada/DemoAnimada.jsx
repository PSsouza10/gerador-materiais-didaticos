"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Sparkles, Check, FileDown, Pause, Play, Loader2 } from "lucide-react";

// Demonstração animada do fluxo real do /criar: preencher → gerar → conferências → apostila + PDFs.
// Só ilustra (nada é enviado). Pausa fora da tela, tem botão Pausar e mostra o
// resultado parado para quem pede menos movimento.

const ANO = "7º ano";
const COMPONENTE = "Matemática";
const TEMA = "Volume e capacidade";
const CONFERENCIAS = ["Habilidade BNCC EF07MA30", "Exercícios com situação do cotidiano", "Gabarito conferido pelo cálculo"];

// fases: 0 digitando · 1 clique em Gerar · 2 gerando · 3 pronto
const DURACAO = [3400, 700, 3000, 4200];

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

export default function DemoAnimada() {
  const caixa = useRef(null);
  const menos = useMenosMovimento();
  const [visivel, setVisivel] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [fase, setFase] = useState(0);
  const [t, setT] = useState(0); // ms dentro da fase

  useEffect(() => {
    const el = caixa.current;
    if (!el || typeof IntersectionObserver === "undefined") return setVisivel(true);
    const obs = new IntersectionObserver(([e]) => setVisivel(e.isIntersecting), { threshold: 0.3 });
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
  const digitado = (txt, ini, fim) => {
    if (f > 0) return txt;
    const q = Math.max(0, Math.min(1, (p - ini) / (fim - ini)));
    return txt.slice(0, Math.round(txt.length * q));
  };
  const ano = digitado(ANO, 0, 0.2);
  const comp = digitado(COMPONENTE, 0.22, 0.45);
  const tema = digitado(TEMA, 0.48, 0.95);
  const conferidas = f === 2 ? Math.floor(p * (CONFERENCIAS.length + 0.6)) : f > 2 ? CONFERENCIAS.length : 0;

  return (
    <div ref={caixa} className="relative">
      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
        {/* formulário (cópia visual do /criar) */}
        <div className="papel !rounded-[22px] p-5 sm:p-7" aria-hidden="true">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-roxo">
            <Sparkles className="h-4 w-4" /> Configuração da criação
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Campo rotulo="Ano" valor={ano} ativo={f === 0 && p < 0.21} />
            <Campo rotulo="Componente" valor={comp} ativo={f === 0 && p >= 0.21 && p < 0.46} />
          </div>
          <div className="mt-3">
            <Campo rotulo="Tema ou habilidade BNCC" valor={tema} ativo={f === 0 && p >= 0.46} />
          </div>
          <div
            className={`mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-5 font-semibold text-white transition-transform duration-200 ${
              f === 1 ? "scale-95" : ""
            } ${f === 2 ? "bg-roxo-escuro" : "bg-roxo"}`}
          >
            {f === 2 ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" /> : <Sparkles className="h-5 w-5" />}
            {f === 2 ? "Gerando..." : f === 3 ? "Material pronto" : "Gerar material"}
          </div>
          <ul className="mt-5 space-y-2.5">
            {CONFERENCIAS.map((c, i) => {
              const ok = i < conferidas;
              return (
                <li
                  key={c}
                  className={`flex items-center gap-2.5 text-[15px] transition-opacity duration-300 ${ok ? "opacity-100" : "opacity-35"}`}
                >
                  <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full ${ok ? "bg-verde text-white" : "bg-creme-escuro text-tinta"}`}>
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-tinta">{c}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* resultado */}
        <div className="relative min-h-[300px] sm:min-h-[380px]">
          <div
            className={`absolute inset-0 flex items-center justify-center rounded-[22px] border-2 border-dashed border-marinho/15 text-center text-tinta transition-opacity duration-500 ${
              f === 3 ? "opacity-0" : "opacity-100"
            }`}
            aria-hidden="true"
          >
            <p className="max-w-[260px] px-4 text-[15px]">{f === 2 ? "Montando capa, conteúdo, exercícios e gabarito..." : "A apostila aparece aqui"}</p>
          </div>
          <figure
            className={`relative transition-all duration-700 ease-out ${f === 3 ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
          >
            <div className="folha-sombra mx-auto max-w-[560px] overflow-hidden bg-white">
              <Image
                src="/vitrine/conteudo.webp"
                width={960}
                height={1064}
                sizes="(min-width: 1024px) 560px, 92vw"
                alt="Resultado de exemplo: página de conteúdo de Matemática do 7º ano sobre volume e capacidade, com habilidade BNCC EF07MA30 e diálogo entre personagens."
                className="h-auto max-h-[440px] w-full object-cover object-top"
              />
            </div>
            <figcaption className="mt-4 flex flex-wrap justify-center gap-2.5" aria-hidden="true">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-claro px-4 py-2 text-sm font-semibold text-coral-escuro">
                <FileDown className="h-4 w-4" /> PDF do aluno
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-roxo-claro px-4 py-2 text-sm font-semibold text-roxo-escuro">
                <FileDown className="h-4 w-4" /> PDF do professor
              </span>
            </figcaption>
          </figure>
        </div>
      </div>

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

function Campo({ rotulo, valor, ativo }) {
  return (
    <div>
      <span className="block text-[13px] font-semibold text-tinta">{rotulo}</span>
      <span
        className={`mt-1 flex min-h-[44px] items-center rounded-xl border bg-white px-3.5 text-[15px] text-marinho ${
          ativo ? "border-roxo ring-2 ring-roxo/20" : "border-slate-200"
        }`}
      >
        {valor}
        {ativo && <span className="ml-0.5 inline-block h-5 w-[2px] animate-pulse bg-roxo motion-reduce:animate-none" />}
      </span>
    </div>
  );
}
