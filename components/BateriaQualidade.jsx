"use client";
import React, { useEffect, useRef, useState } from "react";
import { CASOS_BATERIA } from "@/lib/bateria";
import { auditarMaterial, resumirBateria } from "@/lib/auditoria";
import { lerStreamMaterial } from "@/lib/sse";
import { rotuloAno } from "@/lib/bncc";

// Bateria de qualidade: gera de uma vez apostilas de disciplinas e anos
// variados (só texto, sem ilustração) e confere cada uma com todas as regras
// do EduGera. Só para administradores (cada caso usa uma geração).

const SIMULTANEOS = 1; // a OpenAI limita tokens por minuto; um por vez evita o erro 429
const CUSTO_CASO_USD = 0.02;

const corNota = (n) => (n >= 85 ? "bg-emerald-100 text-emerald-800" : n >= 70 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800");

export default function BateriaQualidade() {
  const [conta, setConta] = useState(null);
  const [marcados, setMarcados] = useState(() => new Set(CASOS_BATERIA.map((_, i) => i)));
  const [resultados, setResultados] = useState({});
  const [rodando, setRodando] = useState(false);
  const [aberto, setAberto] = useState(null);
  const parar = useRef(false);

  useEffect(() => {
    fetch("/api/uso")
      .then((r) => r.json())
      .then(setConta)
      .catch(() => setConta({ usuario: null }));
  }, []);

  const admin = !!conta?.uso?.admin;

  async function rodarCaso(i, tentativa = 0) {
    const c = CASOS_BATERIA[i];
    const inicio = Date.now();
    setResultados((r) => ({ ...r, [i]: { estado: "gerando" } }));
    try {
      const res = await fetch("/api/gerar-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });
      const material = await lerStreamMaterial(res, {});
      if (!material) throw new Error("resposta vazia");
      const auditoria = auditarMaterial(c, material, { questoes: c.questoes });
      setResultados((r) => ({ ...r, [i]: { estado: "pronto", material, auditoria, segundos: Math.round((Date.now() - inicio) / 1000) } }));
    } catch (e) {
      const msg = String(e.message || e);
      // limite por minuto da IA: espera e tenta de novo (até 3 vezes)
      if (/Limite de uso/.test(msg) && tentativa < 3) {
        setResultados((r) => ({ ...r, [i]: { estado: "gerando" } }));
        await new Promise((ok) => setTimeout(ok, 20000));
        return rodarCaso(i, tentativa + 1);
      }
      setResultados((r) => ({ ...r, [i]: { estado: "erro", erro: msg } }));
    }
  }

  async function rodar() {
    parar.current = false;
    setRodando(true);
    const fila = [...marcados].sort((a, b) => a - b);
    const trabalhador = async () => {
      while (fila.length && !parar.current) await rodarCaso(fila.shift());
    };
    await Promise.all(Array.from({ length: SIMULTANEOS }, trabalhador));
    setRodando(false);
  }

  const lista = Object.entries(resultados).map(([i, r]) => ({ caso: CASOS_BATERIA[i], ...r }));
  const resumo = resumirBateria(lista.filter((r) => r.estado !== "gerando"));

  function baixar() {
    const relatorio = {
      app: "EduGera",
      tipo: "bateria-qualidade",
      geradoEm: new Date().toISOString(),
      resumo,
      resultados: lista.filter((r) => r.estado === "pronto" || r.estado === "erro").map(({ caso, estado, material, auditoria, erro, segundos }) => ({ caso, estado, material, auditoria, erro, segundos })),
    };
    const blob = new Blob([JSON.stringify(relatorio, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `edugera-bateria-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const alternar = (i) =>
    setMarcados((s) => {
      const n = new Set(s);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 font-sans text-slate-700">
      <h1 className="text-2xl font-black text-indigo-700">Bateria de qualidade</h1>
      <p className="mt-1 text-sm text-slate-600">
        Gera apostilas de disciplinas e anos variados (só o texto, sem ilustração) e confere cada uma com todas as regras do EduGera:
        gabarito, BNCC da etapa, figuras, unidades, repetições e qualidade do texto.
      </p>

      {conta && !conta.usuario && (
        <p role="alert" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Entre com sua conta na página inicial e volte aqui.</p>
      )}
      {conta?.usuario && !admin && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Esta conta não é de administrador: cada caso gastaria uma geração do limite mensal. Inclua o seu e-mail em ADMIN_EMAILS na Vercel para usar a bateria.
        </p>
      )}

      <section className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={rodar} disabled={!admin || rodando || !marcados.size} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
          {rodando ? "Rodando..." : `Rodar ${marcados.size} caso(s)`}
        </button>
        {rodando && (
          <button type="button" onClick={() => (parar.current = true)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold">
            Parar depois dos atuais
          </button>
        )}
        <button type="button" onClick={baixar} disabled={!lista.some((r) => r.estado === "pronto")} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold disabled:opacity-40">
          Baixar relatório (JSON)
        </button>
        <span className="text-xs text-slate-500">Custo estimado: ~US$ {(marcados.size * CUSTO_CASO_USD).toFixed(2)} · {SIMULTANEOS} por vez</span>
      </section>

      {resumo.gerados > 0 && (
        <section className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            ["Nota média", resumo.media],
            ["Aprovados (≥ 80, sem erro)", `${resumo.aprovados}/${resumo.gerados}`],
            ["Falhas de geração", resumo.falhas],
            ["Casos rodados", resumo.casos],
          ].map(([r, v]) => (
            <div key={r} className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs text-slate-500">{r}</div>
              <div className="text-2xl font-black text-slate-800">{v}</div>
            </div>
          ))}
          {resumo.comuns.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-3 sm:col-span-4">
              <div className="text-xs font-bold uppercase text-slate-500">Problemas mais comuns</div>
              <ul className="mt-1 space-y-0.5 text-sm">
                {resumo.comuns.map((c) => (
                  <li key={c.problema}>
                    <b>{c.vezes}×</b> {c.problema}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <table className="mt-5 w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-slate-500">
            <th className="p-2"></th>
            <th className="p-2">Caso</th>
            <th className="p-2">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {CASOS_BATERIA.map((c, i) => {
            const r = resultados[i];
            return (
              <React.Fragment key={i}>
                <tr className="border-t border-slate-100 align-top">
                  <td className="p-2">
                    <input type="checkbox" aria-label={`Incluir ${c.tema}`} checked={marcados.has(i)} onChange={() => alternar(i)} disabled={rodando} />
                  </td>
                  <td className="p-2">
                    <div className="font-bold text-slate-800">{c.tema}</div>
                    <div className="text-xs text-slate-500">
                      {c.disciplina} · {rotuloAno(c.ano)} · {c.bncc} · {c.questoes} exercícios · {c.dificuldade}
                    </div>
                  </td>
                  <td className="p-2">
                    {!r && <span className="text-slate-400">—</span>}
                    {r?.estado === "gerando" && <span className="text-indigo-600">gerando…</span>}
                    {r?.estado === "erro" && <span className="text-rose-700">falhou: {r.erro}</span>}
                    {r?.estado === "pronto" && (
                      <button type="button" onClick={() => setAberto(aberto === i ? null : i)} className="flex items-center gap-2 text-left">
                        <span className={`rounded-lg px-2 py-0.5 font-black ${corNota(r.auditoria.nota)}`}>{r.auditoria.nota}</span>
                        <span className="text-xs text-slate-600">
                          {r.auditoria.erros} erro(s) · {r.auditoria.avisos} aviso(s) · {r.segundos}s {aberto === i ? "▲" : "▼"}
                        </span>
                      </button>
                    )}
                  </td>
                </tr>
                {aberto === i && r?.auditoria && (
                  <tr>
                    <td></td>
                    <td colSpan={2} className="p-2">
                      {r.auditoria.problemas.length === 0 ? (
                        <p className="text-emerald-700">Nenhum problema encontrado.</p>
                      ) : (
                        <ul className="space-y-1 text-xs">
                          {r.auditoria.problemas.map((p, k) => (
                            <li key={k} className={p.gravidade === "erro" ? "text-rose-700" : "text-amber-800"}>
                              <b>{p.gravidade === "erro" ? "Erro" : "Aviso"} · {p.onde}</b> ({p.fonte}): {p.motivo}
                              {p.trecho ? <span className="text-slate-500"> — “{String(p.trecho).slice(0, 80)}”</span> : null}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-2 text-xs text-slate-500">
                        Título: <b>{r.material.tituloDidatico}</b> · {r.material.exercicios?.length || 0} exercícios ·{" "}
                        {r.material.exercicios?.filter((e) => e.figura).length || 0} com figura
                      </p>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
