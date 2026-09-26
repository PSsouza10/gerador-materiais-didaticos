"use client";
import React, { useRef, useState } from "react";
import { Download, Printer, Loader2, GraduationCap, KeyRound } from "lucide-react";
import FolhaA4 from "@/components/FolhaA4";
import PreviewEscalado from "@/components/PreviewEscalado";
import { exportarPdf } from "@/lib/pdf";
import { slugify } from "@/lib/material";

export default function MaterialCompartilhado({ dados }) {
  const folhaRef = useRef(null);
  const [baixando, setBaixando] = useState(false);
  const [gabarito, setGabarito] = useState(false);
  const { form, material, urlImagem } = dados;

  const baixar = async () => {
    setBaixando(true);
    try {
      await exportarPdf(folhaRef.current, `apostila-${slugify(form.tema) || "material"}.pdf`);
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F5FB] px-4 py-6 font-sans text-slate-700">
      <div className="nao-imprimir mx-auto mb-4 flex max-w-[794px] flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-400">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-extrabold text-slate-800">EduGera</p>
            <p className="text-[11px] text-slate-400">Material compartilhado</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {material.exercicios?.length > 0 && (
            <button onClick={() => setGabarito((g) => !g)} className="botao-sec">
              <KeyRound className="h-3.5 w-3.5" /> {gabarito ? "Ocultar gabarito" : "Gabarito"}
            </button>
          )}
          <button onClick={() => window.print()} className="botao-sec">
            <Printer className="h-3.5 w-3.5" /> Imprimir
          </button>
          <button onClick={baixar} disabled={baixando} className="botao-sec">
            {baixando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {baixando ? "Gerando..." : "Baixar PDF"}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[794px]">
        <PreviewEscalado>
          <FolhaA4 ref={folhaRef} form={form} material={material} urlImagem={urlImagem} mostrarGabarito={gabarito} />
        </PreviewEscalado>
      </div>

      <style>{`
        .botao-sec{display:inline-flex;align-items:center;gap:.375rem;border-radius:.6rem;background:#fff;
          padding:.45rem .8rem;font-size:.75rem;font-weight:700;color:#4f46e5;box-shadow:0 1px 2px rgba(0,0,0,.05);
          outline:1px solid #e0e7ff;transition:all .15s}
        .botao-sec:hover{background:#eef2ff}
        .botao-sec:disabled{opacity:.6;cursor:not-allowed}
      `}</style>
    </div>
  );
}
