"use client";
import React, { useEffect, useState } from "react";
import { FileCheck2, Loader2, Printer, Download, AlertCircle, Info, Camera, Trash2, FolderOpen, X } from "lucide-react";
import { DISCIPLINAS, NIVEIS } from "@/lib/opcoes";
import { ANOS_POR_NIVEL } from "@/lib/bncc";
import { LIMITES_CORRECAO_PROVA, VALORES_PROVA, MAX_FOTOS, PDF_MAX_BYTES, SITUACOES, ROTULO_SITUACAO, ajustarQuestao, correcaoProvaParaHtml } from "@/lib/correcaoProva";
import { imprimirHtml, baixarHtml } from "@/lib/imprimirHtml";

// Correções salvas NESTE navegador (nome do aluno fica só aqui; não vai para o servidor nem para a IA)
const K = "edugera:correcoes-prova";
const MAX_SALVAS = 40;
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

const COR = { certa: "bg-emerald-50 text-emerald-800", parcial: "bg-amber-50 text-amber-900", errada: "bg-rose-50 text-rose-800", em_branco: "bg-rose-50 text-rose-800", ilegivel: "bg-slate-100 text-slate-700" };
const br = (x) => String(x).replace(".", ",");

// Foto → JPEG reduzido (lado maior até `lado` px)
function reduzirFoto(arquivo, lado, qualidade) {
  return new Promise((ok, falha) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const f = Math.min(1, lado / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * f);
      c.height = Math.round(img.height * f);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok({ dados: c.toDataURL("image/jpeg", qualidade), w: c.width, h: c.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      falha(new Error(`Não consegui abrir a foto ${arquivo.name}. Use JPG ou PNG.`));
    };
    img.src = url;
  });
}

// Junta as fotos num PDF (uma página por foto). Se passar do limite, reduz mais.
async function fotosParaPdf(fotos) {
  const { jsPDF } = await import("jspdf");
  for (const [lado, q] of [[1700, 0.72], [1300, 0.6], [1000, 0.5]]) {
    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    for (let i = 0; i < fotos.length; i++) {
      const r = await reduzirFoto(fotos[i], lado, q);
      if (i) doc.addPage();
      const s = Math.min(200 / r.w, 287 / r.h);
      doc.addImage(r.dados, "JPEG", (210 - r.w * s) / 2, 5, r.w * s, r.h * s);
    }
    const b64 = doc.output("datauristring").split(",")[1];
    if ((b64.length * 3) / 4 <= PDF_MAX_BYTES) return b64;
  }
  throw new Error("As fotos ficaram grandes demais. Envie menos páginas.");
}

const lerPdf = (arq) =>
  new Promise((ok, falha) => {
    if (arq.size > PDF_MAX_BYTES) return falha(new Error("O PDF passa de 3 MB. Envie só as páginas da prova."));
    const l = new FileReader();
    l.onload = () => ok(String(l.result).split(",")[1] || "");
    l.onerror = () => falha(new Error("Não foi possível ler o PDF."));
    l.readAsDataURL(arq);
  });

// "Corrigir Prova": o professor envia a prova respondida pelo aluno e a IA corrige.
export default function CorrecaoProva({ professorPadrao = "", aoGerar }) {
  const [f, setF] = useState({ disciplina: "Matemática", nivel: "Ensino Fundamental", ano: "", valorTotal: 10, gabarito: "", observacoes: "" });
  const [aluno, setAluno] = useState("");
  const [turma, setTurma] = useState("");
  const [arquivos, setArquivos] = useState([]); // fotos (File) ou 1 PDF
  const [cp, setCp] = useState(null);
  const [idAtual, setIdAtual] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [salvas, setSalvas] = useState([]);
  useEffect(() => setSalvas(lerSalvas()), []);
  const set = (k) => (e) =>
    setF((x) => {
      const n = { ...x, [k]: e.target.value };
      if (k === "nivel" && !(ANOS_POR_NIVEL[n.nivel] || []).some((a) => a.valor === n.ano)) n.ano = "";
      return n;
    });

  const escolher = (lista) => {
    setErro("");
    const novos = Array.from(lista || []);
    if (!novos.length) return;
    const pdf = novos.find((a) => a.type === "application/pdf" || /\.pdf$/i.test(a.name));
    if (pdf) return setArquivos([pdf]);
    const fotos = [...arquivos.filter((a) => !/\.pdf$/i.test(a.name)), ...novos.filter((a) => /^image\//.test(a.type))];
    if (fotos.length > MAX_FOTOS) setErro(`Use até ${MAX_FOTOS} fotos (uma por página da prova).`);
    setArquivos(fotos.slice(0, MAX_FOTOS));
  };

  const salvar = (nova, id) => {
    const item = { id: id || `cp-${Date.now().toString(36)}`, criadoEm: new Date().toISOString(), aluno, turma, disciplina: f.disciplina, correcao: nova };
    const l = [item, ...lerSalvas().filter((x) => x.id !== item.id)].slice(0, MAX_SALVAS);
    gravarSalvas(l);
    setSalvas(l);
    return item.id;
  };

  const corrigir = async () => {
    if (!arquivos.length) return setErro("Envie as fotos (ou o PDF) da prova respondida.");
    setErro("");
    setEnviando(true);
    try {
      const pdf = /\.pdf$/i.test(arquivos[0].name) ? await lerPdf(arquivos[0]) : await fotosParaPdf(arquivos);
      const r = await fetch("/api/corrigir-prova", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, pdf }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || (r.status === 413 ? "O arquivo ficou grande demais. Envie menos páginas." : `Não foi possível corrigir (erro ${r.status}).`));
      setCp(j.correcao);
      setAvisos(j.avisos || []);
      setIdAtual(salvar(j.correcao));
      aoGerar?.();
    } catch (e) {
      setErro(e instanceof TypeError ? "Sem conexão com o servidor." : e.message);
    } finally {
      setEnviando(false);
    }
  };

  const ajustar = (i, mudanca) => {
    const novo = ajustarQuestao(cp, i, mudanca);
    setCp(novo);
    if (idAtual) salvar(novo, idAtual);
  };

  const html = () => correcaoProvaParaHtml(cp, { aluno, turma, disciplina: f.disciplina, professor: professorPadrao });
  const proximaProva = () => {
    setCp(null);
    setIdAtual(null);
    setArquivos([]);
    setAluno("");
    setAvisos([]);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <section className="self-start rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-800">
          <FileCheck2 className="h-5 w-5 text-violet-500" /> Corrigir prova
        </h2>
        <p className="mb-5 text-sm text-slate-600">Envie as fotos da prova respondida pelo aluno (qualquer prova, feita fora do EduGera). A IA corrige questão a questão e você confere. O Grátis tem 1 correção por mês.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo rotulo="Disciplina">
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
          <Campo rotulo="Valor da prova">
            <select className="ipt" value={f.valorTotal} onChange={(e) => setF((x) => ({ ...x, valorTotal: Number(e.target.value) }))}>
              {VALORES_PROVA.map((v) => <option key={v} value={v}>{v} {v === 1 ? "ponto" : "pontos"}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Aluno(a)" opcional>
            <input className="ipt" value={aluno} onChange={(e) => setAluno(e.target.value.slice(0, 80))} placeholder="Fica só neste navegador" />
          </Campo>
          <Campo rotulo="Turma" opcional>
            <input className="ipt" value={turma} onChange={(e) => setTurma(e.target.value.slice(0, 40))} placeholder='Ex.: "7º B"' />
          </Campo>
          <div className="sm:col-span-2">
            <Campo rotulo="Gabarito" opcional>
              <textarea className="ipt min-h-[90px]" value={f.gabarito} onChange={set("gabarito")} maxLength={LIMITES_CORRECAO_PROVA.gabarito} placeholder={"Ex.:\n1) C   2) A   3) 16   4) Tem só dois divisores: 1 e ele mesmo"} />
            </Campo>
            <p className="mt-1 text-[11.5px] text-slate-600">Sem gabarito, a IA resolve as questões antes de corrigir (confira com mais atenção).</p>
          </div>
          <div className="sm:col-span-2">
            <Campo rotulo="Orientações" opcional>
              <input className="ipt" value={f.observacoes} onChange={set("observacoes")} maxLength={LIMITES_CORRECAO_PROVA.observacoes} placeholder="Ex.: aceitar resposta sem unidade; questão 5 vale 3 pontos." />
            </Campo>
          </div>
          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">Prova respondida</span>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-4 text-sm font-semibold text-indigo-700 hover:border-indigo-400">
              <Camera className="h-5 w-5" aria-hidden="true" /> Tirar foto ou escolher arquivos
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf" multiple capture="environment" className="sr-only" onChange={(e) => { escolher(e.target.files); e.target.value = ""; }} />
            </label>
            {arquivos.length > 0 && (
              <ul className="mt-2 space-y-1 text-[12.5px] text-slate-700">
                {arquivos.map((a, i) => (
                  <li key={`${a.name}-${i}`} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate">{i + 1}. {a.name}</span>
                    <button type="button" className="text-slate-500 hover:text-rose-600" aria-label={`Tirar ${a.name}`} onClick={() => setArquivos(arquivos.filter((_, k) => k !== i))}><X className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-[11.5px] text-slate-600">Até {MAX_FOTOS} fotos (uma por página, na ordem) ou 1 PDF. Foto de cima, folha inteira e boa luz. As fotos não ficam guardadas.</p>
          </div>
        </div>
        {erro && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {erro}
          </p>
        )}
        <button type="button" onClick={corrigir} disabled={enviando} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 py-3.5 font-bold text-white shadow-lg shadow-indigo-200 disabled:opacity-75">
          {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileCheck2 className="h-5 w-5" />}
          {enviando ? "Lendo e corrigindo a prova…" : "Corrigir prova"}
        </button>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" aria-live="polite">
        {!cp ? (
          <p className="text-sm text-slate-600">A correção aparece aqui. Você pode mudar a situação ou os pontos de qualquer questão antes de imprimir.</p>
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => imprimirHtml(html(), () => setErro("Não foi possível abrir a impressão. Use Baixar página."))} className="btn-prev"><Printer className="h-3.5 w-3.5" /> Imprimir / salvar PDF</button>
              <button type="button" onClick={() => baixarHtml(html(), `correcao-${aluno || "prova"}`)} className="btn-prev"><Download className="h-3.5 w-3.5" /> Baixar página</button>
              <button type="button" onClick={proximaProva} className="btn-prev"><Camera className="h-3.5 w-3.5" /> Próxima prova</button>
            </div>
            {avisos.length > 0 && (
              <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-900"><Info className="mt-0.5 h-4 w-4 shrink-0" /> Confira: {avisos.join("; ")}.</p>
            )}
            <p className="text-center text-3xl font-extrabold text-slate-800">{br(cp.nota)} <span className="text-lg font-bold text-slate-500">/ {br(cp.valorTotal)}</span></p>
            <p className="mb-3 text-center text-[13px] text-slate-600">{[aluno, turma, `${cp.percentual}%`, `${cp.conta.certa} certa(s)`, cp.conta.parcial ? `${cp.conta.parcial} parcial(is)` : "", `${cp.conta.errada + cp.conta.em_branco} errada(s)/em branco`].filter(Boolean).join(" · ")}</p>
            <ul className="space-y-2">
              {cp.questoes.map((q, i) => (
                <li key={i} className="rounded-xl border border-slate-200 p-3 text-[13.5px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-slate-800">Questão {q.numero}</b>
                    {q.assunto && <span className="text-slate-500">— {q.assunto}</span>}
                    <span className="ml-auto flex items-center gap-1.5">
                      <select aria-label={`Situação da questão ${q.numero}`} className={`rounded-lg border-0 px-2 py-1 text-[12.5px] font-bold ${COR[q.situacao]}`} value={q.situacao} onChange={(e) => ajustar(i, { situacao: e.target.value })}>
                        {SITUACOES.map((s) => <option key={s} value={s}>{ROTULO_SITUACAO[s]}</option>)}
                      </select>
                      <input aria-label={`Pontos da questão ${q.numero}`} type="number" min="0" max={q.valor} step="0.1" value={q.pontos} disabled={q.situacao !== "parcial"} onChange={(e) => ajustar(i, { pontos: e.target.value })} className="w-16 rounded-lg border border-slate-200 px-1.5 py-1 text-right disabled:bg-slate-50" />
                      <span className="text-slate-500">/ {br(q.valor)}</span>
                    </span>
                  </div>
                  <p className="mt-1"><span className="text-slate-500">Aluno:</span> {q.respostaAluno || "—"}</p>
                  <p><span className="text-slate-500">Esperada:</span> {q.respostaEsperada || "—"}</p>
                  {q.comentario && <p className="text-slate-600">{q.comentario}</p>}
                </li>
              ))}
            </ul>
            {(cp.pontosFortes.length > 0 || cp.aMelhorar.length > 0) && (
              <div className="mt-4 grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
                {cp.pontosFortes.length > 0 && <div><b className="text-emerald-800">Pontos fortes</b><ul className="ml-5 list-disc">{cp.pontosFortes.map((x, k) => <li key={k}>{x}</li>)}</ul></div>}
                {cp.aMelhorar.length > 0 && <div><b className="text-rose-800">A melhorar</b><ul className="ml-5 list-disc">{cp.aMelhorar.map((x, k) => <li key={k}>{x}</li>)}</ul></div>}
              </div>
            )}
            {cp.devolutiva && <p className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-[13.5px] text-indigo-950"><b>Devolutiva para o aluno:</b> {cp.devolutiva}</p>}
            <p className="mt-4 text-[12px] text-slate-500">Correção feita com apoio de IA. Confira antes de lançar a nota.</p>
          </div>
        )}
      </section>

      {salvas.length > 0 && (
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-slate-800"><FolderOpen className="h-5 w-5 text-violet-500" /> Provas corrigidas ({salvas.length})</h2>
          <p className="mb-3 text-[12.5px] text-slate-600">Ficam salvas neste navegador (as {MAX_SALVAS} mais recentes).</p>
          <ul className="divide-y divide-slate-100">
            {salvas.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <b className="text-slate-800">{s.aluno || "Aluno sem nome"}</b>
                  <span className="text-slate-500"> · {[s.turma, s.disciplina, `nota ${br(s.correcao.nota)}/${br(s.correcao.valorTotal)}`, new Date(s.criadoEm).toLocaleDateString("pt-BR")].filter(Boolean).join(" · ")}</span>
                </span>
                <button type="button" onClick={() => { setCp(s.correcao); setIdAtual(s.id); setAluno(s.aluno || ""); setTurma(s.turma || ""); setAvisos([]); }} className="btn-prev">Abrir</button>
                <button type="button" onClick={() => { const l = salvas.filter((x) => x.id !== s.id); gravarSalvas(l); setSalvas(l); }} className="btn-prev" aria-label={`Remover a correção de ${s.aluno || "aluno sem nome"}`}><Trash2 className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
