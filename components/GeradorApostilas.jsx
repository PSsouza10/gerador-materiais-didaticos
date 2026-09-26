"use client";
import React, { useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  Sparkles,
  BookMarked,
  Settings,
  GraduationCap,
  User,
  BookOpen,
  Layers,
  Lightbulb,
  Image as ImageIcon,
  Wand2,
  FileText,
  Target,
  AlertCircle,
  Loader2,
  Download,
  Printer,
  Link2,
  Check,
  KeyRound,
  Gauge,
  Info,
} from "lucide-react";
import FolhaA4 from "@/components/FolhaA4";
import PreviewEscalado from "@/components/PreviewEscalado";
import SeletorBNCC from "@/components/SeletorBNCC";
import { NIVEIS_DIFICULDADE, NIVEL_PADRAO } from "@/lib/niveis";
import { lerStreamMaterial } from "@/lib/sse";
import { exportarPdf } from "@/lib/pdf";
import { slugify } from "@/lib/material";

const EXEMPLO = {
  tituloDidatico: "Volume: O Guia Completo de Capacidade",
  resumoPedagogico:
    "O estudo do volume e da capacidade fundamenta-se em entender o espaço ocupado por um corpo e a quantidade de fluido que ele pode conter.",
  conceitos: [
    { termo: "Volume", definicao: "Espaço tridimensional ocupado por um corpo." },
    { termo: "Capacidade", definicao: "Quantidade de líquido ou material que um objeto pode conter." },
    { termo: "Litro", definicao: "Unidade de medida de capacidade equivalente a 1 dm³." },
  ],
  formulas: [
    { nome: "Volume do cubo", expressao: "V = a × a × a", descricao: "onde a é a medida da aresta" },
    { nome: "Conversão", expressao: "1 dm³ = 1 L = 1000 cm³", descricao: "relação entre volume e capacidade" },
  ],
  dicas: [
    "Converta sempre para a mesma unidade antes de iniciar qualquer cálculo.",
    "Desenhe a figura e identifique altura, largura e profundidade antes de multiplicar.",
  ],
  lembreteImportante:
    "Capacidade mede o quanto cabe dentro de um objeto; volume mede o espaço que o objeto ocupa.",
  aplicacaoPratica: {
    titulo: "Caixa-d'água em casa",
    situacao: "Uma caixa-d'água tem 2 m de altura, 1,5 m de largura e 1 m de profundidade.",
    exemplos: ["Quantos litros ela comporta?", "V = 2 × 1,5 × 1 = 3 m³ = 3000 L"],
  },
  exercicios: [
    {
      enunciado: "Um aquário tem 50 cm de comprimento, 30 cm de largura e 40 cm de altura. Qual é a sua capacidade em litros?",
      alternativas: ["a) 6 L", "b) 60 L", "c) 600 L", "d) 6000 L"],
      resposta: "b) 60 L — 50 × 30 × 40 = 60 000 cm³ = 60 dm³ = 60 L.",
    },
    {
      enunciado: "Explique, com suas palavras, a diferença entre volume e capacidade.",
      alternativas: [],
      resposta: "Volume é o espaço ocupado pelo objeto; capacidade é o quanto cabe dentro dele.",
    },
  ],
  bncc: null,
};

export default function GeradorApostilas() {
  const [active, setActive] = useState("Gerar Material");
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [loadingImagem, setLoadingImagem] = useState(false);
  const [baixandoPdf, setBaixandoPdf] = useState(false);
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [mostrarGabarito, setMostrarGabarito] = useState(false);

  // Task 4.1 — link de compartilhamento
  const [compartilhar, setCompartilhar] = useState({ estado: "vazio", url: null, chave: null });

  const folhaRef = useRef(null);

  // ===== ESTADO DO FORMULÁRIO =====
  const [form, setForm] = useState({
    professor: "Nome do professor",
    bncc: "",
    habilidade: "",
    disciplina: "Matemática",
    nivel: "Ensino Fundamental",
    tema: "Volume: medida de capacidade",
    conteudo: "",
    estilo: "3D Pixar/Disney",
    dificuldade: NIVEL_PADRAO,
  });

  // ===== RESULTADO DA IA =====
  const [material, setMaterial] = useState(EXEMPLO);
  const [urlImagem, setUrlImagem] = useState(null);
  const [gerado, setGerado] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Chave que muda sempre que o conteúdo visível muda → link desatualizado
  const chaveAtual = useMemo(() => JSON.stringify([form, material, urlImagem]), [form, material, urlImagem]);
  const linkDesatualizado = compartilhar.url && compartilhar.chave !== chaveAtual;

  const salvarMaterial = async (dados) => {
    setCompartilhar((c) => ({ ...c, estado: "salvando" }));
    try {
      const res = await fetch("/api/salvar-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCompartilhar({ estado: "pronto", url: json.url, chave: JSON.stringify([dados.form, dados.material, dados.urlImagem]) });
      return json.url;
    } catch (e) {
      console.error(e);
      setCompartilhar((c) => ({ ...c, estado: "erro" }));
      return null;
    }
  };

  // ===== GERAÇÃO (conteúdo via streaming + imagem em paralelo) =====
  const handleGerarMaterial = async () => {
    if (!form.disciplina || !form.nivel || !form.tema.trim()) {
      setErro("Preencha Disciplina, Nível de Ensino e Tema Principal.");
      return;
    }

    setErro(null);
    setAviso(null);
    setProgresso(0);
    setLoading(true);
    setLoadingImagem(true);
    setCompartilhar({ estado: "vazio", url: null, chave: null });

    const formEnviado = { ...form };

    const conteudoPromise = fetch("/api/gerar-material", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formEnviado),
    });

    const imagemPromise = fetch("/api/gerar-imagem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tema: form.tema, estilo: form.estilo, disciplina: form.disciplina }),
    });

    let novoMaterial = null;
    let novaImagem = null;

    // --- Conteúdo (GPT-4o, streaming SSE) ---
    try {
      const res = await conteudoPromise;
      novoMaterial = await lerStreamMaterial(res, { onProgresso: setProgresso });
      setMaterial(novoMaterial);
      setGerado(true);
    } catch (e) {
      console.error(e);
      setErro(
        e instanceof TypeError
          ? "Sem conexão com o servidor. Verifique a internet e tente novamente."
          : e.message || "Não foi possível gerar o conteúdo."
      );
    } finally {
      setLoading(false);
    }

    // --- Imagem (gpt-image-2) ---
    try {
      const res = await imagemPromise;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          res.status === 504 && !data.error ? "A ilustração demorou demais (timeout)." : data.error || "Erro ao gerar imagem."
        );
      }
      novaImagem = data.urlImagem;
      setUrlImagem(novaImagem);
    } catch (e) {
      console.error(e);
      if (novoMaterial) setAviso(`${e.message} O material foi criado sem ilustração.`);
    } finally {
      setLoadingImagem(false);
    }

    // --- Task 4.1: salva no Vercel Blob e prepara o link ---
    if (novoMaterial) {
      await salvarMaterial({ form: formEnviado, material: novoMaterial, urlImagem: novaImagem });
    }
  };

  // ===== COPIAR LINK =====
  const handleCopiarLink = async () => {
    let url = compartilhar.url;
    if (!url || linkDesatualizado) {
      url = await salvarMaterial({ form, material, urlImagem });
      if (!url) return;
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copie o link:", url);
    }
    setCompartilhar((c) => ({ ...c, estado: "copiado" }));
    setTimeout(() => setCompartilhar((c) => (c.estado === "copiado" ? { ...c, estado: "pronto" } : c)), 2200);
  };

  // ===== EXPORTAÇÃO EM PDF =====
  const handleBaixarPdf = async () => {
    if (!folhaRef.current) return;
    setBaixandoPdf(true);
    try {
      await exportarPdf(folhaRef.current, `apostila-${slugify(form.tema) || "material"}.pdf`);
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
      setErro("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setBaixandoPdf(false);
    }
  };

  const nav = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Gerar Material", icon: Sparkles },
    { name: "Minhas Apostilas", icon: BookMarked },
    { name: "Configurações", icon: Settings },
  ];

  const disciplinas = [
    "Matemática",
    "Informática",
    "Português",
    "Ciências",
    "História",
    "Geografia",
    "Arte",
    "Educação Física",
    "Língua Inglesa",
    "Ensino Religioso",
  ];
  const niveis = ["Ensino Fundamental", "Ensino Médio", "EJA", "Concurso", "Curso Livre"];
  const estilos = ["3D Pixar/Disney", "Isométrico", "Vetor Ilustrado", "Realista"];

  const ocupado = loading || loadingImagem;
  const textoBotaoLink = {
    salvando: "Salvando...",
    copiado: "Link copiado!",
    erro: "Tentar salvar de novo",
  }[compartilhar.estado] || (linkDesatualizado ? "Atualizar e copiar link" : "Copiar link de compartilhamento");

  return (
    <div className="flex min-h-screen w-full bg-[#F6F5FB] font-sans text-slate-700">
      {/* ===== MENU LATERAL ===== */}
      <aside className="nao-imprimir hidden md:flex w-64 flex-none flex-col bg-white border-r border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 px-6 py-7 border-b border-slate-100">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-indigo-400 shadow-lg shadow-indigo-200">
            <GraduationCap className="h-6 w-6 text-white" strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <p className="text-base font-extrabold text-slate-800">EduGera</p>
            <p className="text-[11px] font-medium text-slate-400">Apostilas BNCC</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {nav.map(({ name, icon: Icon }) => {
            const on = active === name;
            return (
              <button
                key={name}
                onClick={() => setActive(name)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  on
                    ? "bg-gradient-to-r from-violet-100 to-indigo-100 text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                {name}
              </button>
            );
          })}
        </nav>

        <div className="m-3 rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50 p-4 border border-amber-100">
          <p className="text-xs font-bold text-amber-700">Dica pedagógica</p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-600/80">
            Busque a habilidade da BNCC pelo código ou por palavra-chave: a descrição oficial entra no material.
          </p>
        </div>
      </aside>

      {/* ===== CONTEÚDO ===== */}
      <main className="min-w-0 flex-1">
        <header className="nao-imprimir flex items-center justify-between px-6 md:px-8 py-5">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Gerar Material Visual</h1>
            <p className="text-sm text-slate-400">Crie apostilas e fichas de estudo alinhadas à BNCC.</p>
          </div>
          <div className="hidden sm:flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-sm border border-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-500 font-bold text-sm">
              {(form.professor || "P").trim()[0]?.toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-slate-600">{form.professor.split(" - ")[0]}</span>
          </div>
        </header>

        {/* Task 2.1 — split-screen: controles à esquerda, live preview à direita */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 px-6 md:px-8 pb-10">
          {/* ===== FORMULÁRIO ===== */}
          <section className="nao-imprimir self-start rounded-3xl bg-white p-6 md:p-7 shadow-sm border border-slate-100">
            <div className="mb-6 flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-violet-400" />
              <h2 className="text-lg font-bold text-slate-800">Configuração da criação</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <Field label="Identificação do Professor" icon={User}>
                  <input value={form.professor} onChange={set("professor")} className="ipt" placeholder="Nome do docente" />
                </Field>
              </div>

              <Field label="Disciplina" icon={BookOpen} required>
                <select value={form.disciplina} onChange={set("disciplina")} className="ipt">
                  {disciplinas.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>

              <Field label="Nível de Ensino" icon={Layers} required>
                <select value={form.nivel} onChange={set("nivel")} className="ipt">
                  {niveis.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </Field>

              {/* Task 3.1 — autocomplete BNCC com descrição oficial */}
              <div className="sm:col-span-2">
                <SeletorBNCC
                  codigo={form.bncc}
                  habilidade={form.habilidade}
                  disciplina={form.disciplina}
                  nivel={form.nivel}
                  onChange={(v) => setForm((f) => ({ ...f, ...v }))}
                />
              </div>

              <div className="sm:col-span-2">
                <Field label="Tema Principal" icon={Target} required>
                  <input
                    value={form.tema}
                    onChange={set("tema")}
                    className="ipt"
                    placeholder='Ex: "Volume: medida de capacidade"'
                  />
                </Field>
              </div>

              {/* Task 3.2 — nível de dificuldade / adaptação */}
              <div className="sm:col-span-2">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <Gauge className="h-3.5 w-3.5 text-violet-400" />
                  Nível de Dificuldade / Adaptação
                </span>
                <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {NIVEIS_DIFICULDADE.map((n) => {
                    const on = form.dificuldade === n.id;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setForm((f) => ({ ...f, dificuldade: n.id }))}
                        className={`rounded-xl border-[1.5px] px-3 py-2.5 text-left transition-all ${
                          on
                            ? "border-indigo-300 bg-indigo-50 shadow-sm"
                            : "border-[#ECEAF4] bg-[#FAFAFE] hover:border-indigo-200"
                        }`}
                      >
                        <span className={`block text-[13px] font-bold ${on ? "text-indigo-700" : "text-slate-600"}`}>
                          {n.rotulo}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">{n.descricao}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2">
                <Field label="Conteúdo ou Orientação" icon={Lightbulb} optional>
                  <textarea
                    value={form.conteudo}
                    onChange={set("conteudo")}
                    rows={3}
                    className="ipt resize-none"
                    placeholder="Instruções específicas, resumos ou orientações da ficha..."
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label="Estilo Visual das Imagens" icon={ImageIcon}>
                  <select value={form.estilo} onChange={set("estilo")} className="ipt">
                    {estilos.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            {erro && (
              <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-600">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{erro}</span>
              </div>
            )}
            {aviso && !erro && (
              <div className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{aviso}</span>
              </div>
            )}

            <button
              onClick={handleGerarMaterial}
              disabled={ocupado}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed"
            >
              <Sparkles className={`h-5 w-5 ${ocupado ? "animate-spin" : ""}`} />
              {loading
                ? progresso > 0
                  ? `Escrevendo o material... ${(progresso / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil caracteres`
                  : "Conectando à IA..."
                : loadingImagem
                ? "Gerando ilustração (gpt-image-2)..."
                : "Gerar Material Visual"}
            </button>
          </section>

          {/* ===== LIVE PREVIEW A4 ===== */}
          <section className="coluna-preview min-w-0 xl:sticky xl:top-4 self-start xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
            <div className="nao-imprimir mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-400">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wide">
                  Live preview · A4 {!gerado && <span className="normal-case font-medium">(exemplo)</span>}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {material.exercicios?.length > 0 && (
                  <button
                    onClick={() => setMostrarGabarito((g) => !g)}
                    aria-pressed={mostrarGabarito}
                    className={`btn-prev ${mostrarGabarito ? "!bg-indigo-50" : ""}`}
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Gabarito
                  </button>
                )}
                <button onClick={() => window.print()} disabled={loading} className="btn-prev">
                  <Printer className="h-3.5 w-3.5" /> Imprimir
                </button>
                <button onClick={handleBaixarPdf} disabled={baixandoPdf || loading} className="btn-prev">
                  {baixandoPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  {baixandoPdf ? "Gerando..." : "Baixar PDF"}
                </button>
              </div>
            </div>

            {/* Task 4.1 — link de compartilhamento */}
            {gerado && (
              <div className="nao-imprimir mb-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
                <Link2 className="h-4 w-4 flex-none text-indigo-400" />
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-400">
                  {compartilhar.url && !linkDesatualizado
                    ? compartilhar.url
                    : compartilhar.estado === "erro"
                    ? "Não foi possível salvar o material."
                    : linkDesatualizado
                    ? "Você alterou o material — o link será atualizado ao copiar."
                    : "Salvando material para compartilhar..."}
                </span>
                <button
                  onClick={handleCopiarLink}
                  disabled={compartilhar.estado === "salvando" || loading}
                  className="flex flex-none items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-indigo-600 active:scale-95 disabled:opacity-60"
                >
                  {compartilhar.estado === "salvando" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : compartilhar.estado === "copiado" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5" />
                  )}
                  {textoBotaoLink}
                </button>
              </div>
            )}

            <PreviewEscalado>
              <FolhaA4
                ref={folhaRef}
                form={form}
                material={material}
                urlImagem={urlImagem}
                loadingImagem={loadingImagem}
                mostrarGabarito={mostrarGabarito}
              />
            </PreviewEscalado>
          </section>
        </div>
      </main>

      <style>{`
        .ipt {
          width: 100%;
          border-radius: 0.85rem;
          border: 1.5px solid #ECEAF4;
          background: #FAFAFE;
          padding: 0.65rem 0.85rem;
          font-size: 0.875rem;
          color: #334155;
          outline: none;
          transition: all .15s;
        }
        .ipt:focus {
          border-color: #A5B4FC;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(165,180,252,.25);
        }
        .btn-prev {
          display: inline-flex; align-items: center; gap: .375rem;
          border-radius: .5rem; background: #fff; padding: .375rem .75rem;
          font-size: .75rem; font-weight: 700; color: #4f46e5;
          box-shadow: 0 1px 2px rgba(0,0,0,.05), 0 0 0 1px #e0e7ff;
          transition: all .15s;
        }
        .btn-prev:hover { background: #eef2ff; }
        .btn-prev:active { transform: scale(.95); }
        .btn-prev:disabled { opacity: .6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

function Field({ label, icon: Icon, required, optional, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600">
        {Icon && <Icon className="h-3.5 w-3.5 text-violet-400" />}
        {label}
        {required && <span className="text-rose-400">*</span>}
        {optional && <span className="font-medium text-slate-300">(opcional)</span>}
      </span>
      {children}
    </label>
  );
}
