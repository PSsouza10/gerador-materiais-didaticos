"use client";
import React, { useMemo, useRef, useState } from "react";
import { BookMarked, ExternalLink, Link2, Check, Trash2, Search, Sparkles, Ban, Download, Upload, Loader2 } from "lucide-react";
import { obterNivel } from "@/lib/niveis";
import { rotuloAno } from "@/lib/bncc";
import Privacidade from "@/components/telas/Privacidade";

function BarraBackup({ onExportar, onImportar, total, msg, setMsg }) {
  const arquivo = useRef(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={onExportar} disabled={!total} className="btn-prev">
        <Download className="h-3.5 w-3.5" /> Exportar backup
      </button>
      <button onClick={() => arquivo.current?.click()} className="btn-prev">
        <Upload className="h-3.5 w-3.5" /> Importar backup
      </button>
      <input
        ref={arquivo}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Arquivo de backup do EduGera"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            const n = onImportar(await f.text());
            setMsg(n ? `${n} ${n === 1 ? "material importado" : "materiais importados"}.` : "Nenhum material novo no arquivo.");
          } catch (err) {
            setMsg(err.message || "Não foi possível ler o arquivo.");
          }
        }}
      />
      <span className="text-xs text-slate-600" role="status">
        {msg}
      </span>
    </div>
  );
}

export default function MinhasApostilas({ materiais, onRemover, onRevogar, onExportar, onImportar, irPara }) {
  const [busca, setBusca] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [copiado, setCopiado] = useState(null);
  const [revogando, setRevogando] = useState(null);
  const [erro, setErro] = useState("");
  const [msgBackup, setMsgBackup] = useState("");

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

  const revogar = async (m) => {
    if (!window.confirm(`Revogar o link de "${m.titulo}"? Quem tiver o link não conseguirá mais abrir o material. Não dá para desfazer.`))
      return;
    setErro("");
    setRevogando(m.id);
    try {
      await onRevogar(m);
    } catch (e) {
      setErro(e.message);
    } finally {
      setRevogando(null);
    }
  };

  if (materiais.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <BookMarked className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 text-lg font-bold text-slate-700">Nenhuma apostila por aqui ainda</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            Cada material que você gerar fica guardado com um link de compartilhamento para abrir, imprimir ou enviar a colegas.
          </p>
          <button
            onClick={() => irPara("Gerar Material")}
            className="mx-auto mt-5 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200"
          >
            <Sparkles className="h-4 w-4" /> Gerar o primeiro
          </button>
          <div className="mt-6 flex justify-center">
            <BarraBackup onExportar={onExportar} onImportar={onImportar} total={0} msg={msgBackup} setMsg={setMsgBackup} />
          </div>
        </div>
        <Privacidade compacto />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} className="ipt pl-9" placeholder="Buscar por título, tema ou código BNCC" />
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-600" aria-live="polite">
          {lista.length} de {materiais.length} {materiais.length === 1 ? "material" : "materiais"}
        </p>
        <BarraBackup onExportar={onExportar} onImportar={onImportar} total={materiais.length} msg={msgBackup} setMsg={setMsgBackup} />
      </div>

      {erro && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {erro}
        </p>
      )}

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {lista.map((m) => (
          <li key={m.id} className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${m.revogado ? "border-slate-200 opacity-75" : "border-slate-100"}`}>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">{m.disciplina}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{obterNivel(m.dificuldade).curto}</span>
              {m.ano && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">{rotuloAno(m.ano)}</span>}
              {m.bncc && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-emerald-800">{m.bncc}</span>}
              {m.revogado && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">link revogado</span>}
            </div>
            <h2 className="mt-2 text-base font-extrabold leading-snug text-slate-800">{m.titulo}</h2>
            <p className="mt-0.5 text-xs text-slate-600">
              {m.tema} · {m.nivel} · {new Date(m.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {!m.revogado && (
                <>
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="btn-prev">
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir
                  </a>
                  <button onClick={() => copiar(m)} className="btn-prev">
                    {copiado === m.id ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                    {copiado === m.id ? "Copiado!" : "Copiar link"}
                  </button>
                  {m.chave && (
                    <button onClick={() => revogar(m)} disabled={revogando === m.id} className="btn-prev !text-rose-700" title="Apaga o material do servidor; o link deixa de funcionar">
                      {revogando === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                      Revogar link
                    </button>
                  )}
                </>
              )}
              <button onClick={() => onRemover(m.id)} className="btn-prev ml-auto !text-slate-700" title="Tira só desta lista; o link continua funcionando">
                <Trash2 className="h-3.5 w-3.5" /> Tirar da lista
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Privacidade compacto />
    </div>
  );
}
