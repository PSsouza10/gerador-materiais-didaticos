"use client";
import React, { useEffect, useState } from "react";
import { ClipboardList, Loader2, Printer, Copy, Check, AlertCircle, Info, BookMarked, FileUp, PenLine, FileText, ShieldCheck, Trash2, FolderOpen, Lock } from "lucide-react";
import SeletorBNCC from "@/components/SeletorBNCC";
import { DISCIPLINAS, NIVEIS } from "@/lib/opcoes";
import { ANOS_POR_NIVEL } from "@/lib/bncc";
import { AULAS, LIMITES_PLANO, planoParaTexto, adicionarPlanoNaLista, urlIlustracaoValida } from "@/lib/planoAula";

// Planos salvos NESTE navegador (como as preferências): não vão para o servidor
const K_PLANOS = "edugera:planos";
const lerPlanos = () => {
  try {
    const v = JSON.parse(window.localStorage.getItem(K_PLANOS) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const gravarPlanos = (l) => {
  try {
    window.localStorage.setItem(K_PLANOS, JSON.stringify(l));
  } catch {
    /* armazenamento cheio ou bloqueado: segue sem salvar */
  }
};
const nomeArquivo = (pl) => `plano-de-aula-${String(pl.identificacao.tema || "edugera").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").slice(0, 50)}`;

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
<h1>PLANO DE AULA</h1>${urlIlustracaoValida(pl.ilustracao) ? `<p style="text-align:center"><img src="${esc(pl.ilustracao)}" alt="" style="max-width:70%;max-height:220px"></p>` : ""}<table>${linha("Professor(a)", i.professor)}${linha("Escola", i.escola)}${linha("Turma", i.turma)}${linha("Componente curricular", i.componente)}${linha("Etapa / ano", i.etapa)}${linha("Período", i.periodo)}${linha("Número de aulas", String(i.aulas))}${linha("Tema", i.tema)}</table>
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

const PDF_MAX = 3 * 1024 * 1024;
const FONTES = [
  { id: "tema", rotulo: "Tema livre", icone: PenLine },
  { id: "apostila", rotulo: "Apostila do EduGera", icone: BookMarked },
  { id: "pdf", rotulo: "Anexar PDF", icone: FileUp },
];

export default function PlanoAula({ professorPadrao = "", escolaPadrao = "", materiais = [], aoGerar, pdfLiberado = true, inicial = null }) {
  const [fonte, setFonte] = useState("tema");
  const [apostila, setApostila] = useState("");
  const [pdf, setPdf] = useState(null); // { nome, base64, tamanho }
  const [f, setF] = useState({ professor: professorPadrao, escola: escolaPadrao, turma: "", disciplina: "Matemática", nivel: "Ensino Fundamental", ano: "", bncc: "", habilidade: "", tema: "", aulas: 2, periodo: "", observacoes: "" });
  // veio de uma página pública (/bncc): já abre com a habilidade e o ano
  useEffect(() => {
    if (inicial) setF((x) => ({ ...x, ...(inicial.disciplina ? { disciplina: inicial.disciplina } : {}), nivel: inicial.nivel || x.nivel, ano: inicial.ano || x.ano, bncc: inicial.bncc || x.bncc }));
  }, [inicial]);
  const [plano, setPlano] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [correcoes, setCorrecoes] = useState(null); // null = sem revisão; [] = revisado sem correções
  const [salvos, setSalvos] = useState([]);
  const [baixando, setBaixando] = useState(false);
  const [comIlustracao, setComIlustracao] = useState(false); // opção paga: desmarcada por padrão
  const [ilustrando, setIlustrando] = useState(false);
  useEffect(() => setSalvos(lerPlanos()), []);
  const set = (k) => (e) =>
    setF((x) => {
      const n = { ...x, [k]: e.target.value };
      if (k === "nivel" && !(ANOS_POR_NIVEL[n.nivel] || []).some((a) => a.valor === n.ano)) n.ano = "";
      return n;
    });

  const escolherApostila = (id) => {
    setApostila(id);
    const m = materiais.find((x) => x.id === id);
    if (m) setF((x) => ({ ...x, disciplina: m.disciplina || x.disciplina, nivel: m.nivel || x.nivel, ano: m.ano || "", bncc: m.bncc || "", habilidade: "", tema: m.tema || m.titulo || x.tema }));
  };
  const escolherPdf = (arq) => {
    setErro("");
    if (!arq) return setPdf(null);
    if (arq.type && arq.type !== "application/pdf") return setErro("Escolha um arquivo PDF.");
    if (arq.size > PDF_MAX) return setErro("O PDF passa de 3 MB. Tente um arquivo menor ou só as páginas necessárias.");
    const leitor = new FileReader();
    leitor.onload = () => setPdf({ nome: arq.name, base64: String(leitor.result).split(",")[1] || "", tamanho: arq.size });
    leitor.onerror = () => setErro("Não foi possível ler o PDF.");
    leitor.readAsDataURL(arq);
  };

  const gerar = async () => {
    if (fonte === "apostila" && !apostila) return setErro("Escolha uma apostila.");
    if (fonte === "pdf" && !pdfLiberado) return setErro("O plano de aula a partir de PDF é do plano Pro.");
    if (fonte === "pdf" && !pdf) return setErro("Anexe o PDF.");
    if (fonte === "tema" && !f.tema.trim()) return setErro("Preencha o tema.");
    setErro("");
    setGerando(true);
    const corpo = { ...f, fonte: fonte === "apostila" ? { tipo: "apostila", id: apostila } : fonte === "pdf" ? { tipo: "pdf", nome: pdf.nome, base64: pdf.base64 } : null };
    try {
      const r = await fetch("/api/gerar-plano", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        // respostas da própria Vercel (sem JSON): pedido grande demais ou tempo esgotado
        const codigo = r.headers.get("x-request-id") || r.headers.get("x-vercel-id") || "";
        const msg =
          j.error ||
          (r.status === 413
            ? "O PDF ficou grande demais para enviar. Tente um arquivo menor ou só as páginas do conteúdo da aula."
            : r.status === 504
              ? "A IA demorou demais para ler o material. Tente de novo; se for PDF, envie só as páginas do conteúdo da aula."
              : `Não foi possível gerar o plano (erro ${r.status}).`);
        throw new Error(codigo ? `${msg} (código: ${codigo.slice(0, 40)})` : msg);
      }
      let pl = j.plano;
      setPlano(pl);
      setAvisos(j.avisos || []);
      setCorrecoes(j.revisado ? j.correcoes || [] : null);
      // ilustração nova só se o professor marcou e a apostila não trouxe uma
      if (comIlustracao && !pl.ilustracao) {
        setIlustrando(true);
        try {
          const ri = await fetch("/api/gerar-imagem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tema: pl.identificacao.tema, disciplina: pl.identificacao.componente, estilo: "Vetor Ilustrado", capa: "escolar" }) });
          const ji = await ri.json().catch(() => ({}));
          if (ri.ok && urlIlustracaoValida(ji.urlImagem)) {
            pl = { ...pl, ilustracao: ji.urlImagem };
            setPlano(pl);
          } else if (!ri.ok) setAvisos((a) => [...a, `ilustração não gerada (${ji.error || "erro"})`]);
        } catch {
          setAvisos((a) => [...a, "ilustração não gerada (sem conexão)"]);
        } finally {
          setIlustrando(false);
        }
      }
      const origem = fonte === "apostila" ? { tipo: "apostila", id: apostila, titulo: materiais.find((m) => m.id === apostila)?.titulo || "" } : fonte === "pdf" ? { tipo: "pdf", titulo: pdf?.nome || "" } : null;
      const nova = adicionarPlanoNaLista(lerPlanos(), pl, origem);
      gravarPlanos(nova);
      setSalvos(nova);
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
  const baixarWord = async () => {
    setBaixando(true);
    try {
      const { planoParaDocx } = await import("@/lib/planoDocx");
      const blob = await planoParaDocx(plano);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${nomeArquivo(plano)}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) {
      console.error(e);
      setErro("Não foi possível gerar o arquivo do Word.");
    } finally {
      setBaixando(false);
    }
  };
  const abrirSalvo = (item) => {
    setPlano(item.plano);
    setAvisos([]);
    setCorrecoes(null);
  };
  const removerSalvo = (id) => {
    const nova = salvos.filter((x) => x.id !== id);
    gravarPlanos(nova);
    setSalvos(nova);
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
        <fieldset className="mb-5">
          <legend className="mb-2 text-xs font-bold text-slate-600">O plano parte de:</legend>
          <div className="grid grid-cols-3 gap-2">
            {FONTES.map(({ id, rotulo, icone: Icone }) => (
              <label key={id} className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-2.5 text-center text-[12.5px] font-semibold ${fonte === id ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-slate-200 text-slate-700 hover:border-indigo-200"}`}>
                <input type="radio" name="fonte-plano" value={id} checked={fonte === id} onChange={() => setFonte(id)} className="sr-only" />
                <Icone className="h-4 w-4" aria-hidden="true" /> {rotulo}
                {id === "pdf" && !pdfLiberado && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-900">
                    <Lock className="h-3 w-3" aria-hidden="true" /> Pro
                  </span>
                )}
              </label>
            ))}
          </div>
          {fonte === "apostila" && (
            <div className="mt-3">
              {materiais.length ? (
                <select className="ipt" value={apostila} onChange={(e) => escolherApostila(e.target.value)} aria-label="Apostila">
                  <option value="">Escolha uma apostila…</option>
                  {materiais.map((m) => <option key={m.id} value={m.id}>{m.titulo || m.tema}{m.ano ? ` — ${m.ano}º` : ""}</option>)}
                </select>
              ) : (
                <p className="text-[13px] text-slate-600">Você ainda não tem apostilas em “Minhas Apostilas”. Gere uma primeiro ou use outra opção.</p>
              )}
              <p className="mt-1 text-[11.5px] text-slate-600">O plano usa os conceitos, a situação e os exercícios da apostila.</p>
            </div>
          )}
          {fonte === "pdf" && !pdfLiberado && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-950">
              <p className="flex items-start gap-2 font-semibold">
                <Lock className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" /> Disponível no plano Pro
              </p>
              <p className="mt-1">
                No Pro, o plano sai do seu próprio material: livro, apostila da rede ou qualquer PDF. No seu plano, gere a partir de um tema ou de uma apostila do EduGera.
              </p>
              <a href="/planos" className="mt-2 inline-block font-semibold underline">Ver planos</a>
            </div>
          )}
          {fonte === "pdf" && pdfLiberado && (
            <div className="mt-3">
              <input type="file" accept="application/pdf,.pdf" onChange={(e) => escolherPdf(e.target.files?.[0])} className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-semibold file:text-indigo-700" aria-label="PDF do material" />
              {pdf && <p className="mt-1 text-[12px] text-slate-700">{pdf.nome} · {(pdf.tamanho / 1024 / 1024).toFixed(1)} MB</p>}
              <p className="mt-1 text-[11.5px] text-slate-600">Até 3 MB. O PDF é lido pela IA só para montar o plano e não fica guardado. Evite PDFs com nomes ou dados de alunos.</p>
            </div>
          )}
        </fieldset>
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
            <Campo rotulo="Tema" opcional={fonte !== "tema"}>
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
        {fonte !== "apostila" ? (
          <label className="mt-4 flex items-start gap-2 text-[13px] text-slate-700">
            <input type="checkbox" checked={comIlustracao} onChange={(e) => setComIlustracao(e.target.checked)} className="mt-0.5" />
            <span>
              Incluir ilustração do tema <span className="text-slate-500">(gera uma imagem com IA; usa a ilustração da sua geração)</span>
            </span>
          </label>
        ) : (
          <p className="mt-4 text-[12.5px] text-slate-600">Se a apostila tiver ilustração, ela entra no plano automaticamente.</p>
        )}
        {erro && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {erro}
          </p>
        )}
        <button type="button" onClick={gerar} disabled={gerando} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 py-3.5 font-bold text-white shadow-lg shadow-indigo-200 disabled:opacity-75">
          {gerando ? <Loader2 className="h-5 w-5 animate-spin" /> : <ClipboardList className="h-5 w-5" />}
          {ilustrando ? "Gerando a ilustração…" : gerando ? "Gerando e revisando o plano…" : plano ? "Gerar novamente" : "Gerar plano de aula"}
        </button>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" aria-live="polite">
        {!plano ? (
          <p className="text-sm text-slate-600">O plano aparece aqui. Depois você imprime, salva em PDF ou copia o texto para o modelo da sua escola.</p>
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" onClick={baixarWord} disabled={baixando} className="btn-prev">{baixando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} Baixar Word</button>
              <button type="button" onClick={imprimir} className="btn-prev"><Printer className="h-3.5 w-3.5" /> Imprimir / salvar PDF</button>
              <button type="button" onClick={copiar} className="btn-prev">{copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copiado ? "Copiado" : "Copiar texto"}</button>
            </div>
            {correcoes && (
              <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-900">
                <p className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="h-4 w-4" /> Revisado automaticamente{correcoes.length ? `: ${correcoes.length} ${correcoes.length === 1 ? "correção" : "correções"}` : ", sem correções"}</p>
                {correcoes.length > 0 && <ul className="ml-5 mt-1 list-disc">{correcoes.map((c, k) => <li key={k}>{c}</li>)}</ul>}
              </div>
            )}
            {avisos.length > 0 && (
              <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-900"><Info className="mt-0.5 h-4 w-4 shrink-0" /> Confira: {avisos.join("; ")}.</p>
            )}
            <article className="space-y-3 text-[14px] leading-relaxed text-slate-800">
              <h3 className="text-center text-base font-extrabold">PLANO DE AULA — {plano.identificacao.tema}</h3>
              {urlIlustracaoValida(plano.ilustracao) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={plano.ilustracao} alt={`Ilustração sobre ${plano.identificacao.tema}`} className="mx-auto max-h-56 rounded-xl object-contain" />
              )}
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

      {salvos.length > 0 && (
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-slate-800"><FolderOpen className="h-5 w-5 text-violet-500" /> Meus planos ({salvos.length})</h2>
          <p className="mb-3 text-[12.5px] text-slate-600">Ficam salvos neste navegador. Para guardar em outro lugar, baixe em Word ou PDF.</p>
          <ul className="divide-y divide-slate-100">
            {salvos.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <b className="text-slate-800">{s.plano.identificacao.tema}</b>
                  <span className="text-slate-500"> · {[s.plano.identificacao.componente, s.plano.identificacao.etapa].filter(Boolean).join(" · ")} · {new Date(s.criadoEm).toLocaleDateString("pt-BR")}</span>
                  {s.origem?.titulo && <span className="block text-[12px] text-slate-500">A partir de: {s.origem.tipo === "pdf" ? "PDF" : "apostila"} “{s.origem.titulo}”</span>}
                </span>
                <button type="button" onClick={() => abrirSalvo(s)} className="btn-prev">Abrir</button>
                <button type="button" onClick={() => removerSalvo(s.id)} className="btn-prev" aria-label={`Remover o plano ${s.plano.identificacao.tema}`}><Trash2 className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
