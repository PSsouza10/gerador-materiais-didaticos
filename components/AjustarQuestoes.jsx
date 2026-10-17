"use client";
import React, { useState } from "react";
import { RefreshCw, Pencil, Loader2, Check, X, AlertTriangle } from "lucide-react";
import { conferirEdicao } from "@/lib/avaliacao";

// Ajustar a prova sem gerar tudo de novo:
// - "Trocar": a IA escreve outra questão (mesma habilidade e nível), conferida como as demais;
// - "Editar": o professor corrige o texto à mão; o sistema confere a conta e avisa se algo não bate.
const LETRAS = ["A", "B", "C", "D"];
const NIVEL = { facil: "fácil", media: "média", dificil: "difícil" };

export default function AjustarQuestoes({ avaliacao, aoMudar }) {
  const [trocando, setTrocando] = useState(null);
  const [editando, setEditando] = useState(null); // { i, item }
  const [msg, setMsg] = useState(null); // { tipo, texto }

  const substituir = (i, item, avisos = []) => {
    const itens = avaliacao.itens.map((x, k) => (k === i ? item : x));
    aoMudar({ ...avaliacao, itens }, i, avisos);
  };

  async function trocar(i) {
    setMsg(null);
    setTrocando(i);
    try {
      const r = await fetch("/api/trocar-questao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avaliacao, indice: i }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Não foi possível trocar a questão (erro ${r.status}).`);
      substituir(i, j.item);
      setMsg({ tipo: "ok", texto: `Questão ${i + 1} trocada. A nova passou pela mesma conferência das outras.` });
    } catch (e) {
      setMsg({ tipo: "erro", texto: e instanceof TypeError ? "Sem conexão com o servidor." : e.message });
    } finally {
      setTrocando(null);
    }
  }

  const abrirEdicao = (i) => {
    const it = avaliacao.itens[i];
    setEditando({ i, item: { ...it, alternativas: [...it.alternativas] } });
    setMsg(null);
  };
  const campo = (k) => (e) => setEditando((x) => ({ ...x, item: { ...x.item, [k]: e.target.value } }));
  const alt = (k) => (e) => setEditando((x) => ({ ...x, item: { ...x.item, alternativas: x.item.alternativas.map((a, j) => (j === k ? e.target.value : a)) } }));
  const salvarEdicao = () => {
    const { i, item } = editando;
    const r = conferirEdicao({ ...item, editada: true }, i + 1);
    const { problemas, ...limpo } = r.item;
    substituir(i, limpo, r.avisos);
    setEditando(null);
    const graves = r.avisos.filter((a) => a.tipo === "erro");
    setMsg(graves.length ? { tipo: "erro", texto: `Questão ${i + 1} salva, mas confira: ${graves.map((a) => a.motivo).join(" ")}` } : { tipo: "ok", texto: `Questão ${i + 1} salva. A conta e o gabarito conferem.` });
  };

  return (
    <details className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px]">
      <summary className="cursor-pointer font-bold text-slate-800">Ajustar questões (trocar ou editar)</summary>
      <p className="mt-1 text-slate-600">Trocar pede à IA outra questão da mesma habilidade e nível, conferida como as demais (até 3 trocas por avaliação gerada no mês). Editar muda o texto à mão.</p>
      {msg && (
        <p className={`mt-2 rounded-lg px-2 py-1.5 font-semibold ${msg.tipo === "ok" ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
          {msg.tipo === "erro" && <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />}
          {msg.texto}
        </p>
      )}
      <ol className="mt-2 divide-y divide-slate-100">
        {avaliacao.itens.map((it, i) =>
          editando?.i === i ? (
            <li key={i} className="space-y-2 py-2">
              <p className="font-bold text-slate-800">Editando a questão {i + 1}</p>
              <label className="block">
                <span className="text-[11.5px] font-bold text-slate-600">Texto-base</span>
                <textarea value={editando.item.textoBase || ""} onChange={campo("textoBase")} rows={3} className="w-full rounded-lg border border-slate-300 px-2 py-1" />
              </label>
              <label className="block">
                <span className="text-[11.5px] font-bold text-slate-600">Comando</span>
                <textarea value={editando.item.comando || ""} onChange={campo("comando")} rows={2} className="w-full rounded-lg border border-slate-300 px-2 py-1" />
              </label>
              <fieldset className="space-y-1">
                <legend className="text-[11.5px] font-bold text-slate-600">Alternativas (marque a correta)</legend>
                {editando.item.alternativas.map((a, k) => (
                  <label key={k} className="flex items-center gap-2">
                    <input type="radio" name={`correta-${i}`} checked={editando.item.correta === LETRAS[k]} onChange={() => setEditando((x) => ({ ...x, item: { ...x.item, correta: LETRAS[k] } }))} aria-label={`Alternativa ${LETRAS[k]} é a correta`} />
                    <b className="w-4">{LETRAS[k]}</b>
                    <input value={a} onChange={alt(k)} className="flex-1 rounded-lg border border-slate-300 px-2 py-1" />
                  </label>
                ))}
              </fieldset>
              <label className="block">
                <span className="text-[11.5px] font-bold text-slate-600">Resolução (versão do professor)</span>
                <textarea value={editando.item.resolucao || ""} onChange={campo("resolucao")} rows={2} className="w-full rounded-lg border border-slate-300 px-2 py-1" />
              </label>
              {editando.item.figura && <p className="text-[11.5px] text-slate-500">A figura continua a mesma; se mudar medidas no texto, confira se combinam com ela.</p>}
              <div className="flex gap-2">
                <button type="button" onClick={salvarEdicao} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white">
                  <Check className="h-3.5 w-3.5" /> Salvar
                </button>
                <button type="button" onClick={() => setEditando(null)} className="btn-prev">
                  <X className="h-3.5 w-3.5" /> Cancelar
                </button>
              </div>
            </li>
          ) : (
            <li key={i} className="flex items-start gap-2 py-1.5">
              <b className="w-6 flex-none text-slate-700">{String(i + 1).padStart(2, "0")}</b>
              <span className="min-w-0 flex-1 text-slate-700">
                {String(it.comando || "").slice(0, 110)}
                {String(it.comando || "").length > 110 ? "…" : ""}
                <span className="block text-[11px] text-slate-500">
                  {NIVEL[it.dificuldade] || it.dificuldade} · gabarito {it.correta || "—"}
                  {it.figura ? " · com figura" : ""}
                  {it.trocada ? " · trocada" : ""}
                  {it.editada ? " · editada" : ""}
                </span>
              </span>
              <button type="button" onClick={() => trocar(i)} disabled={trocando !== null || !!editando} className="btn-prev" aria-label={`Trocar a questão ${i + 1}`}>
                {trocando === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} {trocando === i ? "Trocando…" : "Trocar"}
              </button>
              <button type="button" onClick={() => abrirEdicao(i)} disabled={trocando !== null || !!editando} className="btn-prev" aria-label={`Editar a questão ${i + 1}`}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            </li>
          )
        )}
      </ol>
    </details>
  );
}
