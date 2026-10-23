"use client";
import React from "react";
import { BookOpen, ClipboardList, Wand2 } from "lucide-react";
import { recomposicaoDaTurma } from "@/lib/ciclo";
import { pedidoDaAvaliacao } from "@/lib/avaliacao";
import { linkGerador } from "@/lib/provaPaulistaSeo";

const COR = { atencao: "bg-amber-100 text-amber-900", reforcar: "bg-rose-100 text-rose-900" };

// "Gerar recomposição": as 2–3 habilidades (ou descritores) mais fracas da turma, cada uma com
// atalhos para a apostila (com a lista A4 de 1 página) e o plano de aula, já preenchidos.
export default function Recomposicao({ avaliacao, rel }) {
  const alvos = recomposicaoDaTurma(rel);
  const d = pedidoDaAvaliacao(avaliacao);
  if (!rel?.alunos) return null;
  return (
    <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-[13px] text-indigo-950">
      <p className="flex items-center gap-1.5 font-bold">
        <Wand2 className="h-4 w-4" /> Gerar recomposição
      </p>
      {alvos.length === 0 ? (
        <p className="mt-1">A turma ficou adequada (70% ou mais) em tudo o que a avaliação cobrou. Não há o que recompor aqui.</p>
      ) : (
        <>
          <p className="mt-1 text-[12px]">O que a turma mais errou. Cada botão abre o gerador numa aba nova, já com a habilidade, o ano e o tema; cada material usa 1 geração.</p>
          <ol className="mt-2 space-y-2">
            {alvos.map((a, k) => {
              const base = { codigo: a.habilidade, disciplina: d.disciplina || "", ano: d.ano || "", tema: a.tema };
              return (
                <li key={`${a.habilidade}-${k}`} className="rounded-xl bg-white p-3">
                  <p>
                    <b>{a.habilidade || "Habilidade da prova"}</b>
                    {a.tema && ` — ${a.tema}`}{" "}
                    <span className={`rounded px-1.5 py-0.5 text-[11.5px] font-bold ${COR[a.faixa] || ""}`}>{a.percentual}% de acerto</span>
                  </p>
                  <p className="mt-2 flex flex-wrap gap-2">
                    <a className="btn-prev" target="_blank" rel="noopener" href={linkGerador({ ...base, aba: "apostila" })}>
                      <BookOpen className="h-3.5 w-3.5" /> Apostila + lista A4
                    </a>
                    <a className="btn-prev" target="_blank" rel="noopener" href={linkGerador({ ...base, aba: "plano" })}>
                      <ClipboardList className="h-3.5 w-3.5" /> Plano de aula
                    </a>
                  </p>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-[11.5px] text-indigo-800">A lista A4 de 1 página sai pelo botão de PDF da apostila gerada.</p>
        </>
      )}
    </div>
  );
}
