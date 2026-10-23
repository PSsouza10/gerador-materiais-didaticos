"use client";
import React, { useState } from "react";
import { Share2, Loader2, Copy, Check, LayoutDashboard } from "lucide-react";
import { normalizarEscolas, validarAvaliacaoDoCaderno } from "@/lib/ciclo";

// Coordenador do piloto: transforma a avaliação aberta num CADERNO da rede, com a lista de
// escolas. Os professores abrem pelo link, aplicam, corrigem e enviam o resultado da turma.
export default function DistribuirCaderno({ avaliacao }) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState(avaliacao?.titulo || "");
  const [escolas, setEscolas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [codigo, setCodigo] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const lista = normalizarEscolas(escolas);
  const valida = validarAvaliacaoDoCaderno(avaliacao);
  const link = codigo && typeof window !== "undefined" ? `${window.location.origin}/caderno/${codigo}` : "";

  async function criar() {
    if (!valida.ok) return setErro(valida.erro);
    if (!lista.length) return setErro("Escreva pelo menos uma escola (uma por linha).");
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch("/api/cadernos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titulo, escolas: lista, avaliacao }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Não foi possível criar o caderno (erro ${r.status}).`);
      setCodigo(j.codigo);
    } catch (e) {
      setErro(e instanceof TypeError ? "Sem conexão com o servidor." : e.message);
    } finally {
      setEnviando(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sem permissão: o link fica visível para copiar à mão */
    }
  }

  if (!aberto)
    return (
      <div className="mb-3 rounded-xl border border-roxo/25 bg-roxo-claro px-3 py-2.5 text-[12.5px] text-marinho">
        <p className="font-semibold">Coordenação · Ciclo de Recomposição</p>
        <p className="mt-0.5">Distribua esta avaliação como caderno único para as escolas do piloto e acompanhe o resultado por habilidade.</p>
        <button type="button" onClick={() => setAberto(true)} className="btn-prev mt-2">
          <Share2 className="h-3.5 w-3.5" /> Distribuir para as escolas
        </button>
      </div>
    );

  return (
    <div className="mb-3 rounded-xl border border-roxo/25 bg-roxo-claro px-3 py-3 text-[12.5px] text-marinho">
      <p className="font-bold">Distribuir como caderno da rede</p>
      {codigo ? (
        <div className="mt-2 space-y-2">
          <p>
            Caderno criado. Código <b className="font-mono text-[14px]">{codigo}</b>. Mande este link aos professores: eles entram com a conta Google, adicionam o
            caderno, aplicam, corrigem e enviam o resultado da turma.
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-white px-2 py-1 text-[12px]">{link}</code>
            <button type="button" onClick={copiar} className="btn-prev">
              {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copiado ? "Copiado" : "Copiar link"}
            </button>
            <a href={`/caderno/${codigo}/painel`} className="btn-prev">
              <LayoutDashboard className="h-3.5 w-3.5" /> Abrir o painel
            </a>
          </p>
          <p className="text-[11.5px] text-roxo-escuro">Mudanças feitas depois nesta avaliação não vão para o caderno. Para mudar, distribua de novo.</p>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold">Nome do caderno</span>
            <input className="ipt" value={titulo} maxLength={140} onChange={(e) => setTitulo(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold">Escolas do piloto (uma por linha)</span>
            <textarea className="ipt min-h-[90px]" value={escolas} onChange={(e) => setEscolas(e.target.value)} placeholder={"EE Exemplo A\nEE Exemplo B"} />
          </label>
          <p className="text-[11.5px] text-roxo-escuro">
            {lista.length} escola(s). O professor escolhe a escola desta lista ao enviar. O painel mostra só números por escola e habilidade, sem nome de aluno; escola com menos
            de 5 alunos não aparece.
          </p>
          {erro && <p className="font-semibold text-rose-700">{erro}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={criar} disabled={enviando} className="btn-prev">
              {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />} Criar caderno
            </button>
            <button type="button" onClick={() => setAberto(false)} className="btn-prev">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
