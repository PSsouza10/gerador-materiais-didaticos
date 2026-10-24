"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { contarPalavras, linhasEstimadas, avisoLinhas, PERFIS_REDACAO, LINHAS_PADRAO, LAUDAS_GRATIS, LINHAS_POR_LAUDA, AVISO_IA } from "@/lib/redacao";

// Correção por IA (spec, seção 4). O texto vem colado/digitado ou do construtor (localStorage).
const CHAVE_PARA_CORRIGIR = "edugera.redacao.paraCorrigir";
const virgula = (n) => String(n).replace(".", ",");

export default function Corretor({ idSalvo = null }) {
  const [texto, setTexto] = useState("");
  const [tema, setTema] = useState("");
  const [perfil, setPerfil] = useState("concurso");
  const [limites, setLimites] = useState(LINHAS_PADRAO);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (idSalvo) {
      fetch(`/api/redacao/${idSalvo}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((r) => {
          setTexto(r.texto);
          setTema(r.tema);
          setPerfil(r.perfil);
          setResultado(r.resultado);
        })
        .catch(() => setErro({ texto: "Não foi possível abrir esta redação." }));
      return;
    }
    try {
      const v = JSON.parse(window.localStorage.getItem(CHAVE_PARA_CORRIGIR) || "null");
      if (v?.texto) {
        setTexto(v.texto);
        setTema(v.tema || "");
        if (v.minLinhas && v.maxLinhas) setLimites({ minLinhas: v.minLinhas, maxLinhas: v.maxLinhas });
        window.localStorage.removeItem(CHAVE_PARA_CORRIGIR);
      }
    } catch {
      /* sem armazenamento */
    }
  }, [idSalvo]);

  const palavras = contarPalavras(texto);
  const linhas = linhasEstimadas(palavras);
  const aviso = texto ? avisoLinhas(linhas, limites) : "";

  async function corrigir() {
    setEnviando(true);
    setErro(null);
    setResultado(null);
    try {
      const r = await fetch("/api/redacao/corrigir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, tema, bancaPerfil: perfil, ...limites }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErro({ texto: j.error || "Não foi possível corrigir agora.", pro: j.motivo === "recurso_pro" || j.limiteAtingido });
      else setResultado(j.resultado);
    } catch {
      setErro({ texto: "Sem conexão. Tente de novo." });
    }
    setEnviando(false);
  }

  return (
    <div className="mt-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <input value={tema} onChange={(e) => setTema(e.target.value)} maxLength={300} placeholder="Tema da proposta (opcional)" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" aria-label="Tema" />
        <select value={perfil} onChange={(e) => setPerfil(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" aria-label="Perfil da banca">
          {Object.entries(PERFIS_REDACAO).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={14} placeholder="Cole ou digite a redação aqui." className="mt-3 w-full rounded-xl border border-slate-300 p-3 text-[15px] leading-relaxed" aria-label="Texto da redação" />
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-700">
        <span>
          {palavras} palavras · cerca de {linhas} linhas · limite
        </span>
        <input type="number" min={1} max={120} value={limites.minLinhas} onChange={(e) => setLimites((l) => ({ ...l, minLinhas: Number(e.target.value) || 1 }))} className="w-16 rounded-lg border border-slate-300 px-2 py-1" aria-label="Mínimo de linhas" />
        <span>a</span>
        <input type="number" min={1} max={120} value={limites.maxLinhas} onChange={(e) => setLimites((l) => ({ ...l, maxLinhas: Number(e.target.value) || 1 }))} className="w-16 rounded-lg border border-slate-300 px-2 py-1" aria-label="Máximo de linhas" />
      </div>
      {aviso && <p className="mt-2 text-sm font-semibold text-amber-800">{aviso}</p>}
      <p className="mt-2 text-xs text-slate-500">
        Grátis: 1 correção por mês, até {LAUDAS_GRATIS} laudas (cerca de {LAUDAS_GRATIS * LINHAS_POR_LAUDA} linhas). O texto fica só no seu histórico e pode ser apagado.
      </p>
      <button type="button" onClick={corrigir} disabled={enviando || palavras < 30} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
        {enviando && <Loader2 className="h-4 w-4 animate-spin" />} {enviando ? "Corrigindo..." : "Corrigir com IA"}
      </button>
      {erro && (
        <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">
          {erro.texto}{" "}
          {erro.pro && (
            <a href="/planos" className="underline">
              Ver o Pro
            </a>
          )}
        </div>
      )}
      {resultado && <Resultado r={resultado} />}
    </div>
  );
}

function Resultado({ r }) {
  const p = r.propostaIntervencao;
  return (
    <div className="mt-8 border-t border-slate-100 pt-6" data-testid="resultado-redacao">
      <p className="text-3xl font-extrabold text-slate-900">
        {virgula(r.notaTotal)} <span className="text-lg font-semibold text-slate-500">/ {r.notaMaxima}</span>
      </p>
      <p className="mt-1 text-sm font-semibold text-amber-800">{r.aviso || AVISO_IA}</p>
      <p className="mt-1 text-sm text-slate-600">
        {r.palavras} palavras · cerca de {r.linhasEstimadas} linhas {r.dentroDoLimite ? "(dentro do limite)" : "(fora do limite)"}
      </p>

      <h2 className="mt-6 font-bold text-slate-900">Nota por critério</h2>
      <ul className="mt-2 space-y-2">
        {r.criterios.map((c) => (
          <li key={c.id} className="rounded-xl border border-slate-200 p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <b className="text-slate-900">{c.nome}</b>
              <span className={`shrink-0 font-bold ${c.nota === 0 ? "text-rose-700" : "text-slate-900"}`}>
                {virgula(c.nota)} / {virgula(c.max)}
              </span>
            </div>
            <p className="mt-1 text-slate-700">{c.justificativa}</p>
          </li>
        ))}
      </ul>

      <h2 className="mt-6 font-bold text-slate-900">Proposta de intervenção</h2>
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        {[
          ["agente", "Agente"],
          ["acao", "Ação"],
          ["meio", "Meio"],
          ["finalidade", "Finalidade"],
        ].map(([k, nome]) => (
          <span key={k} className={`rounded-full px-3 py-1 font-semibold ${p[k] ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
            {p[k] ? "✓" : "✗"} {nome}
          </span>
        ))}
      </div>
      {p.comentario && <p className="mt-2 text-sm text-slate-700">{p.comentario}</p>}

      {r.errosPortugues.length > 0 && (
        <>
          <h2 className="mt-6 font-bold text-slate-900">Erros de português</h2>
          <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Trecho</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Correção</th>
                </tr>
              </thead>
              <tbody>
                {r.errosPortugues.map((e, i) => (
                  <tr key={i} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2 text-rose-800">{e.trecho}</td>
                    <td className="px-3 py-2 text-slate-600">{e.tipo}</td>
                    <td className="px-3 py-2 text-emerald-800">{e.correcao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {r.trechosReescritos.length > 0 && (
        <>
          <h2 className="mt-6 font-bold text-slate-900">Trechos reescritos</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {r.trechosReescritos.map((t, i) => (
              <li key={i} className="rounded-xl border border-slate-200 p-3">
                <p className="text-slate-500 line-through">{t.original}</p>
                <p className="mt-1 font-semibold text-slate-900">{t.reescrito}</p>
                <p className="mt-1 text-slate-600">{t.porque}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {r.proximoPasso && (
        <p className="mt-6 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-950">
          <b>Próximo passo:</b> {r.proximoPasso}
        </p>
      )}
      <a href="/redacao" className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:underline">
        Minhas redações
      </a>
    </div>
  );
}
