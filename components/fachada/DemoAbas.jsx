"use client";
import React, { useRef, useState } from "react";
import { BookOpenCheck, FileCheck2 } from "lucide-react";
import DemoAnimada from "./DemoAnimada";
import DemoCorrecao from "./DemoCorrecao";

// Abas da seção "Na prática": demonstração da apostila e da correção de prova.
// Setas ←/→, Home e End trocam de aba (padrão ARIA de abas).
const ABAS = [
  {
    id: "apostila",
    rotulo: "Criar apostila",
    icone: BookOpenCheck,
    texto: "Você informa o ano, o componente e o tema. O EduGera confere a habilidade da BNCC, monta o material e entrega o PDF do aluno e o do professor.",
  },
  {
    id: "correcao",
    rotulo: "Corrigir prova",
    icone: FileCheck2,
    texto: "Tire foto da prova respondida. A IA lê cada questão, marca certa, parcial ou errada, explica o erro e sugere a nota — você confere e ajusta.",
  },
];

export default function DemoAbas() {
  const [ativa, setAtiva] = useState(0);
  const botoes = useRef([]);
  const teclas = (e) => {
    const ir = { ArrowRight: ativa + 1, ArrowLeft: ativa - 1, Home: 0, End: ABAS.length - 1 }[e.key];
    if (ir === undefined) return;
    e.preventDefault();
    const n = (ir + ABAS.length) % ABAS.length;
    setAtiva(n);
    botoes.current[n]?.focus();
  };
  const aba = ABAS[ativa];
  return (
    <div>
      <div role="tablist" aria-label="Demonstrações" className="inline-flex gap-1 rounded-full bg-white p-1.5 ring-1 ring-[#e6dcc8]">
        {ABAS.map(({ id, rotulo, icone: Icone }, i) => (
          <button
            key={id}
            ref={(el) => (botoes.current[i] = el)}
            type="button"
            role="tab"
            id={`aba-demo-${id}`}
            aria-selected={i === ativa}
            aria-controls={`painel-demo-${id}`}
            tabIndex={i === ativa ? 0 : -1}
            onClick={() => setAtiva(i)}
            onKeyDown={teclas}
            className={`flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-colors sm:px-5 ${
              i === ativa ? "bg-marinho text-white" : "text-tinta hover:text-marinho"
            }`}
          >
            <Icone className="h-4 w-4" aria-hidden="true" /> {rotulo}
          </button>
        ))}
      </div>
      <p className="mt-5 max-w-[680px] text-lg leading-relaxed text-tinta">{aba.texto}</p>
      <div role="tabpanel" id={`painel-demo-${aba.id}`} aria-labelledby={`aba-demo-${aba.id}`} className="mt-8 sm:mt-10">
        {aba.id === "apostila" ? <DemoAnimada /> : <DemoCorrecao />}
      </div>
    </div>
  );
}
