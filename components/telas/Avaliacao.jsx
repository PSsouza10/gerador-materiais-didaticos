"use client";
import React, { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  ClipboardCheck,
  Loader2,
  Download,
  KeyRound,
  AlertCircle,
  AlertTriangle,
  BookMarked,
  PenLine,
  ShieldCheck,
  Trash2,
  FolderOpen,
  Eye,
  CheckCircle2,
} from "lucide-react";
import SeletorBNCC from "@/components/SeletorBNCC";
import FolhaAvaliacao from "@/components/FolhaAvaliacao";
import CorrecaoTurma from "@/components/CorrecaoTurma";
import AjustarQuestoes from "@/components/AjustarQuestoes";
import DistribuirCaderno from "@/components/ciclo/DistribuirCaderno";
import PreviewEscalado from "@/components/PreviewEscalado";
import ZerarUsoTeste from "@/components/planos/ZerarUsoTeste";
import { DISCIPLINAS, NIVEIS } from "@/lib/opcoes";
import { ANOS_POR_NIVEL } from "@/lib/bncc";
import { conferirPedido } from "@/lib/coerencia";
import { slugify } from "@/lib/material";
import { exportarPdf } from "@/lib/pdf";
import {
  QUANTIDADES_ITENS,
  LIMITES_AVALIACAO,
  PORCENTAGENS_FIGURA,
  minimoComFigura,
  adicionarAvaliacaoNaLista,
  contarLetras,
} from "@/lib/avaliacao";

// "Avaliação": prova de múltipla escolha no padrão Prova Paulista / SARESP (conta como 1 geração).
// Fica salva NESTE navegador, como os planos de aula; o professor baixa o PDF do aluno e o do professor.
const K_AVALIACOES = "edugera:avaliacoes";
const lerSalvas = () => {
  try {
    const v = JSON.parse(window.localStorage.getItem(K_AVALIACOES) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const gravarSalvas = (l) => {
  try {
    window.localStorage.setItem(K_AVALIACOES, JSON.stringify(l));
  } catch {
    /* armazenamento cheio ou bloqueado: segue sem salvar */
  }
};

const Campo = ({ rotulo, opcional, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-bold text-slate-600">
      {rotulo}{" "}
      {opcional && (
        <span className="font-normal text-slate-500">(opcional)</span>
      )}
    </span>
    {children}
  </label>
);

const FONTES = [
  { id: "tema", rotulo: "Tema livre", icone: PenLine },
  { id: "apostila", rotulo: "Apostila do EduGera", icone: BookMarked },
];

export default function Avaliacao({
  professorPadrao = "",
  escolaPadrao = "",
  materiais = [],
  aoGerar,
  zerarTeste = false,
  correcaoPro = true,
  trocasPorProva = 3,
  inicial = null,
  coordenador = false,
}) {
  const [fonte, setFonte] = useState("tema");
  const [apostila, setApostila] = useState("");
  const [f, setF] = useState({
    professor: professorPadrao,
    escola: escolaPadrao,
    turma: "",
    disciplina: "Matemática",
    nivel: "Ensino Fundamental",
    ano: "",
    bncc: "",
    habilidade: "",
    tema: "",
    itens: 8,
    figuras: 40,
    observacoes: "",
  });
  // veio de uma página pública (/bncc, /prova-paulista): já abre com a habilidade e o ano
  useEffect(() => {
    if (inicial) setF((x) => ({ ...x, ...(inicial.disciplina ? { disciplina: inicial.disciplina } : {}), nivel: inicial.nivel || x.nivel, ano: inicial.ano || x.ano, bncc: inicial.bncc || x.bncc }));
  }, [inicial]);
  const [avaliacao, setAvaliacao] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);
  const [versao, setVersao] = useState("aluno");
  const [baixando, setBaixando] = useState(null);
  const [salvas, setSalvas] = useState([]);
  const [avId, setAvId] = useState(null); // avaliação aberta (a correção da turma fica ligada a ela)
  const folhaRef = useRef(null);
  useEffect(() => setSalvas(lerSalvas()), []);
  // veio de /caderno/<código> ("Adicionar às minhas avaliações"): abre a avaliação já salva
  useEffect(() => {
    if (!inicial?.abrir) return;
    const item = lerSalvas().find((x) => x.id === inicial.abrir);
    if (item) {
      setAvaliacao(item.avaliacao);
      setAvId(item.id);
      setAvisos([]);
      setVersao("aluno");
    }
  }, [inicial]);
  // nome e escola chegam depois (conta Google / Configurações): preenche se ainda vazio
  useEffect(() => {
    setF((x) => ({
      ...x,
      professor: x.professor || professorPadrao,
      escola: x.escola || escolaPadrao,
    }));
  }, [professorPadrao, escolaPadrao]);

  const set = (k) => (e) =>
    setF((x) => {
      const n = { ...x, [k]: e.target.value };
      if (
        k === "nivel" &&
        !(ANOS_POR_NIVEL[n.nivel] || []).some((a) => a.valor === n.ano)
      )
        n.ano = "";
      return n;
    });
  const avisosPedido = conferirPedido(f);

  const escolherApostila = (id) => {
    setApostila(id);
    const m = materiais.find((x) => x.id === id);
    if (m)
      setF((x) => ({
        ...x,
        disciplina: m.disciplina || x.disciplina,
        nivel: m.nivel || x.nivel,
        ano: m.ano || "",
        bncc: m.bncc || "",
        habilidade: "",
        tema: m.tema || m.titulo || x.tema,
      }));
  };

  const gerar = async () => {
    if (fonte === "apostila" && !apostila)
      return setErro("Escolha uma apostila.");
    if (fonte === "tema" && !f.tema.trim()) return setErro("Preencha o tema.");
    const bloqueio = avisosPedido.find((a) => a.bloqueia);
    if (bloqueio)
      return setErro(
        bloqueio.motivo.charAt(0).toUpperCase() + bloqueio.motivo.slice(1),
      );
    setErro("");
    setGerando(true);
    try {
      const corpo = {
        ...f,
        fonte: fonte === "apostila" ? { tipo: "apostila", id: apostila } : null,
      };
      const r = await fetch("/api/gerar-avaliacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok)
        throw new Error(
          j.error ||
            (r.status === 504
              ? "A IA demorou demais para responder. Tente de novo."
              : `Não foi possível gerar a avaliação (erro ${r.status}).`),
        );
      setAvaliacao(j.avaliacao);
      setAvisos(j.avisos || []);
      setVersao("aluno");
      const origem =
        fonte === "apostila"
          ? {
              tipo: "apostila",
              id: apostila,
              titulo: materiais.find((m) => m.id === apostila)?.titulo || "",
            }
          : null;
      const nova = adicionarAvaliacaoNaLista(lerSalvas(), j.avaliacao, origem);
      gravarSalvas(nova);
      setSalvas(nova);
      setAvId(nova[0]?.id || null);
      aoGerar?.();
    } catch (e) {
      setErro(
        e instanceof TypeError ? "Sem conexão com o servidor." : e.message,
      );
    } finally {
      setGerando(false);
    }
  };

  const baixarPdf = async (tipo) => {
    if (!folhaRef.current || !avaliacao) return;
    const pendentes = avisos.filter((a) => a.tipo !== "corrigido");
    if (
      pendentes.length &&
      !window.confirm(
        `Há ${pendentes.length} ponto(s) para conferir:\n\n${pendentes.map((a) => `• ${a.onde}: ${String(a.motivo).replace(/\.$/, "")}`).join("\n")}\n\nBaixar o PDF mesmo assim?`,
      )
    )
      return;
    const anterior = versao;
    setBaixando(tipo);
    flushSync(() => setVersao(tipo));
    try {
      const base =
        `avaliacao-${slugify(avaliacao.identificacao?.tema || avaliacao.titulo) || "edugera"}`.slice(
          0,
          60,
        );
      await exportarPdf(
        folhaRef.current,
        `${base}${tipo === "professor" ? "-professor" : ""}.pdf`,
        {
          titulo: avaliacao.titulo,
          assunto: [
            avaliacao.identificacao?.componente,
            avaliacao.identificacao?.tema,
          ]
            .filter(Boolean)
            .join(" · "),
          autor: avaliacao.identificacao?.professor,
        },
      );
    } catch (e) {
      console.error("Erro ao gerar PDF da avaliação:", e);
      setErro("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setVersao(anterior);
      setBaixando(null);
    }
  };

  const abrirSalva = (item) => {
    setAvaliacao(item.avaliacao);
    setAvId(item.id);
    setAvisos([]);
    setVersao("aluno");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // questão trocada ou editada: atualiza a prova aberta e a cópia salva neste navegador
  const mudarAvaliacao = (nova, i, avisosNovos = []) => {
    setAvaliacao(nova);
    setAvisos((l) => [...l.filter((a) => a.onde !== `Item ${i + 1}`), ...avisosNovos]);
    if (avId) {
      const l = lerSalvas().map((s) => (s.id === avId ? { ...s, avaliacao: nova } : s));
      gravarSalvas(l);
      setSalvas(l);
    }
  };

  const removerSalva = (id) => {
    const s = salvas.find((x) => x.id === id);
    if (
      !window.confirm(
        `Remover a avaliação "${s?.avaliacao?.titulo || ""}" e a correção da turma dela?`,
      )
    )
      return;
    const nova = salvas.filter((x) => x.id !== id);
    gravarSalvas(nova);
    setSalvas(nova);
    try {
      window.localStorage.removeItem(`edugera:correcao:${id}`);
    } catch {
      /* sem acesso ao armazenamento */
    }
    if (avId === id) setAvId(null);
  };

  const corrigidos = avisos.filter((a) => a.tipo === "corrigido");
  const graves = avisos.filter((a) => a.tipo === "erro");
  const conferir = avisos.filter(
    (a) => a.tipo !== "corrigido" && a.tipo !== "erro",
  );
  const letras = avaliacao ? contarLetras(avaliacao.itens) : null;
  // avaliação que veio de um caderno da rede (Ciclo de Recomposição)
  const salvaAberta = salvas.find((x) => x.id === avId);
  const caderno = salvaAberta?.origem?.tipo === "caderno" ? salvaAberta.origem : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="self-start rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-800">
            <ClipboardCheck className="h-5 w-5 text-violet-500" /> Avaliação no
            padrão Prova Paulista
          </h2>
          <p className="mb-5 text-sm text-slate-600">
            Questões de múltipla escolha como as da Prova Paulista e do SARESP:
            texto-base, 4 alternativas, habilidade da BNCC e o que cada questão
            avalia. A versão do professor traz o gabarito, a resolução e o erro
            por trás de cada alternativa errada. Usa 1 geração do seu plano.
          </p>
          <fieldset className="mb-5">
            <legend className="mb-2 text-xs font-bold text-slate-600">
              A avaliação parte de:
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {FONTES.map(({ id, rotulo, icone: Icone }) => (
                <label
                  key={id}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-2.5 text-center text-[12.5px] font-semibold ${fonte === id ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-slate-200 text-slate-700 hover:border-indigo-200"}`}
                >
                  <input
                    type="radio"
                    name="fonte-avaliacao"
                    value={id}
                    checked={fonte === id}
                    onChange={() => setFonte(id)}
                    className="sr-only"
                  />
                  <Icone className="h-4 w-4" aria-hidden="true" /> {rotulo}
                </label>
              ))}
            </div>
            {fonte === "apostila" && (
              <div className="mt-3">
                {materiais.length ? (
                  <select
                    className="ipt"
                    value={apostila}
                    onChange={(e) => escolherApostila(e.target.value)}
                    aria-label="Apostila"
                  >
                    <option value="">Escolha uma apostila…</option>
                    {materiais.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.titulo || m.tema}
                        {m.ano ? ` — ${m.ano}º` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[13px] text-slate-600">
                    Você ainda não tem apostilas em “Minhas Apostilas”. Gere uma
                    primeiro ou use o tema livre.
                  </p>
                )}
                <p className="mt-1 text-[11.5px] text-slate-600">
                  A avaliação cobra o que a apostila ensinou, com situações
                  novas.
                </p>
              </div>
            )}
          </fieldset>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo rotulo="Professor(a)" opcional>
              <input
                className="ipt"
                value={f.professor}
                onChange={set("professor")}
                maxLength={LIMITES_AVALIACAO.professor}
              />
            </Campo>
            <Campo rotulo="Escola" opcional>
              <input
                className="ipt"
                value={f.escola}
                onChange={set("escola")}
                maxLength={LIMITES_AVALIACAO.escola}
              />
            </Campo>
            <Campo rotulo="Componente curricular">
              <select
                className="ipt"
                value={f.disciplina}
                onChange={set("disciplina")}
              >
                {DISCIPLINAS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Etapa">
              <select className="ipt" value={f.nivel} onChange={set("nivel")}>
                {NIVEIS.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </Campo>
            {ANOS_POR_NIVEL[f.nivel] && (
              <Campo rotulo="Ano / Série" opcional>
                <select className="ipt" value={f.ano} onChange={set("ano")}>
                  <option value="">Não especificar</option>
                  {ANOS_POR_NIVEL[f.nivel].map((a) => (
                    <option key={a.valor} value={a.valor}>
                      {a.rotulo}
                    </option>
                  ))}
                </select>
              </Campo>
            )}
            <Campo rotulo="Turma" opcional>
              <input
                className="ipt"
                value={f.turma}
                onChange={set("turma")}
                maxLength={LIMITES_AVALIACAO.turma}
                placeholder='Ex.: "7º ano B"'
              />
            </Campo>
            <div className="sm:col-span-2">
              <SeletorBNCC
                codigo={f.bncc}
                habilidade={f.habilidade}
                disciplina={f.disciplina}
                nivel={f.nivel}
                ano={f.ano}
                onChange={(x) => setF((s) => ({ ...s, ...x }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Campo rotulo="Tema" opcional={fonte !== "tema"}>
                <input
                  className="ipt"
                  value={f.tema}
                  onChange={set("tema")}
                  maxLength={LIMITES_AVALIACAO.tema}
                  placeholder='Ex.: "Volume de blocos retangulares"'
                />
              </Campo>
            </div>
            <Campo rotulo="Número de questões">
              <select
                className="ipt"
                value={f.itens}
                onChange={(e) =>
                  setF((x) => ({ ...x, itens: Number(e.target.value) }))
                }
              >
                {QUANTIDADES_ITENS.map((n) => (
                  <option key={n} value={n}>
                    {n} questões
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Questões com figura">
              <select
                className="ipt"
                value={f.figuras}
                onChange={(e) =>
                  setF((x) => ({ ...x, figuras: Number(e.target.value) }))
                }
              >
                {PORCENTAGENS_FIGURA.map((p) => (
                  <option key={p} value={p}>
                    {p === 0
                      ? "Nenhuma"
                      : p === 100
                        ? "Todas"
                        : `Pelo menos ${p}% (${minimoComFigura(f.itens, p)} de ${f.itens})`}
                    {p === 40 ? " · padrão" : ""}
                  </option>
                ))}
              </select>
            </Campo>
            <div className="sm:col-span-2">
              <Campo rotulo="Orientações" opcional>
                <textarea
                  className="ipt min-h-[80px]"
                  value={f.observacoes}
                  onChange={set("observacoes")}
                  maxLength={LIMITES_AVALIACAO.observacoes}
                  placeholder="Ex.: avaliação diagnóstica do bimestre; turma com dificuldade em conversão de unidades."
                />
              </Campo>
              <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5 flex-none text-emerald-600" />{" "}
                Não escreva nomes ou dados pessoais de alunos: este texto é
                enviado à IA.
              </p>
            </div>
          </div>
          {avisosPedido.length > 0 && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <ul className="list-disc pl-5">
                {avisosPedido.map((a, i) => (
                  <li key={i}>
                    {a.motivo.charAt(0).toUpperCase() + a.motivo.slice(1)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {erro && (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {erro}
            </p>
          )}
          {zerarTeste && (
            <div className="mt-3">
              <ZerarUsoTeste
                aoZerar={() => {
                  setErro("");
                  aoGerar?.();
                }}
              />
            </div>
          )}
          <button
            type="button"
            onClick={gerar}
            disabled={gerando}
            aria-busy={gerando}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 py-3.5 font-bold text-white shadow-lg shadow-indigo-200 disabled:opacity-75"
          >
            {gerando ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ClipboardCheck className="h-5 w-5" />
            )}
            {gerando
              ? "Gerando e conferindo a avaliação…"
              : avaliacao
                ? "Gerar outra avaliação"
                : "Gerar avaliação"}
          </button>
          <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-[12px] text-slate-600">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none text-indigo-500" />
            O EduGera confere gabarito, alternativas e habilidades, mas revise
            cada questão antes de aplicar.
          </p>
        </section>

        <section
          aria-label="Prévia da avaliação"
          className="min-w-0 self-start xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1"
        >
          {!avaliacao ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">
                A avaliação aparece aqui.
              </p>
              <p className="mt-1">
                Depois você baixa dois PDFs: o do aluno (prova +
                cartão-resposta) e o do professor (a mesma prova +
                cartão-gabarito, matriz de habilidades, resolução e análise das
                alternativas erradas).
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <div
                  className="mr-auto inline-flex rounded-lg bg-slate-100 p-0.5 text-[12px] font-bold"
                  role="group"
                  aria-label="Versão exibida"
                >
                  {[
                    ["aluno", "Aluno"],
                    ["professor", "Professor"],
                  ].map(([id, rot]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setVersao(id)}
                      aria-pressed={versao === id}
                      className={`rounded-md px-3 py-1.5 ${versao === id ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"}`}
                    >
                      <Eye
                        className="mr-1 inline h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      {rot}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => baixarPdf("aluno")}
                  disabled={!!baixando}
                  className="btn-prev"
                >
                  {baixando === "aluno" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}{" "}
                  PDF do aluno
                </button>
                <button
                  type="button"
                  onClick={() => baixarPdf("professor")}
                  disabled={!!baixando}
                  className="btn-prev"
                >
                  {baixando === "professor" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5" />
                  )}{" "}
                  PDF do professor
                </button>
              </div>
              {letras && (
                <p className="mb-3 text-[12px] text-slate-600">
                  {avaliacao.itens.length} questões ·{" "}
                  {avaliacao.itens.filter((it) => it.figura).length} com figura
                  · respostas:{" "}
                  {Object.entries(letras)
                    .map(([l, n]) => `${l} ${n}`)
                    .join(" · ")}
                </p>
              )}
              {graves.length > 0 && (
                <div
                  role="alert"
                  className="mb-3 rounded-xl border-2 border-rose-400 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-900"
                >
                  <p className="flex items-center gap-1.5 font-extrabold">
                    <AlertCircle className="h-4 w-4" /> Não aplique antes de
                    corrigir
                  </p>
                  <ul className="ml-5 mt-1 list-disc">
                    {graves.map((a, k) => (
                      <li key={k}>
                        <b>{a.onde}:</b> {String(a.motivo).replace(/\.$/, "")}.
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[12px]">
                    Essas questões saem sem letra no gabarito do professor. Gere
                    a avaliação de novo ou corrija a questão antes de imprimir.
                  </p>
                </div>
              )}
              {corrigidos.length > 0 && (
                <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-900">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="h-4 w-4" /> Corrigido
                    automaticamente
                  </p>
                  <ul className="ml-5 mt-1 list-disc">
                    {corrigidos.map((a, k) => (
                      <li key={k}>
                        <b>{a.onde}:</b> {String(a.motivo).replace(/\.$/, "")}.
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {conferir.length > 0 && (
                <div
                  role="alert"
                  className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900"
                >
                  <p className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="h-4 w-4" /> Revise antes de
                    aplicar
                  </p>
                  <ul className="ml-5 mt-1 list-disc">
                    {conferir.map((a, k) => (
                      <li key={k}>
                        <b>{a.onde}:</b> {String(a.motivo).replace(/\.$/, "")}.
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {coordenador && !caderno && <DistribuirCaderno key={avId || "nova"} avaliacao={avaliacao} />}
              {caderno && (
                <p className="mb-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[12.5px] text-violet-950">
                  Caderno da rede <b>{caderno.titulo}</b> (código {caderno.codigo}). Aplique como está para o resultado ser comparável entre as escolas; depois de corrigir,
                  envie o resultado da turma lá embaixo.
                </p>
              )}
              {!caderno && <AjustarQuestoes avaliacao={avaliacao} aoMudar={mudarAvaliacao} trocasPorProva={trocasPorProva} />}
            <PreviewEscalado>
                <FolhaAvaliacao
                  ref={folhaRef}
                  avaliacao={avaliacao}
                  versao={versao}
                />
              </PreviewEscalado>
            </>
          )}
        </section>
      </div>

      {avaliacao && avId && <CorrecaoTurma avaliacao={avaliacao} avId={avId} pro={correcaoPro} caderno={caderno} />}

      {salvas.length > 0 && (
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-slate-800">
            <FolderOpen className="h-5 w-5 text-violet-500" /> Minhas avaliações
            ({salvas.length})
          </h2>
          <p className="mb-3 text-[12.5px] text-slate-600">
            Ficam salvas neste navegador. Para guardar em outro lugar, baixe os
            PDFs.
          </p>
          <ul className="divide-y divide-slate-100">
            {salvas.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-2 py-2 text-sm"
              >
                <span className="min-w-0 flex-1">
                  <b className="text-slate-800">{s.avaliacao.titulo}</b>
                  <span className="text-slate-500">
                    {" "}
                    ·{" "}
                    {[
                      s.avaliacao.identificacao?.componente,
                      s.avaliacao.identificacao?.etapa,
                      `${s.avaliacao.itens?.length || 0} questões`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}{" "}
                    · {new Date(s.criadoEm).toLocaleDateString("pt-BR")}
                  </span>
                  {s.origem?.tipo === "caderno" ? (
                    <span className="block text-[12px] font-semibold text-violet-700">
                      Caderno da rede · código {s.origem.codigo}
                    </span>
                  ) : (
                    s.origem?.titulo && (
                      <span className="block text-[12px] text-slate-500">
                        A partir da apostila “{s.origem.titulo}”
                      </span>
                    )
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => abrirSalva(s)}
                  className="btn-prev"
                >
                  Abrir
                </button>
                <button
                  type="button"
                  onClick={() => removerSalva(s.id)}
                  className="btn-prev"
                  aria-label={`Remover a avaliação ${s.avaliacao.titulo}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
