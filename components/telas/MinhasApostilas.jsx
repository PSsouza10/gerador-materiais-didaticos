"use client";
import React, { useMemo, useState } from "react";
import { BookMarked, ExternalLink, Link2, Check, Trash2, Search, Sparkles } from "lucide-react";
import { obterNivel } from "@/lib/niveis";

export default function MinhasApostilas({ materiais, onRemover, irPara }) {
  const [busca, setBusca] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [copiado, setCopiado] = useState(null);

  const disciplinas = useMemo(() => [...new Set(materiais.map((m) => m.disciplina))].sort(), [materiais]);
  const q = busca.trim().toLowerCase();
  const lista = materiais.filter(
    (m) =>
      (!disciplina || m.disciplina === disciplina) &&
      (!q || [m.titulo, m.tema, m.bncc].filter(Boolean).some((t) => t.toLowerCase().includes(q)))
  );

  const copiar = async (m) => {
    try {
      await navigator.clipboard.writeText(m.url);
    } catch {
      window.prompt("Copie o link:", m.url);
    }
    setCopiado(m.id);
    setTimeout(() => setCopiado((c) => (c === m.id ? null : c)), 2000);
  };

  if (materiais.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm">
        <BookMarked className="mx-auto h-10 w-10 text-slate-300" />
        <h2 className="mt-3 text-lg font-bold text-slate-700">Nenhuma apostila por aqui ainda</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
          Cada material que você gerar fica guardado com um link de compartilhamento para abrir, imprimir ou enviar a colegas.
        </p>
        <button
          onClick={() => irPara("Gerar Material")}
          className="mx-auto mt-5 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200"
        >
          <Sparkles className="h-4 w-4" /> Gerar o primeiro
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="ipt pl-9"
            placeholder="Buscar por título, tema ou código BNCC"
          />
        </label>
        <label className="sm:w-56">
          <span className="sr-only">Disciplina</span>
          <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)} className="ipt">
            <option value="">Todas as disciplinas</option>
            {disciplinas.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-xs text-slate-400" aria-live="polite">
        {lista.length} de {materiais.length} {materiais.length === 1 ? "material" : "materiais"}
      </p>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {lista.map((m) => (
          <li key={m.id} className="flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-600">{m.disciplina}</span>
              <span className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-500">{obterNivel(m.dificuldade).curto}</span>
              {m.bncc && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-emerald-700">{m.bncc}</span>}
            </div>
            <h3 className="mt-2 text-base font-extrabold leading-snug text-slate-800">{m.titulo}</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {m.tema} · {m.nivel} ·{" "}
              {new Date(m.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="btn-prev">
                <ExternalLink className="h-3.5 w-3.5" /> Abrir
              </a>
              <button onClick={() => copiar(m)} className="btn-prev">
                {copiado === m.id ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                {copiado === m.id ? "Copiado!" : "Copiar link"}
              </button>
              <button
                onClick={() => onRemover(m.id)}
                className="btn-prev ml-auto !text-rose-500"
                title="Remove só desta lista; o link continua funcionando"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remover
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
