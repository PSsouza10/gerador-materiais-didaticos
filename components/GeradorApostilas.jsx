"use client";
import React, { useState, useRef } from "react";
import {
  LayoutDashboard,
  Sparkles,
  BookMarked,
  Settings,
  GraduationCap,
  User,
  Hash,
  BookOpen,
  Layers,
  Lightbulb,
  Image as ImageIcon,
  Wand2,
  FileText,
  Boxes,
  Target,
  AlertCircle,
  Loader2,
  Download,
} from "lucide-react";

export default function GeradorApostilas() {
  const [active, setActive] = useState("Gerar Material");
  const [loading, setLoading] = useState(false);
  const [loadingImagem, setLoadingImagem] = useState(false);
  const [baixandoPdf, setBaixandoPdf] = useState(false);
  const [erro, setErro] = useState(null);

  // Referência ao elemento da folha A4 que será exportado
  const folhaRef = useRef(null);

  // ===== ESTADO DO FORMULÁRIO =====
  const [form, setForm] = useState({
    professor: "Nome do professor",
    bncc: "",
    disciplina: "Matemática",
    nivel: "Ensino Fundamental",
    tema: "Volume: medida de capacidade",
    conteudo: "",
    estilo: "3D Pixar/Disney",
  });

  // ===== ESTADO COM O RESULTADO DA IA =====
  const [resultadoIA, setResultadoIA] = useState({
    tituloDidatico: "Volume: O Guia Completo de Capacidade",
    resumoPedagogico:
      "O estudo do volume e da capacidade fundamenta-se em entender o espaço ocupado por um corpo e a quantidade de fluido que ele pode conter.",
    dicaResolucao:
      "Converta sempre para a mesma unidade antes de iniciar qualquer cálculo de capacidade.",
    lembreteImportante:
      "Capacidade mede o quanto cabe dentro de um objeto; volume mede o espaço que o objeto ocupa.",
    aplicacaoPratica:
      "Uma caixa-d'água tem 2 m de altura, 1,5 m de largura e 1 m de profundidade. Quantos litros ela comporta?",
    tabelaConceitos: [
      ["1 litro", "1 dm³ = 1000 cm³"],
      ["1 ml", "1 cm³"],
      ["Cubo", "V = a × a × a"],
    ],
    urlImagem: null,
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // ===== CHAMADAS REAIS ÀS ROTAS DE API DO NEXT.JS =====
  const handleGerarMaterial = async () => {
    if (!form.disciplina || !form.nivel || !form.tema.trim()) {
      setErro("Preencha Disciplina, Nível de Ensino e Tema Principal.");
      return;
    }

    setErro(null);
    setLoading(true);
    setLoadingImagem(true);

    const conteudoPromise = fetch("/api/gerar-material", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const imagemPromise = fetch("/api/gerar-imagem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tema: form.tema,
        estilo: form.estilo,
        disciplina: form.disciplina,
      }),
    });

    // --- Conteúdo (GPT-4o) ---
    try {
      const res = await conteudoPromise;
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar conteúdo.");

      setResultadoIA((prev) => ({
        ...prev,
        tituloDidatico: data.tituloDidatico,
        resumoPedagogico: data.resumoPedagogico,
        dicaResolucao: data.dicaResolucao,
        lembreteImportante: data.lembreteImportante,
        aplicacaoPratica: data.aplicacaoPratica,
        tabelaConceitos: data.tabelaConceitos,
      }));
    } catch (e) {
      console.error(e);
      setErro(e.message || "Não foi possível gerar o conteúdo.");
    } finally {
      setLoading(false);
    }

    // --- Imagem (DALL-E 3) ---
    try {
      const res = await imagemPromise;
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar imagem.");
      setResultadoIA((prev) => ({ ...prev, urlImagem: data.urlImagem }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingImagem(false);
    }
  };

  // ===== EXPORTAÇÃO DA FOLHA A4 EM PDF =====
  const handleBaixarPdf = async () => {
    if (!folhaRef.current) return;
    setBaixandoPdf(true);
    try {
      // Import dinâmico evita erro de SSR no Next.js (lib só roda no browser)
      const html2pdf = (await import("html2pdf.js")).default;

      const nomeArquivo = `apostila-${form.tema
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")}.pdf`;

      const opcoes = {
        margin: 0,
        filename: nomeArquivo || "apostila.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await html2pdf().set(opcoes).from(folhaRef.current).save();
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
    "Ensino Religioso",
  ];
  const niveis = [
    "Ensino Fundamental",
    "Ensino Médio",
    "EJA",
    "Concurso",
    "Curso Livre",
  ];
  const estilos = ["3D Pixar/Disney", "Isométrico", "Vetor Ilustrado", "Realista"];

  return (
    <div className="flex min-h-screen w-full bg-[#F6F5FB] font-sans text-slate-700">
      {/* ===== MENU LATERAL ===== */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-100 shadow-sm">
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
            Preencha o código da BNCC para alinhar o material à habilidade certa.
          </p>
        </div>
      </aside>

      {/* ===== CONTEÚDO ===== */}
      <main className="flex-1 overflow-y-auto">
        <header className="flex items-center justify-between px-6 md:px-10 py-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">
              Gerar Material Visual
            </h1>
            <p className="text-sm text-slate-400">
              Crie apostilas e fichas de estudo alinhadas à BNCC.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-sm border border-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-500 font-bold text-sm">
              P
            </div>
            <span className="text-sm font-semibold text-slate-600">
              {form.professor.split(" - ")[0]}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(380px,460px)] gap-6 px-6 md:px-10 pb-10">
          {/* ===== FORMULÁRIO ===== */}
          <section className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-100">
            <div className="mb-6 flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-violet-400" />
              <h2 className="text-lg font-bold text-slate-800">
                Configuração da criação
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Identificação do Professor" icon={User}>
                <input
                  value={form.professor}
                  onChange={set("professor")}
                  className="ipt"
                  placeholder="Nome do docente"
                />
              </Field>

              <Field label="Código da BNCC" icon={Hash} optional>
                <input
                  value={form.bncc}
                  onChange={set("bncc")}
                  className="ipt"
                  placeholder="Ex: EF09ER03"
                />
              </Field>

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

              <div className="sm:col-span-2">
                <Field label="Conteúdo ou Orientação" icon={Lightbulb} optional>
                  <textarea
                    value={form.conteudo}
                    onChange={set("conteudo")}
                    rows={4}
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
              <div className="mt-5 flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-600">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            <button
              onClick={handleGerarMaterial}
              disabled={loading || loadingImagem}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed"
            >
              <Sparkles
                className={`h-5 w-5 ${loading || loadingImagem ? "animate-spin" : ""}`}
              />
              {loading
                ? "Gerando conteúdo (GPT-4o)..."
                : loadingImagem
                ? "Gerando ilustração (DALL-E 3)..."
                : "Gerar Material Visual"}
            </button>
          </section>

          {/* ===== PREVIEW A4 ===== */}
          <section className="lg:sticky lg:top-6 self-start">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-400">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wide">
                  Preview · Folha A4
                </span>
              </div>

              <button
                onClick={handleBaixarPdf}
                disabled={baixandoPdf || loading}
                className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 shadow-sm ring-1 ring-indigo-100 transition-all hover:bg-indigo-50 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {baixandoPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {baixandoPdf ? "Gerando..." : "Baixar PDF"}
              </button>
            </div>

            {/* A folha exportada para PDF começa aqui (folhaRef) */}
            <div
              ref={folhaRef}
              className="mx-auto aspect-[1/1.414] w-full max-w-[440px] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200"
            >
              <div className="flex h-full flex-col p-5 text-[10px] leading-tight">
                {/* Cabeçalho institucional */}
                <div className="flex items-center justify-between border-b-2 border-indigo-200 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100">
                      <GraduationCap className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 text-[10px]">
                        {form.professor || "Professor"}
                      </p>
                      <p className="text-[8px] text-slate-400">
                        {form.disciplina} · {form.nivel}
                      </p>
                    </div>
                  </div>
                  {form.bncc && (
                    <span className="rounded-md bg-indigo-50 px-2 py-1 text-[8px] font-bold text-indigo-500">
                      {form.bncc}
                    </span>
                  )}
                </div>

                {/* Título dinâmico */}
                <h3 className="mt-3 bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-center text-[13px] font-extrabold text-transparent">
                  {form.tema ? resultadoIA.tituloDidatico : "Tema Principal"}
                </h3>

                {/* Bloco de imagem */}
                <div className="mt-2 overflow-hidden rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 text-slate-300 h-24 flex flex-col items-center justify-center">
                  {loadingImagem ? (
                    <div className="flex flex-col items-center gap-1 text-indigo-300">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="text-[8px] font-semibold">
                        Gerando ilustração...
                      </span>
                    </div>
                  ) : resultadoIA.urlImagem ? (
                    <img
                      src={resultadoIA.urlImagem}
                      alt="Ilustração gerada por IA"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <ImageIcon className="h-6 w-6 text-slate-300" />
                      <span className="text-[8px] font-semibold text-slate-400">
                        Imagem IA · {form.estilo}
                      </span>
                    </div>
                  )}
                </div>

                {/* Resumo */}
                <p className="mt-2 text-[7.5px] text-slate-500 leading-normal text-justify">
                  {resultadoIA.resumoPedagogico}
                </p>

                {/* Tabela */}
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-100">
                  <div className="grid grid-cols-2 bg-indigo-50 text-[8px] font-bold text-indigo-600">
                    <span className="px-2 py-1">Conceito</span>
                    <span className="px-2 py-1">Definição / Aplicação</span>
                  </div>
                  {resultadoIA.tabelaConceitos.map(([a, b], i) => (
                    <div
                      key={i}
                      className={`grid grid-cols-2 text-[8px] text-slate-500 ${
                        i % 2 ? "bg-white" : "bg-slate-50/50"
                      }`}
                    >
                      <span className="px-2 py-1 font-medium">{a}</span>
                      <span className="px-2 py-1">{b}</span>
                    </div>
                  ))}
                </div>

                {/* Caixas de dica */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-amber-50 p-2">
                    <div className="flex items-center gap-1 text-amber-600">
                      <Lightbulb className="h-3 w-3" />
                      <span className="text-[8px] font-bold">Dica da IA</span>
                    </div>
                    <p className="mt-1 text-[7px] text-amber-500/80 leading-tight">
                      {resultadoIA.dicaResolucao}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2">
                    <div className="flex items-center gap-1 text-emerald-600">
                      <Boxes className="h-3 w-3" />
                      <span className="text-[8px] font-bold">Lembre-se</span>
                    </div>
                    <p className="mt-1 text-[7px] text-emerald-500/80 leading-tight">
                      {resultadoIA.lembreteImportante}
                    </p>
                  </div>
                </div>

                {/* Rodapé */}
                <div className="mt-auto rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 p-2">
                  <div className="flex items-center gap-1 text-indigo-600">
                    <Target className="h-3 w-3" />
                    <span className="text-[8px] font-bold uppercase tracking-wide">
                      Aplicação Prática no Cotidiano
                    </span>
                  </div>
                  <p className="mt-1 text-[7px] text-slate-600 font-medium">
                    {resultadoIA.aplicacaoPratica}
                  </p>
                </div>
              </div>
            </div>
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
        {optional && (
          <span className="font-medium text-slate-300">(opcional)</span>
        )}
      </span>
      {children}
    </label>
  );
}