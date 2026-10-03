"use client";
import React, { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Download, Printer, Loader2, GraduationCap, KeyRound } from "lucide-react";
import FolhaA4 from "@/components/FolhaA4";
import CapaA4 from "@/components/CapaA4";
import PreviewEscalado from "@/components/PreviewEscalado";
import { exportarPdf } from "@/lib/pdf";
import { slugify } from "@/lib/material";
import { normalizarCapa } from "@/lib/opcoes";

export default function MaterialCompartilhado({ dados }) {
  const folhaRef = useRef(null);
  const capaRef = useRef(null);
  const [baixando, setBaixando] = useState(null);
  const [gabarito, setGabarito] = useState(false);
  const [gabaritoForcado, setGabaritoForcado] = useState(null);
  const { form, material, urlImagem } = dados;
  const capa = normalizarCapa(form.capa);
  const temExercicios = material.exercicios?.length > 0;

  const baixar = async (tipo) => {
    setBaixando(tipo);
    flushSync(() => setGabaritoForcado(tipo === "professor"));
    try {
      const base = `apostila-${slugify(form.tema) || "material"}`;
      await exportarPdf(folhaRef.current, `${base}${tipo === "professor" ? "-professor" : ""}.pdf`, {
        capa: capa !== "nenhuma" ? capaRef.current : null,
        titulo: material.tituloDidatico || form.tema,
        assunto: [form.disciplina, form.tema].filter(Boolean).join(" · "),
        autor: form.professor,
      });
    } finally {
      setGabaritoForcado(null);
      setBaixando(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F5FB] px-4 py-6 font-sans text-slate-700">
      <header className="nao-imprimir mx-auto mb-4 flex max-w-[794px] flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-400">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-extrabold text-slate-800">EduGera</p>
            <p className="text-[11px] text-slate-600">Material compartilhado</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {temExercicios && (
            <button type="button" onClick={() => setGabarito((g) => !g)} aria-pressed={gabarito} className="botao-sec">
              <KeyRound className="h-3.5 w-3.5" /> {gabarito ? "Ocultar gabarito" : "Ver gabarito"}
            </button>
          )}
          <button type="button" onClick={() => window.print()} className="botao-sec">
            <Printer className="h-3.5 w-3.5" /> Imprimir
          </button>
          <button type="button" onClick={() => baixar("aluno")} disabled={!!baixando} className="botao-sec">
            {baixando === "aluno" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            PDF do aluno
          </button>
          {temExercicios && (
            <button type="button" onClick={() => baixar("professor")} disabled={!!baixando} className="botao-sec">
              {baixando === "professor" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
              PDF do professor
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[794px]">
        <h1 className="sr-only">{material.tituloDidatico || form.tema}</h1>
        <div className="moldura-impressao" data-tema={material?.tema === "premium" ? "premium" : undefined} aria-hidden="true" />
        <PreviewEscalado>
          <CapaA4 ref={capaRef} variante={capa} form={form} material={material} urlImagem={urlImagem} />
          <FolhaA4
            ref={folhaRef}
            form={form}
            material={material}
            urlImagem={urlImagem}
            mostrarGabarito={gabaritoForcado ?? gabarito}
            imagemNaCapa={capa !== "nenhuma"}
          />
        </PreviewEscalado>
      </main>

      <style>{`
        .botao-sec{display:inline-flex;align-items:center;gap:.375rem;border-radius:.6rem;background:#fff;
          padding:.45rem .8rem;font-size:.75rem;font-weight:700;color:#4f46e5;box-shadow:0 1px 2px rgba(0,0,0,.05);
          outline:1px solid #e0e7ff;transition:all .15s}
        .botao-sec:hover{background:#eef2ff}
        .botao-sec:focus-visible{outline:2px solid #818cf8;outline-offset:2px}
        .botao-sec:disabled{opacity:.6;cursor:not-allowed}
      `}</style>
    </div>
  );
}
