"use client";
import { useEffect, useState } from "react";
import { ETAPAS_REDACAO, CHECKLIST_REDACAO } from "@/lib/redacaoEtapas";
import { contarPalavras, situacaoEtapa, montarRedacao, LINHAS_PADRAO } from "@/lib/redacao";

// Construtor guiado (spec, seção 3): 9 etapas com dica e campo livre; rascunho no aparelho.
const CHAVE_RASCUNHO = "edugera.redacao.rascunho";
const CHAVE_PARA_CORRIGIR = "edugera.redacao.paraCorrigir";

const ler = (chave) => {
  try {
    return JSON.parse(window.localStorage.getItem(chave) || "null");
  } catch {
    return null;
  }
};
const gravar = (chave, valor) => {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* sem armazenamento: segue só em memória */
  }
};

const COR = { curta: "text-amber-700", ok: "text-emerald-700", longa: "text-rose-700" };

export default function Construtor() {
  const [respostas, setRespostas] = useState({});
  const [passo, setPasso] = useState(0);
  const [limites, setLimites] = useState(LINHAS_PADRAO);
  const [carregou, setCarregou] = useState(false);
  const total = ETAPAS_REDACAO.length;
  const noResultado = passo >= total;

  useEffect(() => {
    const r = ler(CHAVE_RASCUNHO);
    if (r?.respostas) setRespostas(r.respostas);
    if (Number.isInteger(r?.passo)) setPasso(Math.min(Math.max(r.passo, 0), total));
    if (r?.limites) setLimites(r.limites);
    setCarregou(true);
  }, [total]);
  useEffect(() => {
    if (carregou) gravar(CHAVE_RASCUNHO, { respostas, passo, limites });
  }, [respostas, passo, limites, carregou]);

  const etapa = ETAPAS_REDACAO[passo];
  const montado = montarRedacao(respostas, limites);

  function corrigir() {
    gravar(CHAVE_PARA_CORRIGIR, { texto: montado.texto, tema: montado.tema, ...limites });
    window.location.href = "/redacao/corrigir";
  }
  function recomecar() {
    if (!window.confirm("Apagar o rascunho e começar de novo?")) return;
    setRespostas({});
    setPasso(0);
  }

  if (noResultado)
    return (
      <div className="mt-6">
        <h2 className="text-lg font-bold text-slate-900">{montado.tema || "Sua redação"}</h2>
        <div className="mt-3 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[15px] leading-relaxed text-slate-900" data-testid="texto-montado">
          {montado.paragrafos.map((p, i) => (p ? <p key={i} className="indent-8">{p}</p> : null))}
        </div>
        <p className="mt-3 text-sm text-slate-700">
          <b>{montado.palavras}</b> palavras · cerca de <b>{montado.linhas}</b> linhas
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-700">
          <span>Limite da banca:</span>
          <input type="number" min={1} max={120} value={limites.minLinhas} onChange={(e) => setLimites((l) => ({ ...l, minLinhas: Number(e.target.value) || 1 }))} className="w-16 rounded-lg border border-slate-300 px-2 py-1" aria-label="Mínimo de linhas" />
          <span>a</span>
          <input type="number" min={1} max={120} value={limites.maxLinhas} onChange={(e) => setLimites((l) => ({ ...l, maxLinhas: Number(e.target.value) || 1 }))} className="w-16 rounded-lg border border-slate-300 px-2 py-1" aria-label="Máximo de linhas" />
          <span>linhas</span>
        </div>
        {montado.aviso && <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{montado.aviso}</p>}
        <h3 className="mt-5 font-bold text-slate-900">Antes de entregar, confira</h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {CHECKLIST_REDACAO.map((c) => (
            <li key={c}>
              <label className="flex gap-2">
                <input type="checkbox" className="mt-1" /> {c}
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => setPasso(total - 1)} className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-800">
            Voltar
          </button>
          <button type="button" onClick={corrigir} disabled={!montado.texto} className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            Corrigir com IA
          </button>
          <button type="button" onClick={recomecar} className="ml-auto text-sm font-semibold text-slate-500 hover:underline">
            Recomeçar
          </button>
        </div>
      </div>
    );

  const valor = respostas[etapa.id] || "";
  const n = contarPalavras(valor);
  const sit = situacaoEtapa(etapa, valor);
  return (
    <div className="mt-6">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-indigo-500" style={{ width: `${(passo / total) * 100}%` }} />
      </div>
      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">
        Etapa {passo + 1} de {total}
      </p>
      <h2 className="mt-1 text-lg font-bold text-slate-900">{etapa.titulo}</h2>
      <p className="mt-1 text-sm text-slate-600">{etapa.dica}</p>
      <textarea
        key={etapa.id}
        value={valor}
        onChange={(e) => setRespostas((r) => ({ ...r, [etapa.id]: e.target.value }))}
        rows={etapa.id === "tema" ? 2 : 5}
        className="mt-3 w-full rounded-xl border border-slate-300 p-3 text-[15px] focus:border-indigo-400 focus:outline-none"
        aria-label={etapa.titulo}
        autoFocus
      />
      <p className={`mt-1 text-sm font-semibold ${COR[sit]}`}>
        {n} palavra{n === 1 ? "" : "s"} · recomendado de {etapa.min} a {etapa.max}
        {sit === "curta" && " (curto)"}
        {sit === "longa" && " (longo)"}
      </p>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => setPasso((p) => Math.max(0, p - 1))} disabled={passo === 0} className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-800 disabled:opacity-40">
          Voltar
        </button>
        <button type="button" onClick={() => setPasso((p) => p + 1)} className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">
          {passo === total - 1 ? "Ver redação" : "Próxima"}
        </button>
      </div>
    </div>
  );
}
