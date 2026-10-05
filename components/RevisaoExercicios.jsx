"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, Wand2, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2, ThumbsUp, GraduationCap } from "lucide-react";
import { auditarMaterial } from "@/lib/auditoria";
import { conferirGabarito } from "@/lib/gabarito";
import FiguraDidatica from "@/components/FiguraDidatica";
import Tx from "@/components/Tx";
import { PERSONAGENS } from "@/lib/cena";
import { aplicarRevisao } from "@/lib/revisorConteudo";

// Revisão exercício por exercício, antes de imprimir: cada exercício aparece com
// o resultado das conferências automáticas e os botões Aprovar, Corrigir com IA
// (refaz só aquele exercício), Editar e Remover. A prévia A4 atualiza na hora.

const numeroDe = (onde = "") => Number((/exerc[ií]cio\s+(\d+)/i.exec(onde) || [])[1]) || null;

// autoRevisar: número que muda a cada apostila recém-gerada; dispara o revisor de conteúdo
export default function RevisaoExercicios({ form, material, onMudar, autoRevisar = 0 }) {
  const [atual, setAtual] = useState(0);
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(null);
  const [corrigindo, setCorrigindo] = useState(false);
  const [erro, setErro] = useState("");
  const [instrucao, setInstrucao] = useState("");
  const [revisando, setRevisando] = useState(false);
  const [erroRevisor, setErroRevisor] = useState("");
  const pedidoFeito = useRef(0);

  // Revisor de conteúdo: uma segunda IA lê a apostila como professor da disciplina
  async function revisarConteudo() {
    const exs = material?.exercicios || [];
    if (!exs.length || revisando) return;
    setErroRevisor("");
    setRevisando(true);
    const enunciados = exs.map((e) => e.enunciado);
    try {
      const res = await fetch("/api/revisar-conteudo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form: { disciplina: form.disciplina, nivel: form.nivel, ano: form.ano, tema: form.tema, bncc: form.bncc },
          material,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Não foi possível revisar o conteúdo.");
      // função: aplica sobre a versão mais nova (o professor pode ter mexido enquanto isso)
      onMudar((atualMat) => aplicarRevisao(atualMat, json.apontamentos || [], enunciados));
    } catch (e) {
      setErroRevisor(e instanceof TypeError ? "Sem conexão com o servidor." : e.message);
    } finally {
      setRevisando(false);
    }
  }

  useEffect(() => {
    if (!autoRevisar || pedidoFeito.current === autoRevisar || material?.revisaoConteudo) return;
    pedidoFeito.current = autoRevisar;
    revisarConteudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRevisar]);

  // mostra (e guarda) a versão já conferida: letra do gabarito corrigida etc.
  const conferido = useMemo(() => conferirGabarito(material || {}), [material]);
  const exercicios = conferido.material.exercicios || [];
  const correcoes = useMemo(() => {
    const porNumero = {};
    for (const a of conferido.avisos.filter((a) => a.tipo === "corrigido")) {
      const n = numeroDe(a.onde);
      if (n) (porNumero[n] ||= []).push(a);
    }
    return porNumero;
  }, [conferido]);
  const problemas = useMemo(() => {
    const porNumero = {};
    for (const p of auditarMaterial(form, material, { questoes: exercicios.length }).problemas) {
      const n = numeroDe(p.onde);
      if (n) (porNumero[n] ||= []).push(p);
    }
    return porNumero;
  }, [form, material, exercicios.length]);

  if (!exercicios.length) return null;
  const i = Math.min(atual, exercicios.length - 1);
  const ex = exercicios[i];
  const meus = problemas[i + 1] || [];
  const aprovados = exercicios.filter((e) => e.aprovado).length;

  // troca um exercício; avisos antigos do servidor deixam de valer
  const trocar = (novo) =>
    onMudar({ ...material, avisosGabarito: [], exercicios: exercicios.map((e, k) => (k === i ? novo : e)) });

  const aprovar = () => {
    trocar({ ...ex, aprovado: !ex.aprovado });
    if (!ex.aprovado && i < exercicios.length - 1) setAtual(i + 1);
  };

  const remover = () => {
    if (!window.confirm(`Remover o exercício ${i + 1}?`)) return;
    onMudar({ ...material, avisosGabarito: [], exercicios: exercicios.filter((_, k) => k !== i) });
    setAtual(Math.max(0, i - 1));
  };

  const abrirEdicao = () => {
    setRascunho({ fala: ex.fala?.texto || "", enunciado: ex.enunciado, alternativas: (ex.alternativas || []).join("\n"), resposta: ex.resposta || "" });
    setEditando(true);
  };
  const salvarEdicao = () => {
    trocar({
      ...ex,
      revisor: undefined,
      fala: ex.fala && rascunho.fala.trim() ? { ...ex.fala, texto: rascunho.fala.trim() } : rascunho.fala.trim() ? { quem: "edu", texto: rascunho.fala.trim() } : null,
      enunciado: rascunho.enunciado.trim(),
      alternativas: rascunho.alternativas.split("\n").map((a) => a.trim()).filter(Boolean),
      resposta: rascunho.resposta.trim(),
      resolucao: "",
      aprovado: false,
    });
    setEditando(false);
  };

  async function corrigir() {
    setErro("");
    setCorrigindo(true);
    try {
      const res = await fetch("/api/corrigir-exercicio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form: { disciplina: form.disciplina, nivel: form.nivel, ano: form.ano, tema: form.tema, bncc: form.bncc },
          exercicio: ex,
          numero: i + 1,
          motivos: meus.map((p) => p.motivo),
          instrucao,
          outros: exercicios.filter((_, k) => k !== i).map((e) => e.enunciado),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Não foi possível corrigir.");
      trocar({ ...json.exercicio, fala: json.exercicio.fala || ex.fala, aprovado: false });
      setInstrucao("");
    } catch (e) {
      setErro(e.message);
    } finally {
      setCorrigindo(false);
    }
  }

  const status = (e, k) => (e.aprovado ? "aprovado" : (problemas[k + 1] || []).length ? "atencao" : "ok");
  const cor = { aprovado: "bg-emerald-500", ok: "bg-indigo-300", atencao: "bg-amber-400" };

  return (
    <section aria-labelledby="titulo-revisao" className="nao-imprimir mt-6 rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-revisao" className="text-base font-extrabold text-slate-800">Revisar exercícios</h2>
        <span className="text-xs font-bold text-slate-500">
          {aprovados} de {exercicios.length} aprovados
        </span>
      </div>
      <p className="mt-1 text-[12px] text-slate-600">Confira um por vez. Aprove, peça para a IA corrigir só este exercício, edite ou remova.</p>

      {/* revisor de conteúdo: situação e apontamentos que não são de um exercício */}
      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12.5px]" aria-live="polite">
        {revisando ? (
          <p className="flex items-center gap-2 font-semibold text-indigo-700">
            <Loader2 className="h-4 w-4 animate-spin" /> Revisor de conteúdo lendo a apostila como professor de {form.disciplina || "da disciplina"}…
          </p>
        ) : material?.revisaoConteudo ? (
          <>
            <p className={`flex items-center gap-2 font-bold ${material.revisaoConteudo.total ? "text-amber-800" : "text-emerald-700"}`}>
              <GraduationCap className="h-4 w-4" />
              {material.revisaoConteudo.total
                ? `Revisor de conteúdo: ${material.revisaoConteudo.total} ponto(s) para conferir (marcados nos exercícios em amarelo)`
                : "Revisor de conteúdo: nenhum problema encontrado"}
            </p>
            {(material.revisorGeral || []).length > 0 && (
              <ul className="mt-1.5 space-y-1 text-amber-900">
                {material.revisorGeral.map((r, k) => (
                  <li key={k} className="flex gap-1.5">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                    <span><b>{r.onde}:</b> {r.motivo}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-600">{erroRevisor || "Uma segunda IA lê a apostila como professor da disciplina e aponta erros de conteúdo."}</span>
            <button type="button" onClick={revisarConteudo} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-[12.5px] font-bold text-white">
              <GraduationCap className="h-4 w-4" /> {erroRevisor ? "Tentar de novo" : "Revisar conteúdo"}
            </button>
          </div>
        )}
      </div>

      {/* atalhos: uma bolinha por exercício (verde = aprovado, amarelo = atenção) */}
      <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Exercícios">
        {exercicios.map((e, k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={k === i}
            aria-label={`Exercício ${k + 1}: ${status(e, k) === "aprovado" ? "aprovado" : status(e, k) === "atencao" ? "precisa de atenção" : "conferido"}`}
            onClick={() => {
              setAtual(k);
              setEditando(false);
            }}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black text-white ${cor[status(e, k)]} ${k === i ? "ring-2 ring-indigo-600 ring-offset-1" : ""}`}
          >
            {k + 1}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-black text-indigo-700">Exercício {i + 1}</span>
          {ex.aprovado ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              <ThumbsUp className="h-3.5 w-3.5" /> Aprovado
            </span>
          ) : meus.length ? (
            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" /> {meus.length} ponto(s) de atenção
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Conferido automaticamente
            </span>
          )}
        </div>

        {editando ? (
          <div className="mt-3 space-y-2 text-[13px]">
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Fala do personagem ({PERSONAGENS[ex.fala?.quem]?.nome || "Prof. Edu"})</span>
              <textarea className="ipt mt-1 w-full" rows={2} value={rascunho.fala} onChange={(e) => setRascunho({ ...rascunho, fala: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Enunciado</span>
              <textarea className="ipt mt-1 w-full" rows={3} value={rascunho.enunciado} onChange={(e) => setRascunho({ ...rascunho, enunciado: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Alternativas (uma por linha; vazio = questão aberta)</span>
              <textarea className="ipt mt-1 w-full" rows={4} value={rascunho.alternativas} onChange={(e) => setRascunho({ ...rascunho, alternativas: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Gabarito</span>
              <textarea className="ipt mt-1 w-full" rows={2} value={rascunho.resposta} onChange={(e) => setRascunho({ ...rascunho, resposta: e.target.value })} />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={salvarEdicao} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Salvar</button>
              <button type="button" onClick={() => setEditando(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold">Cancelar</button>
            </div>
          </div>
        ) : (
          <>
            {ex.fala?.texto && (
              <p className="mt-2 rounded-xl bg-slate-50 px-3 py-1.5 text-[12.5px] italic text-slate-600">
                <span className="font-bold not-italic text-slate-700">{PERSONAGENS[ex.fala.quem]?.nome || "Personagem"}:</span> {ex.fala.texto}
              </p>
            )}
            <p className="mt-2 text-[13px] text-slate-800"><Tx>{ex.enunciado}</Tx></p>
            {ex.figura && <FiguraDidatica figura={ex.figura} className="mt-2 scale-90" />}
            {ex.alternativas?.length > 0 && (
              <ul className="mt-2 grid grid-cols-2 gap-1 text-[12.5px] text-slate-700">
                {ex.alternativas.map((a, k) => (
                  <li key={k}><Tx>{a}</Tx></li>
                ))}
              </ul>
            )}
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-700">
              <b>Gabarito:</b> <Tx>{ex.resposta || "—"}</Tx>
            </p>
          </>
        )}

        {(correcoes[i + 1] || []).length > 0 && !editando && (
          <ul className="mt-3 space-y-1 text-[12px] text-indigo-800">
            {correcoes[i + 1].map((a, k) => (
              <li key={k} className="flex gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none" />
                <span>Gabarito {a.motivo}</span>
              </li>
            ))}
          </ul>
        )}

        {meus.length > 0 && !editando && (
          <ul className="mt-3 space-y-1 text-[12px] text-amber-900">
            {meus.map((p, k) => (
              <li key={k} className="flex gap-1.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                <span>
                  {p.fonte === "revisor" && <b>Revisor: </b>}
                  {p.motivo.charAt(0).toUpperCase() + p.motivo.slice(1)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {!editando && (
          <>
            <label className="mt-3 block">
              <span className="sr-only">O que mudar (opcional, para a correção com IA)</span>
              <input
                className="ipt w-full text-[12.5px]"
                value={instrucao}
                maxLength={300}
                onChange={(e) => setInstrucao(e.target.value)}
                placeholder="Opcional: diga o que mudar (ex.: está fora do tema; deixe mais fácil)"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={aprovar} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold ${ex.aprovado ? "border border-slate-300" : "bg-emerald-600 text-white"}`}>
                <ThumbsUp className="h-4 w-4" /> {ex.aprovado ? "Desfazer aprovação" : "Aprovar"}
              </button>
              <button type="button" onClick={corrigir} disabled={corrigindo} aria-busy={corrigindo} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">
                {corrigindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} {corrigindo ? "Corrigindo..." : "Corrigir com IA"}
              </button>
              <button type="button" onClick={abrirEdicao} className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold">
                <Pencil className="h-4 w-4" /> Editar
              </button>
              <button type="button" onClick={remover} className="flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700">
                <Trash2 className="h-4 w-4" /> Remover
              </button>
            </div>
            {erro && <p role="alert" className="mt-2 text-[12px] text-rose-700">{erro}</p>}
          </>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={() => { setAtual(Math.max(0, i - 1)); setEditando(false); }} disabled={i === 0} className="flex items-center gap-1 text-sm font-bold text-indigo-700 disabled:opacity-30">
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>
        <span className="text-xs text-slate-500">{i + 1} de {exercicios.length}</span>
        <button type="button" onClick={() => { setAtual(Math.min(exercicios.length - 1, i + 1)); setEditando(false); }} disabled={i === exercicios.length - 1} className="flex items-center gap-1 text-sm font-bold text-indigo-700 disabled:opacity-30">
          Próximo <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
