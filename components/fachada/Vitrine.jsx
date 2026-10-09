"use client";
import React, { useRef, useState } from "react";
import Image from "next/image";
import { BookOpen, FileText, PencilLine, CheckCircle2, GraduationCap, UserRound } from "lucide-react";

// "Veja o que sai do EduGera": prévias reais (capturas da própria prévia A4 do app, material de exemplo).
// Abas acessíveis: setas ←/→, Home e End trocam de aba; Tab vai para o painel.
const ABAS = [
  {
    id: "capa",
    rotulo: "Capa",
    icone: BookOpen,
    titulo: "Capa ilustrada, pronta para a primeira página",
    texto: "Título, conceitos e fórmulas principais em destaque, com a turma de personagens do EduGera. Você escolhe entre três estilos de capa ou nenhuma.",
    img: "/vitrine/capa-infografico.webp",
    w: 760,
    h: 1076,
    alt: "Capa infográfico da ficha “Volume e Capacidade no Dia a Dia”, com fórmula V = c × l × h, lousa e personagens.",
  },
  {
    id: "conteudo",
    rotulo: "Conteúdo",
    icone: FileText,
    titulo: "Conteúdo com situação do cotidiano",
    texto: "Cabeçalho da escola com nome, turma e data, a habilidade da BNCC, um resumo direto e uma conversa entre personagens que apresenta o problema.",
    img: "/vitrine/conteudo.webp",
    w: 960,
    h: 1064,
    alt: "Página de conteúdo com cabeçalho da escola, habilidade BNCC EF07MA30 e diálogo entre Théo e Vó Ana sobre a caixa-d'água.",
  },
  {
    id: "exercicios",
    rotulo: "Exercícios",
    icone: PencilLine,
    titulo: "Exercícios variados, cada um com contexto",
    texto: "Questões de múltipla escolha e abertas, com linhas para resposta. Antes de imprimir você aprova, edita, corrige com IA ou exclui cada uma.",
    img: "/vitrine/exercicios.webp",
    w: 960,
    h: 754,
    alt: "Três exercícios sobre volume, cada um apresentado por um personagem, com alternativas e linhas de resposta.",
  },
  {
    id: "gabarito",
    rotulo: "Gabarito",
    icone: CheckCircle2,
    titulo: "Gabarito com a resolução",
    texto: "A resposta vem com o cálculo. Nas questões de múltipla escolha, o EduGera confere se a letra marcada bate com o resultado.",
    img: "/vitrine/gabarito.webp",
    w: 960,
    h: 254,
    alt: "Gabarito da folha do professor com as respostas e os cálculos dos três exercícios.",
  },
  {
    id: "pdf-aluno",
    rotulo: "PDF do aluno",
    icone: UserRound,
    titulo: "PDF do aluno: só o que vai para a turma",
    texto: "Folha A4 com margens de impressão, sem o gabarito. Role a prévia para ver a folha inteira.",
    img: "/vitrine/pdf-aluno.webp",
    w: 820,
    h: 2165,
    alt: "Folha A4 completa do aluno: cabeçalho, situação do cotidiano, conceitos, fórmulas, pontos de atenção e exercícios.",
    longa: true,
  },
  {
    id: "pdf-professor",
    rotulo: "PDF do professor",
    icone: GraduationCap,
    titulo: "PDF do professor: a mesma folha, com gabarito",
    texto: "A versão do professor repete a folha e acrescenta o gabarito no final, pronto para recortar ou guardar.",
    img: "/vitrine/pdf-professor.webp",
    w: 820,
    h: 2365,
    alt: "Folha A4 completa do professor, igual à do aluno e com o gabarito ao final.",
    longa: true,
  },
];

export default function Vitrine() {
  const [ativa, setAtiva] = useState(0);
  const refs = useRef([]);

  const aoTeclar = (e) => {
    const n = ABAS.length;
    const prox = { ArrowRight: (ativa + 1) % n, ArrowLeft: (ativa - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (prox === undefined) return;
    e.preventDefault();
    setAtiva(prox);
    refs.current[prox]?.focus();
  };

  const a = ABAS[ativa];
  return (
    <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
      <div>
        <div role="tablist" aria-label="Partes do material" aria-orientation="horizontal" className="-mx-1 flex flex-wrap gap-2" onKeyDown={aoTeclar}>
          {ABAS.map((x, i) => {
            const Icone = x.icone;
            const sel = i === ativa;
            return (
              <button
                key={x.id}
                ref={(el) => (refs.current[i] = el)}
                type="button"
                role="tab"
                id={`aba-${x.id}`}
                aria-selected={sel}
                aria-controls={`painel-${x.id}`}
                tabIndex={sel ? 0 : -1}
                onClick={() => setAtiva(i)}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-[15px] font-semibold transition-colors ${
                  sel
                    ? "border-marinho bg-marinho text-white"
                    : "border-marinho/15 bg-white/70 text-marinho hover:border-roxo/50 hover:bg-white"
                }`}
              >
                <Icone className="h-4 w-4" aria-hidden="true" />
                {x.rotulo}
              </button>
            );
          })}
        </div>
        <div className="mt-8" aria-live="polite">
          <h3 className="font-titulo text-[1.75rem] font-semibold leading-tight text-marinho">{a.titulo}</h3>
          <p className="mt-3 text-[17px] leading-relaxed text-tinta">{a.texto}</p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-verde-claro px-3 py-1.5 text-[13px] font-semibold text-verde-escuro">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Prévia real do EduGera, com o material de exemplo
          </p>
        </div>
      </div>

      {ABAS.map((x, i) => (
        <div
          key={x.id}
          role="tabpanel"
          id={`painel-${x.id}`}
          aria-labelledby={`aba-${x.id}`}
          hidden={i !== ativa}
          className="relative"
        >
          <div className="moldura-vitrine">
            <div
              className={`relative overflow-hidden rounded-xl bg-white ${x.longa ? "max-h-[640px] overflow-y-auto overscroll-contain" : ""}`}
              tabIndex={x.longa ? 0 : undefined}
              aria-label={x.longa ? `${x.rotulo} — role para ver a folha inteira` : undefined}
            >
              <Image
                src={x.img}
                width={x.w}
                height={x.h}
                alt={x.alt}
                sizes="(min-width: 1024px) 640px, 100vw"
                className={`h-auto w-full ${x.longa ? "" : "max-h-[640px] object-contain object-top"}`}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
