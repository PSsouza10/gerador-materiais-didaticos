"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Lock, Camera, Loader2, Trash2, Download, FileSpreadsheet, UserPlus, BarChart3, AlertTriangle, Pencil } from "lucide-react";
import { LETRAS_CARTAO, BRANCO, DUPLA, FAIXAS, faixaDe, lerRespostasTexto, respostasParaTexto, corrigirAluno, relatorioTurma, relatorioCsv } from "@/lib/correcao";
import { exportarPdf } from "@/lib/pdf";
import { slugify } from "@/lib/material";

// Correção da turma: o professor lança as respostas de cada aluno (foto do cartão ou digitando)
// e recebe a nota de cada um e o relatório por habilidade/descritor, com o que reforçar.
// Os nomes dos alunos ficam SÓ neste navegador; a foto é lida e descartada.
const chave = (id) => `edugera:correcao:${id}`;
const ler = (id) => {
  try {
    const v = JSON.parse(window.localStorage.getItem(chave(id)) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const gravar = (id, l) => {
  try {
    window.localStorage.setItem(chave(id), JSON.stringify(l));
  } catch {
    /* armazenamento cheio ou bloqueado */
  }
};

const COR_FAIXA = {
  adequado: "bg-emerald-100 text-emerald-900",
  atencao: "bg-amber-100 text-amber-900",
  reforcar: "bg-rose-100 text-rose-900",
};
const BARRA_FAIXA = { adequado: "#059669", atencao: "#d97706", reforcar: "#e11d48" };
const rotuloFaixa = (id) => FAIXAS.find((f) => f.id === id)?.rotulo || id;

// Reduz a foto antes de enviar (celular tira fotos de 4–12 MB)
async function fotoParaJpeg(arquivo, lado = 1600) {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = falha;
      i.src = url;
    });
    const k = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const AVISO_PRO = {
  foto: "A correção pela foto do cartão é do plano Pro. No Grátis, marque as respostas de cada aluno nas bolinhas ou digite em sequência (ex.: ABCDA).",
  relatorio: "Baixar o relatório da turma em PDF e planilha é do plano Pro. No Grátis, o relatório completo aparece aqui na tela.",
};

const vazio = (n) => ({ id: null, numero: "", nome: "", respostas: Array(n).fill(BRANCO) });

export default function CorrecaoTurma({ avaliacao, avId, pro = true }) {
  const n = avaliacao?.itens?.length || 0;
  const [alunos, setAlunos] = useState([]);
  const [atual, setAtual] = useState(vazio(n));
  const [duvidas, setDuvidas] = useState([]);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState("");
  const [baixando, setBaixando] = useState(false);
  const fotoRef = useRef(null);
  const relRef = useRef(null);

  useEffect(() => {
    setAlunos(avId ? ler(avId) : []);
    setAtual(vazio(n));
    setDuvidas([]);
    setErro("");
  }, [avId, n]);

  const salvarLista = (l) => {
    setAlunos(l);
    if (avId) gravar(avId, l);
  };
  const rel = useMemo(() => relatorioTurma(avaliacao, alunos), [avaliacao, alunos]);
  const parcial = corrigirAluno(avaliacao, atual.respostas);

  const marcar = (i, l) => {
    setAtual((a) => ({ ...a, respostas: a.respostas.map((x, k) => (k === i ? (x === l ? BRANCO : l) : x)) }));
    setDuvidas((d) => d.filter((x) => x !== i + 1));
  };

  async function lerFoto(e) {
    const arq = e.target.files?.[0];
    e.target.value = "";
    if (!arq) return;
    setErro("");
    setLendo(true);
    try {
      const imagem = await fotoParaJpeg(arq);
      const r = await fetch("/api/ler-cartao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagem, mime: "image/jpeg", itens: n }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Não foi possível ler a foto (erro ${r.status}).`);
      setAtual((a) => ({ ...a, numero: a.numero || j.numero || "", respostas: j.respostas.map((x) => (x === "?" ? BRANCO : x)) }));
      setDuvidas(j.duvidas || []);
    } catch (err) {
      setErro(err instanceof TypeError ? "Sem conexão com o servidor." : err.message);
    } finally {
      setLendo(false);
    }
  }

  const salvarAluno = () => {
    if (!atual.nome.trim() && !atual.numero.trim()) return setErro("Escreva o nome ou o número do aluno.");
    if (duvidas.length) return setErro(`Confira a(s) questão(ões) ${duvidas.join(", ")}: a leitura da foto ficou em dúvida.`);
    setErro("");
    const registro = { ...atual, nome: atual.nome.trim(), numero: atual.numero.trim(), id: atual.id || `al-${Date.now().toString(36)}` };
    salvarLista(atual.id ? alunos.map((a) => (a.id === atual.id ? registro : a)) : [...alunos, registro]);
    setAtual(vazio(n));
  };
  const editar = (a) => {
    setAtual({ ...a, respostas: Array.from({ length: n }, (_, i) => a.respostas[i] || BRANCO) });
    setDuvidas([]);
  };
  const remover = (id) => {
    if (window.confirm("Remover este aluno da correção?")) salvarLista(alunos.filter((a) => a.id !== id));
  };

  const base = `correcao-${slugify(avaliacao?.identificacao?.tema || avaliacao?.titulo || "") || "avaliacao"}`.slice(0, 60);
  const baixarCsv = () => {
    const blob = new Blob([relatorioCsv(avaliacao, rel)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${base}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const baixarPdf = async () => {
    if (!relRef.current) return;
    setBaixando(true);
    try {
      await exportarPdf(relRef.current, `${base}.pdf`, { titulo: `Relatório da turma · ${avaliacao.titulo}`, autor: avaliacao.identificacao?.professor });
    } catch (e) {
      console.error("PDF do relatório:", e);
      setErro("Não foi possível gerar o PDF do relatório.");
    } finally {
      setBaixando(false);
    }
  };

  if (!n) return null;
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2" aria-label="Correção da turma">
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-slate-800">
        <BarChart3 className="h-5 w-5 text-violet-500" /> Correção da turma
      </h2>
      <p className="mb-4 text-[12.5px] text-slate-600">
        Depois de aplicar, lance o cartão-resposta de cada aluno: tire uma <b>foto do cartão</b> ou marque as letras. O EduGera dá a nota e mostra quais habilidades a turma precisa retomar. Os nomes ficam só neste navegador; a foto é lida e descartada.
      </p>

      {/* ---------- lançar um aluno ---------- */}
      <div className="rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="w-20">
            <span className="mb-1 block text-xs font-bold text-slate-600">Nº</span>
            <input value={atual.numero} onChange={(e) => setAtual((a) => ({ ...a, numero: e.target.value.replace(/\D/g, "").slice(0, 3) }))} inputMode="numeric" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="min-w-[10rem] flex-1">
            <span className="mb-1 block text-xs font-bold text-slate-600">Nome do aluno</span>
            <input value={atual.nome} onChange={(e) => setAtual((a) => ({ ...a, nome: e.target.value.slice(0, 80) }))} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          </label>
          <input ref={fotoRef} type="file" accept="image/*" capture="environment" onChange={lerFoto} className="hidden" />
          <button
            type="button"
            onClick={() => (pro ? fotoRef.current?.click() : setErro(AVISO_PRO.foto))}
            disabled={lendo}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-60 ${pro ? "bg-indigo-600 text-white" : "border border-indigo-200 bg-indigo-50 text-indigo-700"}`}
          >
            {lendo ? <Loader2 className="h-4 w-4 animate-spin" /> : pro ? <Camera className="h-4 w-4" /> : <Lock className="h-4 w-4" />} {lendo ? "Lendo o cartão…" : pro ? "Foto do cartão" : "Foto do cartão (Pro)"}
          </button>
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-bold text-slate-600">
            Respostas em sequência <span className="font-normal text-slate-500">(ex.: ABCDA; use - para branco e * para dupla marcação)</span>
          </span>
          <input value={respostasParaTexto(atual.respostas)} onChange={(e) => setAtual((a) => ({ ...a, respostas: lerRespostasTexto(e.target.value, n) }))} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-sm uppercase tracking-[0.3em]" aria-label="Respostas em sequência" />
        </label>
        <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-x-4 gap-y-1">
          {atual.respostas.map((r, i) => (
            <div key={i} className={`flex items-center gap-1 rounded-md px-1 py-0.5 ${duvidas.includes(i + 1) ? "bg-amber-100 ring-1 ring-amber-400" : ""}`}>
              <span className="w-6 text-[12px] font-bold text-slate-600">{String(i + 1).padStart(2, "0")}</span>
              {LETRAS_CARTAO.map((l) => (
                <button key={l} type="button" onClick={() => marcar(i, l)} aria-pressed={r === l} aria-label={`Questão ${i + 1}, letra ${l}`} className={`h-6 w-6 rounded-full border text-[11px] font-bold ${r === l ? "border-slate-800 bg-slate-800 text-white" : "border-slate-400 text-slate-600"}`}>
                  {l}
                </button>
              ))}
              {r === DUPLA && <span className="text-[11px] font-bold text-rose-700">dupla</span>}
            </div>
          ))}
        </div>
        {duvidas.length > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" /> A foto ficou em dúvida na(s) questão(ões) {duvidas.join(", ")}: marque à mão olhando o cartão.
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={salvarAluno} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white">
            <UserPlus className="h-4 w-4" /> {atual.id ? "Salvar alteração" : "Salvar aluno"}
          </button>
          {atual.id && (
            <button type="button" onClick={() => setAtual(vazio(n))} className="btn-prev">
              Cancelar edição
            </button>
          )}
          {atual.respostas.some((r) => r !== BRANCO) && (
            <span className="text-[12.5px] text-slate-600">
              Prévia: {parcial.acertos}/{parcial.total} acertos · nota {String(parcial.nota).replace(".", ",")}
            </span>
          )}
        </div>
        {erro && <MsgErro erro={erro} />}
      </div>

      {/* ---------- relatório ---------- */}
      {alunos.length > 0 && (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <p className="mr-auto text-sm font-bold text-slate-800">
              {alunos.length} aluno(s) lançado(s) · média {String(rel.media).replace(".", ",")}
            </p>
            <button type="button" onClick={() => (pro ? baixarPdf() : setErro(AVISO_PRO.relatorio))} disabled={baixando} className="btn-prev">
              {baixando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : pro ? <Download className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />} Relatório (PDF){pro ? "" : " · Pro"}
            </button>
            <button type="button" onClick={() => (pro ? baixarCsv() : setErro(AVISO_PRO.relatorio))} className="btn-prev">
              {pro ? <FileSpreadsheet className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />} Planilha (Excel){pro ? "" : " · Pro"}
            </button>
          </div>
          {erro === AVISO_PRO.relatorio && <MsgErro erro={erro} />}
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
            <div ref={relRef} className="folha-a4 !min-h-0 bg-white text-slate-800">
              <Relatorio avaliacao={avaliacao} rel={rel} aoEditar={editar} aoRemover={remover} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function MsgErro({ erro }) {
  const pro = Object.values(AVISO_PRO).includes(erro);
  return (
    <p className={`mt-2 text-[12.5px] font-semibold ${pro ? "rounded-lg bg-indigo-50 px-2 py-1.5 text-indigo-900" : "text-rose-700"}`}>
      {erro}{" "}
      {pro && (
        <a href="/planos" className="underline">
          Ver o plano Pro
        </a>
      )}
    </p>
  );
}

function Relatorio({ avaliacao, rel, aoEditar, aoRemover }) {
  const id = avaliacao.identificacao || {};
  return (
    <div className="text-[12.5px]">
      <header className="cabecalho-escola border-b-2 border-slate-300 pb-2">
        <p className="text-[15px] font-extrabold">Relatório da turma · {avaliacao.titulo}</p>
        <p className="text-slate-600">{[id.escola, id.componente, id.etapa, id.turma && `Turma ${id.turma}`, id.professor && `Prof.(ª) ${id.professor.replace(/^prof\.?\(?ª?\)?\s*/i, "")}`].filter(Boolean).join(" · ")}</p>
        <p className="mt-1 text-slate-700">
          {rel.alunos} aluno(s) · média <b>{String(rel.media).replace(".", ",")}</b> ·{" "}
          {FAIXAS.map((f) => `${rel.faixasAlunos[f.id]} ${f.rotulo.toLowerCase()}`).join(" · ")}
          <span className="text-slate-500"> (adequado: 70% ou mais; atenção: 50% a 69%; reforçar: abaixo de 50%)</span>
        </p>
      </header>

      {rel.sugestoes.length > 0 && (
        <section className="bloco-exercicio mt-4">
          <h3 className="mb-1 text-[13.5px] font-extrabold">O que retomar com a turma</h3>
          <ol className="ml-5 list-decimal space-y-1.5">
            {rel.sugestoes.map((s) => (
              <li key={s.codigo}>
                <b>{s.codigo}</b>
                {s.descritores.length > 0 && ` — ${s.descritores.slice(0, 3).join("; ")}${s.descritores.length > 3 ? "…" : ""}`} ·{" "}
                <span className={`rounded px-1.5 py-0.5 text-[11.5px] font-bold ${COR_FAIXA[s.faixa]}`}>
                  {s.percentual}% · {rotuloFaixa(s.faixa)}
                </span>
                {s.erro && (
                  <span className="block text-slate-700">
                    Questão {s.questao} (a de menor acerto{s.descritorDaQuestao ? `: ${s.descritorDaQuestao}` : ""}) — {s.erro}
                  </span>
                )}
                {s.alunos.length > 0 && <span className="block text-slate-600">Alunos para acompanhar: {s.alunos.join(", ")}.</span>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="bloco-exercicio mt-4">
        <h3 className="mb-1 text-[13.5px] font-extrabold">Acerto por habilidade</h3>
        <table className="w-full border-collapse">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1">Habilidade</th>
              <th>Descritor</th>
              <th>Questões</th>
              <th className="w-48">Acerto</th>
            </tr>
          </thead>
          <tbody>
            {rel.porHabilidade.map((h) => (
              <tr key={h.codigo} className="border-t border-slate-200">
                <td className="py-1 font-bold">{h.codigo}</td>
                <td>{h.descritores.slice(0, 2).join("; ")}{h.descritores.length > 2 ? ` (+${h.descritores.length - 2})` : ""}</td>
                <td>{h.itens.join(", ")}</td>
                <td>
                  <Barra pct={h.percentual} faixa={h.faixa} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bloco-exercicio mt-4">
        <h3 className="mb-1 text-[13.5px] font-extrabold">Acerto por questão</h3>
        <table className="w-full border-collapse">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1">Q</th>
              <th>Gab.</th>
              <th>A · B · C · D · branco · dupla</th>
              <th className="w-44">Acerto</th>
              <th>Erro mais comum</th>
            </tr>
          </thead>
          <tbody>
            {rel.porQuestao.map((q) => (
              <tr key={q.n} className="border-t border-slate-200 align-top">
                <td className="py-1 font-bold">{String(q.n).padStart(2, "0")}</td>
                <td className="font-bold">{q.correta || "—"}</td>
                <td className="whitespace-nowrap">
                  {LETRAS_CARTAO.map((l) => (
                    <span key={l} className={l === q.correta ? "font-bold text-emerald-800" : ""}>
                      {q.distribuicao[l]}
                      {" · "}
                    </span>
                  ))}
                  {q.distribuicao[BRANCO]} · {q.distribuicao[DUPLA]}
                </td>
                <td>
                  <Barra pct={q.percentual} faixa={q.faixa} />
                </td>
                <td className="text-slate-700">{q.erroMaisComum ? `${q.erroMaisComum.letra} (${q.erroMaisComum.percentual}%)${q.erroMaisComum.explicacao ? `: ${q.erroMaisComum.explicacao}` : ""}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bloco-exercicio mt-4">
        <h3 className="mb-1 text-[13.5px] font-extrabold">Notas dos alunos</h3>
        <table className="w-full border-collapse">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1">Nº</th>
              <th>Nome</th>
              <th>Respostas</th>
              <th>Acertos</th>
              <th>Nota</th>
              <th>Reforçar</th>
              <th data-html2canvas-ignore="true" />
            </tr>
          </thead>
          <tbody>
            {rel.porAluno.map((a) => (
              <tr key={a.id} className="border-t border-slate-200">
                <td className="py-1">{a.numero}</td>
                <td>{a.nome}</td>
                <td className="font-mono tracking-wider">
                  {a.porItem.map((p) => (
                    <span key={p.n} className={p.certo ? "text-emerald-800" : "font-bold text-rose-700"}>
                      {p.marcada}
                    </span>
                  ))}
                </td>
                <td>
                  {a.acertos}/{a.total}
                </td>
                <td className="font-bold">{String(a.nota).replace(".", ",")}</td>
                <td>{a.reforcar.join(", ") || "—"}</td>
                <td data-html2canvas-ignore="true" className="whitespace-nowrap text-right">
                  <button type="button" onClick={() => aoEditar(a)} className="p-1 text-slate-500 hover:text-indigo-700" aria-label={`Editar ${a.nome || a.numero}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => aoRemover(a.id)} className="p-1 text-slate-500 hover:text-rose-700" aria-label={`Remover ${a.nome || a.numero}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="mt-4 text-[11px] text-slate-500">Elaborado pelo EduGera a partir das respostas lançadas pelo professor. Branco e dupla marcação contam como erro.</p>
    </div>
  );
}

function Barra({ pct, faixa }) {
  return (
    <span className="flex items-center gap-2">
      <svg width="110" height="10" aria-hidden="true">
        <rect width="110" height="10" rx="3" fill="#e2e8f0" />
        <rect width={Math.max(0, Math.min(110, (pct / 100) * 110))} height="10" rx="3" fill={BARRA_FAIXA[faixa]} />
      </svg>
      <b>{pct}%</b>
      <span className="text-[11px] text-slate-500">{rotuloFaixa(faixaDe(pct).id)}</span>
    </span>
  );
}
