"use client";
import React, { forwardRef } from "react";
import { bnccDoMaterial, linhaEtapa } from "@/lib/material";
import FiguraDidatica from "@/components/FiguraDidatica";
import Tx from "@/components/Tx";

const ListaExerciciosUmaPagina = forwardRef(function ListaExerciciosUmaPagina({ form, material }, ref) {
  const exercicios = Array.isArray(material?.exercicios) ? material.exercicios : [];
  const bncc = bnccDoMaterial(form, material || {});

  return (
    <article ref={ref} className="folha-a4 lista-exercicios-uma-pagina bg-white font-sans text-slate-800" aria-label="Lista de exercícios compacta">
      <header className="lista-uma-cabecalho">
        <div className="lista-uma-identificacao">
          <strong>{form.professor || "Professor(a)"}</strong>
          <span>{[form.escola, linhaEtapa(form), form.disciplina].filter(Boolean).join(" · ")}</span>
        </div>
        <div className="lista-uma-aluno">
          <span>Nome: _______________________________________</span>
          <span>Turma: _______________</span>
          <span>Data: ____/____/______</span>
        </div>
      </header>

      <h1 className="lista-uma-titulo">{material?.tituloDidatico || form.tema || "Lista de exercícios"}</h1>
      {bncc && (
        <p className="lista-uma-bncc">
          <strong>{bncc.verificada ? `BNCC ${bncc.codigo}` : `Habilidade · ${bncc.codigo}`}</strong>
          {bncc.texto ? ` — ${bncc.texto}` : ""}
        </p>
      )}
      <div className="lista-uma-legenda">{form.disciplina} · {linhaEtapa(form)} · {exercicios.length} exercícios</div>

      <ol className="lista-uma-exercicios">
        {exercicios.map((ex, i) => (
          <li key={ex.id || i} className="lista-uma-item">
            <div className="lista-uma-enunciado">
              <span className="lista-uma-numero">{i + 1}.</span>
              <span><Tx>{ex.enunciado}</Tx></span>
            </div>
            {ex.figura && <div className="lista-uma-figura"><FiguraDidatica figura={ex.figura} /></div>}
            {Array.isArray(ex.alternativas) && ex.alternativas.length > 0 ? (
              <ul className="lista-uma-alternativas">
                {ex.alternativas.map((alternativa, j) => <li key={j}><Tx>{alternativa}</Tx></li>)}
              </ul>
            ) : (
              <div className="lista-uma-resposta" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>

      <footer className="lista-uma-rodape">EduGera · Lista de exercícios para impressão</footer>
    </article>
  );
});

export default ListaExerciciosUmaPagina;
