"use client";
import React, { useState } from "react";
import { ClipboardList, Loader2, Printer, Copy, Check, AlertCircle, Info } from "lucide-react";
import SeletorBNCC from "@/components/SeletorBNCC";
import { DISCIPLINAS, NIVEIS } from "@/lib/opcoes";
import { ANOS_POR_NIVEL } from "@/lib/bncc";
import { AULAS, LIMITES_PLANO, planoParaTexto } from "@/lib/planoAula";

// "Plano de Aula": gera um plano na estrutura do Currículo Paulista (conta como 1 geração).
// O plano não é guardado no servidor: o professor imprime/salva em PDF ou copia o texto.
const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function htmlParaImpressao(pl) {
  const i = pl.identificacao;
  const ul = (xs) => `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  const linha = (r, v) => (v ? `<tr><th>${r}</th><td>${esc(v)}</td></tr>` : "");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Plano de aula — ${esc(i.tema)}</title>
<style>@page{size:A4;margin:16mm}body{font-family:Arial,Helvetica,sans-serif;font-size:11.5pt;color:#111;line-height:1.4}
h1{font-size:16pt;text-align:center;margin:0 0 10px}h2{font-size:12pt;background:#eef;padding:4px 6px;margin:14px 0 6px}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:4px 6px;text-align:left;vertical-align:top}th{width:32%;background:#f6f6f6}
.aula{border:1px solid #bbb;padding:6px 8px;margin:6px 0;page-break-inside:avoid}ul{margin:4px 0 4px 18px;padding:0}.rodape{margin-top:18px;font-size:9pt;color:#555}</style></head><body>
<h1>PLANO DE AULA</h1><table>${linha("Professor(a)", i.professor)}${linha("Escola", i.escola)}${linha("Turma", i.turma)}${linha("Componente curricular", i.componente)}${linha("Etapa / ano", i.etapa)}${linha("Período", i.periodo)}${linha("Número de aulas", String(i.aulas))}${linha("Tema", i.tema)}</table>
<h2>Unidade temática</h2><p>${esc(pl.unidadeTematica)}</p><h2>Objeto de conhecimento</h2><p>${esc(pl.objetoConhecimento)}</p>
<h2>Habilidade(s)</h2>${ul(pl.habilidades.map((h) => [h.codigo, h.descricao].filter(Boolean).join(" — ")))}
<h2>Objetivos</h2>${ul(pl.objetivos)}<h2>Desenvolvimento</h2>
${pl.aulas.map((a) => `<div class="aula"><b>Aula ${a.numero}${a.titulo ? ` — ${esc(a.titulo)}` : ""}</b><p><b>Introdução:</b> ${esc(a.introducao)}</p><p><b>Desenvolvimento:</b> ${esc(a.desenvolvimento)}</p><p><b>Fechamento:</b> ${esc(a.fechamento)}</p></div>`).join("")}
<h2>Recursos</h2>${ul(pl.recursos)}<h2>Avaliação</h2><p><b>Critérios:</b></p>${ul(pl.avaliacao.criterios)}<p><b>Instrumentos:</b></p>${ul(pl.avaliacao.instrumentos)}
<h2>Recuperação contínua</h2><p>${esc(pl.recuperacao)}</p><h2>Adaptações / inclusão</h2><p>${esc(pl.adaptacoes)}</p>
<p class="rodape">Plano gerado com apoio de IA no EduGera — revise antes de entregar.</p></body></html>`;
}

const Campo = ({ rotulo, opcional, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-bold text-slate-600">
      {rotulo} {opcional && <span className="font-normal text-slate-500">(opcional)</span>}
    </span>
    {children}
  </label>
);

export default function PlanoAula({ professorPadrao = "", escolaPadrao = "", aoGerar }) {
  const [f, setF] = useState({ professor: professorPadrao, escola: escolaPadrao, turma: "", disciplina: "Matemática", nivel: "Ensino Fundamental", ano: "", bncc: "", habilidade: "", tema: "", aulas: 2, periodo: "", observacoes: "" });
  const [plano, setPlano] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const set = (k) => (e) =>
    setF((x) => {
      const n = { ...x, [k]: e.target.value };
      if (k === "nivel" && !(ANOS_POR_NIVEL[n.nivel] || []).some((a) => a.valor === n.ano)) n.ano = "";
      return n;
    });

  const gerar = async () => {
    if (!f.tema.trim()) return setErro("Preencha o tema.");
    setErro("");
    setGerando(true);
    try {
      const r = await fetch("/api/gerar-plano", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Não foi possível gerar o plano.");
      setPlano(j.plano);
      setAvisos(j.avisos || []);
      aoGerar?.();
    } catch (e) {
      setErro(e instanceof TypeError ? "Sem conexão com o servidor." : e.message);
    } finally {
      setGerando(false);
    }
  };

  const imprimir = () => {
    const w = window.open("", "_blank");
    if (!w) return setErro("O navegador bloqueou a janela de impressão. Permita pop-ups para este site.");
    w.document.write(htmlParaImpressao(plano));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(planoParaTexto(plano));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar. Selecione o texto do plano e copie manualmente.");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <section className="self-start rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-800">
          <ClipboardList className="h-5 w-5 text-violet-500" /> Plano de aula
        </h2>
        <p className="mb-5 text-sm text-slate-600">Na estrutura do Currículo Paulista: habilidade, objetivos, desenvolvimento aula a aula, recursos, avaliação e recuperação. Usa 1 geração do seu plano.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo rotulo="Professor(a)" opcional>
            <input className="ipt" value={f.professor} onChange={set("professor")} maxLength={LIMITES_PLANO.professor} />
          </Campo>
          <Campo rotulo="Escola" opcional>
            <input className="ipt" value={f.escola} onChange={set("escola")} maxLength={LIMITES_PLANO.escola} />
          </Campo>
          <Campo rotulo="Componente curricular">
            <select className="ipt" value={f.disciplina} onChange={set("disciplina")}>
              {DISCIPLINAS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Etapa">
            <select className="ipt" value={f.nivel} onChange={set("nivel")}>
              {NIVEIS.map((n) => <option key={n}>{n}</option>)}
            </select>
          </Campo>
          {ANOS_POR_NIVEL[f.nivel] && (
            <Campo rotulo="Ano / Série" opcional>
              <select className="ipt" value={f.ano} onChange={set("ano")}>
                <option value="">Não especificar</option>
                {ANOS_POR_NIVEL[f.nivel].map((a) => <option key={a.valor} value={a.valor}>{a.rotulo}</option>)}
              </select>
            </Campo>
          )}
          <Campo rotulo="Turma" opcional>
            <input className="ipt" value={f.turma} onChange={set("turma")} maxLength={LIMITES_PLANO.turma} placeholder='Ex.: "7º ano B"' />
          </Campo>
          <div className="sm:col-span-2">
            <SeletorBNCC codigo={f.bncc} habilidade={f.habilidade} disciplina={f.disciplina} nivel={f.nivel} ano={f.ano} onChange={(x) => setF((s) => ({ ...s, ...x }))} />
          </div>
          <div className="sm:col-span-2">
            <Campo rotulo="Tema">
              <input className="ipt" value={f.tema} onChange={set("tema")} maxLength={LIMITES_PLANO.tema} placeholder='Ex.: "Volume de blocos retangulares"' />
            </Campo>
          </div>
          <Campo rotulo="Número de aulas">
            <select className="ipt" value={f.aulas} onChange={(e) => setF((x) => ({ ...x, aulas: Number(e.target.value) }))}>
              {AULAS.map((n) => <option key={n} value={n}>{n} {n === 1 ? "aula" : "aulas"}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Período" opcional>
            <input className="ipt" value={f.periodo} onChange={set("periodo")} maxLength={LIMITES_PLANO.periodo} placeholder='Ex.: "06/10 a 10/10"' />
          </Campo>
          <div className="sm:col-span-2">
            <Campo rotulo="Orientações" opcional>
              <textarea className="ipt min-h-[80px]" value={f.observacoes} onChange={set("observacoes")} maxLength={LIMITES_PLANO.observacoes} placeholder="Ex.: turma com dificuldade em frações; usar material concreto." />
            </Campo>
            <p className="mt-1 text-[11.5px] text-slate-600">Não escreva nomes ou dados pessoais de alunos: este texto é enviado à IA.</p>
          </div>
        </div>
        {erro && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {erro}
          </p>
        )}
        <button type="button" onClick={gerar} disabled={gerando} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 py-3.5 font-bold text-white shadow-lg shadow-indigo-200 disabled:opacity-75">
          {gerando ? <Loader2 className="h-5 w-5 animate-spin" /> : <ClipboardList className="h-5 w-5" />}
          {gerando ? "Gerando o plano…" : plano ? "Gerar novamente" : "Gerar plano de aula"}
        </button>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" aria-live="polite">
        {!plano ? (
          <p className="text-sm text-slate-600">O plano aparece aqui. Depois você imprime, salva em PDF ou copia o texto para o modelo da sua escola.</p>
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" onClick={imprimir} className="btn-prev"><Printer className="h-3.5 w-3.5" /> Imprimir / salvar PDF</button>
              <button type="button" onClick={copiar} className="btn-prev">{copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copiado ? "Copiado" : "Copiar texto"}</button>
            </div>
            {avisos.length > 0 && (
              <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-900"><Info className="mt-0.5 h-4 w-4 shrink-0" /> Confira: {avisos.join("; ")}.</p>
            )}
            <article className="space-y-3 text-[14px] leading-relaxed text-slate-800">
              <h3 className="text-center text-base font-extrabold">PLANO DE AULA — {plano.identificacao.tema}</h3>
              <p className="text-[13px] text-slate-600">{[plano.identificacao.componente, plano.identificacao.etapa, plano.identificacao.turma, `${plano.identificacao.aulas} aula(s)`, plano.identificacao.periodo].filter(Boolean).join(" · ")}</p>
              <p><b>Unidade temática:</b> {plano.unidadeTematica}</p>
              <p><b>Objeto de conhecimento:</b> {plano.objetoConhecimento}</p>
              <div><b>Habilidade(s):</b><ul className="ml-5 list-disc">{plano.habilidades.map((h, k) => <li key={k}>{[h.codigo, h.descricao].filter(Boolean).join(" — ")}</li>)}</ul></div>
              <div><b>Objetivos:</b><ul className="ml-5 list-disc">{plano.objetivos.map((o, k) => <li key={k}>{o}</li>)}</ul></div>
              {plano.aulas.map((a) => (
                <div key={a.numero} className="rounded-xl border border-slate-200 p-3">
                  <p className="font-bold">Aula {a.numero}{a.titulo ? ` — ${a.titulo}` : ""}</p>
                  <p><b>Introdução:</b> {a.introducao}</p>
                  <p><b>Desenvolvimento:</b> {a.desenvolvimento}</p>
                  <p><b>Fechamento:</b> {a.fechamento}</p>
                </div>
              ))}
              <div><b>Recursos:</b><ul className="ml-5 list-disc">{plano.recursos.map((r, k) => <li key={k}>{r}</li>)}</ul></div>
              <div><b>Avaliação — critérios:</b><ul className="ml-5 list-disc">{plano.avaliacao.criterios.map((r, k) => <li key={k}>{r}</li>)}</ul></div>
              <div><b>Instrumentos:</b><ul className="ml-5 list-disc">{plano.avaliacao.instrumentos.map((r, k) => <li key={k}>{r}</li>)}</ul></div>
              <p><b>Recuperação contínua:</b> {plano.recuperacao}</p>
              <p><b>Adaptações / inclusão:</b> {plano.adaptacoes}</p>
              <p className="text-[12px] text-slate-500">Plano gerado com apoio de IA. Revise antes de entregar à coordenação.</p>
            </article>
          </div>
        )}
      </section>
    </div>
  );
}
