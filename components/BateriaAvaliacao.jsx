"use client";
import React, { useRef, useState } from "react";
import { CASOS_AVALIACAO, auditarAvaliacao, resumirBateriaAvaliacao } from "@/lib/bateriaAvaliacao";
import { rotuloAno } from "@/lib/bncc";
import { completarAvaliacao } from "@/lib/completarCliente";

// Bateria da Avaliação: gera as provas dos 7 casos, uma por vez, e confere cada uma.
// Publicar só quando TODAS passam: zero questão sem gabarito e zero explicação com conta errada.
export default function BateriaAvaliacao({ admin }) {
  const [res, setRes] = useState({});
  const [rodando, setRodando] = useState(false);
  const [aberto, setAberto] = useState(null);
  const [modelo, setModelo] = useState(""); // "" = padrão do site (por disciplina)
  const [historico, setHistorico] = useState([]); // comparação entre modelos, nesta tela
  const parar = useRef(false);

  async function rodarCaso(i) {
    const c = CASOS_AVALIACAO[i];
    const inicio = Date.now();
    setRes((r) => ({ ...r, [i]: { estado: "gerando" } }));
    try {
      const r = await fetch("/api/gerar-avaliacao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(modelo ? { ...c, modelo } : c) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      // como na tela do professor: completa as que faltaram por tempo
      if (j.completar?.faltam) j.avaliacao = (await completarAvaliacao(j.avaliacao, j.completar)).avaliacao;
      const pronto = { estado: "pronto", avaliacao: j.avaliacao, avisosServidor: j.avisos || [], diagnostico: j.diagnostico || null, auditoria: auditarAvaliacao(j.avaliacao, c.itens), segundos: Math.round((Date.now() - inicio) / 1000) };
      setRes((x) => ({ ...x, [i]: pronto }));
      return pronto;
    } catch (e) {
      const erro = { estado: "erro", erro: String(e.message || e) };
      setRes((x) => ({ ...x, [i]: erro }));
      return erro;
    }
  }
  async function rodar() {
    parar.current = false;
    setRodando(true);
    setRes({});
    const feitos = [];
    for (let i = 0; i < CASOS_AVALIACAO.length && !parar.current; i++) feitos.push({ caso: CASOS_AVALIACAO[i], ...(await rodarCaso(i)) });
    const usado = feitos.find((f) => f.diagnostico?.modelo)?.diagnostico.modelo;
    setHistorico((h) => [...h, { modelo: modelo || `padrão${usado ? ` (${usado})` : ""}`, resumo: resumirBateriaAvaliacao(feitos), casos: feitos.map((f) => (f.estado === "pronto" ? `${f.auditoria.questoes}${f.auditoria.aprovado ? "✓" : "✗"}` : "erro")), segundos: feitos.reduce((s, f) => s + (f.segundos || 0), 0) }]);
    setRodando(false);
  }
  const lista = CASOS_AVALIACAO.map((c, i) => ({ caso: c, ...(res[i] || {}) }));
  const resumo = resumirBateriaAvaliacao(lista);
  const baixar = () => {
    const blob = new Blob([JSON.stringify({ app: "EduGera", tipo: "bateria-avaliacao", geradoEm: new Date().toISOString(), resumo, casos: lista }, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bateria-avaliacao-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <section className="mx-auto mt-10 max-w-5xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-extrabold text-slate-800">Bateria da Avaliação (Prova Paulista)</h2>
      <p className="mt-1 text-sm text-slate-600">
        {CASOS_AVALIACAO.length} provas: 7 de 5 questões (5 de Matemática com figura e 2 de outras disciplinas) e 1 diagnóstica de 10 questões do 7º ano (uma habilidade por questão). Cada uma usa 1 geração. Critério para publicar: nenhuma questão sem gabarito e nenhuma explicação com conta errada.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-sm text-slate-700">
          Modelo da IA:{" "}
          <select value={modelo} onChange={(e) => setModelo(e.target.value)} disabled={rodando} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Padrão do site</option>
            <option value="gpt-4o">gpt-4o (atual)</option>
            <option value="o4-mini">o4-mini (raciocínio)</option>
            <option value="gpt-5-mini">gpt-5-mini (raciocínio)</option>
            <option value="gpt-5">gpt-5 (raciocínio)</option>
          </select>
        </label>
        <button type="button" onClick={rodar} disabled={rodando || !admin} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
          {rodando ? "Rodando…" : "Rodar a bateria da Avaliação"}
        </button>
        {rodando && (
          <button type="button" onClick={() => (parar.current = true)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">
            Parar depois desta
          </button>
        )}
        {resumo.casos > 0 && (
          <button type="button" onClick={baixar} className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700">
            Baixar relatório (JSON)
          </button>
        )}
        {!admin && <p className="text-sm text-amber-800">Só administradores podem rodar a bateria.</p>}
      </div>
      {resumo.casos > 0 && (
        <p className={`mt-4 rounded-xl px-4 py-3 text-sm font-bold ${resumo.liberado && resumo.casos === CASOS_AVALIACAO.length ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
          {resumo.aprovados} de {resumo.casos} provas aprovadas · {resumo.semGabarito} questão(ões) sem gabarito · {resumo.contasErradas} explicação(ões) com conta errada ·{" "}
          {resumo.liberado && resumo.casos === CASOS_AVALIACAO.length ? "LIBERADO para publicar" : "NÃO publicar ainda"}
        </p>
      )}
      {historico.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <p className="text-sm font-bold text-slate-700">Comparação entre modelos (rodadas desta tela)</p>
          <table className="mt-1 w-full text-left text-[12.5px]">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1">Modelo</th>
                <th>Aprovadas</th>
                <th>Sem gabarito</th>
                <th>Conta errada</th>
                {CASOS_AVALIACAO.map((c, k) => (
                  <th key={k} title={c.tema}>
                    {k + 1}
                  </th>
                ))}
                <th>Tempo</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((h, k) => (
                <tr key={k} className="border-t border-slate-100">
                  <td className="py-1 font-bold">{h.modelo}</td>
                  <td>
                    {h.resumo.aprovados}/{CASOS_AVALIACAO.length}
                  </td>
                  <td>{h.resumo.semGabarito}</td>
                  <td>{h.resumo.contasErradas}</td>
                  {CASOS_AVALIACAO.map((_, n) => (
                    <td key={n}>{h.casos[n] || "—"}</td>
                  ))}
                  <td>{Math.round(h.segundos / 60)} min</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-[12px] text-slate-500">Nas colunas 1 a {CASOS_AVALIACAO.length}: número de questões que chegaram e ✓ aprovada / ✗ reprovada.</p>
        </div>
      )}
      <table className="mt-4 w-full text-left text-[13px]">
        <thead className="text-slate-500">
          <tr>
            <th className="py-1">Tema</th>
            <th>Questões</th>
            <th>Com figura</th>
            <th>Refeitas</th>
            <th>Retiradas</th>
            <th>Sem gabarito</th>
            <th>Conta errada</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((r, i) => (
            <React.Fragment key={i}>
              <tr className="border-t border-slate-100">
                <td className="py-1.5">
                  <b>{r.caso.disciplina}</b> · {rotuloAno(r.caso.ano)} · {r.caso.tema}
                </td>
                {r.estado === "pronto" ? (
                  <>
                    <td>{r.auditoria.questoes}</td>
                    <td>{r.auditoria.comFigura}</td>
                    <td>{r.auditoria.refeitas}</td>
                    <td className={r.auditoria.retiradas ? "font-bold text-amber-700" : ""}>{r.auditoria.retiradas}</td>
                    <td className={r.auditoria.semGabarito.length ? "font-bold text-rose-700" : ""}>{r.auditoria.semGabarito.length ? r.auditoria.semGabarito.join(", ") : "0"}</td>
                    <td className={r.auditoria.contasErradas.length ? "font-bold text-rose-700" : ""}>{r.auditoria.contasErradas.length}</td>
                    <td>
                      <button type="button" onClick={() => setAberto(aberto === i ? null : i)} className={`rounded-md px-2 py-0.5 text-[12px] font-bold ${r.auditoria.aprovado ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                        {r.auditoria.aprovado ? "Aprovada" : "Reprovada"} · {r.segundos}s
                      </button>
                    </td>
                  </>
                ) : (
                  <td colSpan={7} className="text-slate-500">
                    {r.estado === "gerando" ? "gerando…" : r.estado === "erro" ? <span className="text-rose-700">erro: {r.erro}</span> : "—"}
                  </td>
                )}
              </tr>
              {aberto === i && r.auditoria && (
                <tr>
                  <td colSpan={8} className="bg-slate-50 px-3 py-2 text-[12.5px]">
                    {(r.auditoria.diagnostico || r.auditoria.situacoesParecidas > 0) && (
                      <p className="mb-2">
                        {r.auditoria.diagnostico && (
                          <>
                            Habilidades repetidas: <b>{r.auditoria.habilidadesRepetidas}</b> · unidades cobertas: <b>{r.auditoria.unidades.join(", ") || "—"}</b> ·{" "}
                          </>
                        )}
                        Situações parecidas: <b>{r.auditoria.situacoesParecidas}</b>
                      </p>
                    )}
                    {[...r.auditoria.contasErradas, ...r.auditoria.outros].length ? (
                      <ul className="list-disc pl-5">
                        {[...r.auditoria.contasErradas, ...r.auditoria.outros].map((a, k) => (
                          <li key={k}>
                            <b>{a.onde}:</b> {a.motivo}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "Nenhum aviso."
                    )}
                    <ol className="mt-2 list-decimal pl-5 text-slate-700">
                      {r.avaliacao.itens.map((it, k) => (
                        <li key={k}>
                          {(it.habilidades?.[0] || it.habilidade)?.codigo ? `[${(it.habilidades?.[0] || it.habilidade).codigo}] ` : ""}
                          {it.comando} → <b>{it.correta || "SEM GABARITO"}</b> {it.correta ? `(${it.alternativas["ABCD".indexOf(it.correta)]})` : ""}
                          {it.figura ? ` · figura: ${it.figura.tipo}` : ""}
                        </li>
                      ))}
                    </ol>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </section>
  );
}
