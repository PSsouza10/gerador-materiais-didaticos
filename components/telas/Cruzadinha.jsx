"use client";
import React, { useEffect, useState } from "react";
import { Grid3x3, Loader2, Printer, AlertCircle, Info, Shuffle, Eye, EyeOff, Trash2, FolderOpen } from "lucide-react";
import SeletorBNCC from "@/components/SeletorBNCC";
import { DISCIPLINAS, NIVEIS } from "@/lib/opcoes";
import { ANOS_POR_NIVEL } from "@/lib/bncc";
import { QUANTIDADES, LIMITES_CRUZADINHA, montarGrade, cruzadinhaParaHtml } from "@/lib/cruzadinha";

// Cruzadinhas salvas NESTE navegador (como os planos de aula): não vão para o servidor
const K = "edugera:cruzadinhas";
const MAX_SALVAS = 20;
const lerSalvas = () => {
  try {
    const v = JSON.parse(window.localStorage.getItem(K) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const gravarSalvas = (l) => {
  try {
    window.localStorage.setItem(K, JSON.stringify(l.slice(0, MAX_SALVAS)));
  } catch {
    /* armazenamento cheio ou bloqueado */
  }
};

const Campo = ({ rotulo, opcional, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-bold text-slate-600">
      {rotulo} {opcional && <span className="font-normal text-slate-500">(opcional)</span>}
    </span>
    {children}
  </label>
);

function Grade({ g, comLetras }) {
  return (
    <div className="overflow-x-auto">
      <table className="mx-auto border-collapse" aria-label="Grade da cruzadinha">
        <tbody>
          {g.letras.map((linha, r) => (
            <tr key={r}>
              {linha.map((l, c) => (
                <td key={c} className={`relative h-7 w-7 p-0 text-center align-middle sm:h-8 sm:w-8 ${l ? "border border-slate-700 bg-white" : ""}`}>
                  {g.numeros[r][c] && <span className="absolute left-0.5 top-0 text-[8px] leading-none text-slate-600">{g.numeros[r][c]}</span>}
                  {l && comLetras && <span className="text-[13px] font-bold text-rose-700">{l}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Dicas = ({ titulo, xs, comResposta }) =>
  xs.length ? (
    <div>
      <h4 className="mb-1 border-b border-slate-200 text-sm font-bold text-slate-700">{titulo}</h4>
      <ol className="space-y-1 text-[13.5px] text-slate-800">
        {xs.map((p) => (
          <li key={`${titulo}-${p.numero}`}>
            <b>{p.numero}.</b> {p.dica} <span className="text-slate-500">({p.tamanho})</span>
            {comResposta && <b className="ml-1 text-rose-700">→ {p.original || p.resposta}</b>}
          </li>
        ))}
      </ol>
    </div>
  ) : null;

// "Cruzadinha": palavras cruzadas a partir de tema/habilidade (1 geração).
// Folha do aluno + gabarito; "Nova disposição" remonta a grade sem IA.
export default function Cruzadinha({ professorPadrao = "", escolaPadrao = "", aoGerar, inicial = null }) {
  const [f, setF] = useState({ professor: professorPadrao, escola: escolaPadrao, turma: "", disciplina: "Matemática", nivel: "Ensino Fundamental", ano: "", bncc: "", habilidade: "", tema: "", quantidade: 10, observacoes: "" });
  useEffect(() => {
    if (inicial) setF((x) => ({ ...x, ...(inicial.disciplina ? { disciplina: inicial.disciplina } : {}), nivel: inicial.nivel || x.nivel, ano: inicial.ano || x.ano, bncc: inicial.bncc || x.bncc, ...(inicial.tema ? { tema: inicial.tema } : {}) }));
  }, [inicial]);
  const [cz, setCz] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);
  const [verGabarito, setVerGabarito] = useState(false);
  const [semente, setSemente] = useState(1);
  const [salvas, setSalvas] = useState([]);
  useEffect(() => setSalvas(lerSalvas()), []);
  const set = (k) => (e) =>
    setF((x) => {
      const n = { ...x, [k]: e.target.value };
      if (k === "nivel" && !(ANOS_POR_NIVEL[n.nivel] || []).some((a) => a.valor === n.ano)) n.ano = "";
      return n;
    });

  const guardar = (nova) => {
    const item = { id: `cz-${Date.now().toString(36)}`, criadoEm: new Date().toISOString(), cruzadinha: nova };
    const l = [item, ...lerSalvas()].slice(0, MAX_SALVAS);
    gravarSalvas(l);
    setSalvas(l);
    return item.id;
  };
  const atualizarSalva = (id, nova) => {
    const l = lerSalvas().map((x) => (x.id === id ? { ...x, cruzadinha: nova } : x));
    gravarSalvas(l);
    setSalvas(l);
  };

  const gerar = async () => {
    if (!f.tema.trim() && !f.habilidade.trim()) return setErro("Preencha o tema ou escolha uma habilidade.");
    setErro("");
    setGerando(true);
    try {
      const r = await fetch("/api/gerar-cruzadinha", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Não foi possível gerar a cruzadinha (erro ${r.status}).`);
      const id = guardar(j.cruzadinha);
      setCz({ ...j.cruzadinha, id });
      setAvisos(j.avisos || []);
      setVerGabarito(false);
      aoGerar?.();
    } catch (e) {
      setErro(e instanceof TypeError ? "Sem conexão com o servidor." : e.message);
    } finally {
      setGerando(false);
    }
  };

  // remonta a grade com as mesmas palavras (sem IA, sem gastar geração)
  const novaDisposicao = () => {
    const s = semente + 1;
    const g = montarGrade(cz.palavras, { alvo: cz.quantidade, semente: s * 7919 });
    setSemente(s);
    if (!g) return;
    const nova = { ...cz, grade: g };
    setCz(nova);
    if (cz.id) atualizarSalva(cz.id, (({ id, ...resto }) => resto)(nova));
  };

  const imprimir = () => {
    const w = window.open("", "_blank");
    if (!w) return setErro("O navegador bloqueou a janela de impressão. Permita pop-ups para este site.");
    w.document.write(cruzadinhaParaHtml(cz));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const n = cz ? cz.grade.horizontais.length + cz.grade.verticais.length : 0;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <section className="self-start rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-800">
          <Grid3x3 className="h-5 w-5 text-violet-500" /> Cruzadinha
        </h2>
        <p className="mb-5 text-sm text-slate-600">Palavras cruzadas do tema ou da habilidade: folha do aluno com dicas e gabarito do professor. Usa 1 geração do seu plano.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo rotulo="Professor(a)" opcional>
            <input className="ipt" value={f.professor} onChange={set("professor")} maxLength={LIMITES_CRUZADINHA.professor} />
          </Campo>
          <Campo rotulo="Escola" opcional>
            <input className="ipt" value={f.escola} onChange={set("escola")} maxLength={LIMITES_CRUZADINHA.escola} />
          </Campo>
          <Campo rotulo="Componente curricular">
            <select className="ipt" value={f.disciplina} onChange={set("disciplina")}>
              {DISCIPLINAS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Etapa">
            <select className="ipt" value={f.nivel} onChange={set("nivel")}>
              {NIVEIS.map((x) => <option key={x}>{x}</option>)}
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
            <input className="ipt" value={f.turma} onChange={set("turma")} maxLength={LIMITES_CRUZADINHA.turma} placeholder='Ex.: "6º ano A"' />
          </Campo>
          <div className="sm:col-span-2">
            <SeletorBNCC codigo={f.bncc} habilidade={f.habilidade} disciplina={f.disciplina} nivel={f.nivel} ano={f.ano} onChange={(x) => setF((s) => ({ ...s, ...x }))} />
          </div>
          <div className="sm:col-span-2">
            <Campo rotulo="Tema" opcional={!!f.habilidade}>
              <input className="ipt" value={f.tema} onChange={set("tema")} maxLength={LIMITES_CRUZADINHA.tema} placeholder='Ex.: "Figuras planas"' />
            </Campo>
          </div>
          <Campo rotulo="Número de palavras">
            <select className="ipt" value={f.quantidade} onChange={(e) => setF((x) => ({ ...x, quantidade: Number(e.target.value) }))}>
              {QUANTIDADES.map((q) => <option key={q} value={q}>{q} palavras</option>)}
            </select>
          </Campo>
          <div className="sm:col-span-2">
            <Campo rotulo="Orientações" opcional>
              <textarea className="ipt min-h-[70px]" value={f.observacoes} onChange={set("observacoes")} maxLength={LIMITES_CRUZADINHA.observacoes} placeholder="Ex.: dicas com situações do dia a dia; incluir as unidades de medida." />
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
          {gerando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Grid3x3 className="h-5 w-5" />}
          {gerando ? "Gerando a cruzadinha…" : cz ? "Gerar outra" : "Gerar cruzadinha"}
        </button>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" aria-live="polite">
        {!cz ? (
          <p className="text-sm text-slate-600">A cruzadinha aparece aqui. Depois você imprime ou salva em PDF: a 1ª página é do aluno e a 2ª é o gabarito.</p>
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" onClick={imprimir} className="btn-prev"><Printer className="h-3.5 w-3.5" /> Imprimir / salvar PDF</button>
              <button type="button" onClick={novaDisposicao} className="btn-prev" title="Mesmas palavras, outra grade (não gasta geração)"><Shuffle className="h-3.5 w-3.5" /> Nova disposição</button>
              <button type="button" onClick={() => setVerGabarito((v) => !v)} className="btn-prev">{verGabarito ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {verGabarito ? "Esconder gabarito" : "Ver gabarito"}</button>
            </div>
            {avisos.length > 0 && (
              <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-900"><Info className="mt-0.5 h-4 w-4 shrink-0" /> Confira: {avisos.join("; ")}.</p>
            )}
            <h3 className="text-center text-base font-extrabold text-slate-800">{cz.titulo}</h3>
            <p className="mb-1 text-center text-[12.5px] text-slate-500">{[cz.identificacao?.componente, cz.identificacao?.etapa, cz.identificacao?.bncc, `${n} palavras`].filter(Boolean).join(" · ")}</p>
            <p className="mb-3 text-[13.5px] text-slate-700">{cz.orientacao}</p>
            <Grade g={cz.grade} comLetras={verGabarito} />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Dicas titulo="Horizontais" xs={cz.grade.horizontais} comResposta={verGabarito} />
              <Dicas titulo="Verticais" xs={cz.grade.verticais} comResposta={verGabarito} />
            </div>
            <p className="mt-4 text-[12px] text-slate-500">Gerada com apoio de IA. Confira as dicas antes de aplicar. Os acentos não entram na grade (Ângulo → ANGULO).</p>
          </div>
        )}
      </section>

      {salvas.length > 0 && (
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-slate-800"><FolderOpen className="h-5 w-5 text-violet-500" /> Minhas cruzadinhas ({salvas.length})</h2>
          <p className="mb-3 text-[12.5px] text-slate-600">Ficam salvas neste navegador (as {MAX_SALVAS} mais recentes). Para guardar em outro lugar, salve em PDF.</p>
          <ul className="divide-y divide-slate-100">
            {salvas.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <b className="text-slate-800">{s.cruzadinha.titulo}</b>
                  <span className="text-slate-500"> · {[s.cruzadinha.identificacao?.componente, s.cruzadinha.identificacao?.etapa].filter(Boolean).join(" · ")} · {new Date(s.criadoEm).toLocaleDateString("pt-BR")}</span>
                </span>
                <button type="button" onClick={() => { setCz({ ...s.cruzadinha, id: s.id }); setAvisos([]); setVerGabarito(false); }} className="btn-prev">Abrir</button>
                <button type="button" onClick={() => { const l = salvas.filter((x) => x.id !== s.id); gravarSalvas(l); setSalvas(l); }} className="btn-prev" aria-label={`Remover a cruzadinha ${s.cruzadinha.titulo}`}><Trash2 className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
