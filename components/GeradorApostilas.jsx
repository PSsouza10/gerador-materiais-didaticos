"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useSession, signIn } from "next-auth/react";
import Conta, { MedidorUso } from "@/components/Conta";
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
  PanelTop,
  Eye,
  AlertTriangle,
  CalendarRange,
  ShieldCheck,
} from "lucide-react";
import FolhaA4 from "@/components/FolhaA4";
import CapaA4 from "@/components/CapaA4";
import PreviewEscalado from "@/components/PreviewEscalado";
import SeletorBNCC from "@/components/SeletorBNCC";
import Dashboard from "@/components/telas/Dashboard";
import MinhasApostilas from "@/components/telas/MinhasApostilas";
import Configuracoes from "@/components/telas/Configuracoes";
import { NIVEIS_DIFICULDADE } from "@/lib/niveis";
import { lerStreamMaterial } from "@/lib/sse";
import { exportarPdf } from "@/lib/pdf";
import { slugify } from "@/lib/material";
import { verificarUnidades } from "@/lib/unidades";
import { ANOS_POR_NIVEL } from "@/lib/bncc";
import { LIMITES } from "@/lib/validacao";
import { conferirGabarito } from "@/lib/gabarito";
import { DISCIPLINAS, NIVEIS, ESTILOS, CAPAS, normalizarCapa } from "@/lib/opcoes";
import {
  CONFIG_PADRAO,
  lerConfig,
  salvarConfig,
  lerMateriais,
  adicionarMaterial,
  removerMaterial,
  limparMateriais,
  atualizarMaterial,
  gerarBackup,
  importarBackup,
} from "@/lib/local";

// ===== EXEMPLO (mostrado só até o professor gerar o primeiro material) =====
const EXEMPLO_FORM = {
  professor: "Prof.ª Ana Souza",
  escola: "Escola Exemplo",
  bncc: "EF07MA30",
  habilidade:
    "Resolver e elaborar problemas de cálculo de medida do volume de blocos retangulares, envolvendo as unidades usuais (metro cúbico, decímetro cúbico e centímetro cúbico).",
  bnccVerificada: true,
  disciplina: "Matemática",
  nivel: "Ensino Fundamental",
  ano: "7",
  tema: "Volume: medida de capacidade",
  estilo: "3D colorido",
  dificuldade: "padrao",
};

const EXEMPLO = {
  tituloDidatico: "Volume e Capacidade no Dia a Dia",
  resumoPedagogico:
    "Volume é o espaço que um objeto ocupa; capacidade é o quanto cabe dentro dele. Nesta ficha você vai calcular o volume de blocos retangulares e converter entre m³, dm³, cm³ e litros.",
  conceitos: [
    { termo: "Volume", definicao: "Espaço tridimensional ocupado por um corpo." },
    { termo: "Capacidade", definicao: "Quantidade de líquido ou material que um recipiente pode conter." },
    { termo: "Bloco retangular", definicao: "Sólido com 6 faces retangulares (paralelepípedo)." },
    { termo: "Litro", definicao: "Unidade de capacidade equivalente a 1 dm³." },
  ],
  formulas: [
    { nome: "Bloco retangular (geral)", expressao: "V = c × l × h", descricao: "comprimento × largura × altura, na mesma unidade" },
    { nome: "Cubo (caso particular)", expressao: "V = a × a × a = a³", descricao: "quando as três arestas medem a" },
    { nome: "Conversão", expressao: "1 dm³ = 1 L = 1000 cm³", descricao: "e 1 m³ = 1000 L" },
  ],
  dicas: [
    "Converta todas as medidas para a mesma unidade antes de multiplicar.",
    "Desenhe o sólido e marque comprimento, largura e altura.",
    "Para litros, calcule em dm³: o número é o mesmo.",
  ],
  lembreteImportante: "V = a³ vale só para o cubo; para qualquer bloco retangular use V = c × l × h.",
  aplicacaoPratica: {
    titulo: "Caixa-d'água em casa",
    situacao: "Uma caixa-d'água em forma de bloco retangular mede 2 m de comprimento, 1,5 m de largura e 1 m de altura.",
    exemplos: ["V = 2 × 1,5 × 1 = 3 m³", "3 m³ = 3000 L"],
  },
  exercicios: [
    {
      enunciado: "Um aquário tem 50 cm de comprimento, 30 cm de largura e 40 cm de altura. Qual é a sua capacidade em litros?",
      alternativas: ["a) 6 L", "b) 60 L", "c) 600 L", "d) 6000 L"],
      resposta: "b) 60 L — 50 × 30 × 40 = 60 000 cm³ = 60 dm³ = 60 L.",
    },
    {
      enunciado: "Um cubo tem aresta de 3 dm. Qual é o seu volume?",
      alternativas: ["a) 9 dm³", "b) 18 dm³", "c) 27 dm³", "d) 81 dm³"],
      resposta: "c) 27 dm³ — V = 3 × 3 × 3 = 27 dm³ (9 dm² é a área de uma face, não o volume).",
    },
    {
      enunciado: "Explique, com suas palavras, a diferença entre volume e capacidade.",
      alternativas: [],
      resposta: "Volume é o espaço ocupado pelo objeto; capacidade é o quanto cabe dentro dele.",
    },
  ],
  bncc: { codigo: EXEMPLO_FORM.bncc, texto: EXEMPLO_FORM.habilidade, verificada: true },
};

const NAV = [
  { name: "Dashboard", curto: "Início", icon: LayoutDashboard, descricao: "Visão geral dos seus materiais." },
  { name: "Gerar Material", curto: "Gerar", icon: Sparkles, descricao: "Crie apostilas e fichas de estudo alinhadas à BNCC." },
  { name: "Minhas Apostilas", curto: "Apostilas", icon: BookMarked, descricao: "Materiais gerados neste navegador." },
  { name: "Configurações", curto: "Ajustes", icon: Settings, descricao: "Seus dados e as escolhas padrão do formulário." },
];

const formDaConfig = (cfg) => ({
  professor: cfg.professor,
  escola: cfg.escola,
  bncc: "",
  habilidade: "",
  bnccVerificada: false,
  disciplina: cfg.disciplina,
  nivel: cfg.nivel,
  ano: "",
  tema: "",
  conteudo: "",
  estilo: cfg.estilo,
  dificuldade: cfg.dificuldade,
  capa: normalizarCapa(cfg.capa),
});

export default function GeradorApostilas() {
  const [active, setActive] = useState("Gerar Material");
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [loadingImagem, setLoadingImagem] = useState(false);
  const [baixandoPdf, setBaixandoPdf] = useState(null);
  const gerandoRef = useRef(false);
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [mostrarGabarito, setMostrarGabarito] = useState(false);
  const [gabaritoForcado, setGabaritoForcado] = useState(null); // usado só durante a exportação

  const [config, setConfig] = useState(CONFIG_PADRAO);
  const [materiais, setMateriais] = useState([]);
  const [paginacao, setPaginacao] = useState({ paginas: 1, paginasFolha: 1, capa: false });

  // ===== CONTA E LIMITE =====
  const { data: sessao, status: statusSessao } = useSession();
  const [conta, setConta] = useState({ authConfigurado: null, uso: null });
  const atualizarUso = async () => {
    try {
      const r = await fetch("/api/uso", { cache: "no-store" });
      const j = await r.json();
      setConta({ authConfigurado: j.authConfigurado, uso: j.uso || null });
    } catch {
      /* sem rede: mantém o último estado */
    }
  };
  useEffect(() => {
    if (statusSessao !== "loading") atualizarUso();
  }, [statusSessao]);

  // Task 4.1 — link de compartilhamento
  const [compartilhar, setCompartilhar] = useState({ estado: "vazio", url: null, chave: null });

  const folhaRef = useRef(null);
  const capaRef = useRef(null);

  // ===== FORMULÁRIO =====
  const [form, setForm] = useState(() => formDaConfig(CONFIG_PADRAO));

  // Primeiro acesso logado: se o nome do professor está vazio, usa o da conta Google
  useEffect(() => {
    const nome = sessao?.user?.name;
    if (nome) setForm((f) => (f.professor?.trim() ? f : { ...f, professor: nome }));
  }, [sessao?.user?.name]);

  // Preferências e lista salvas no navegador
  useEffect(() => {
    const cfg = lerConfig();
    setConfig(cfg);
    setForm(formDaConfig(cfg));
    setMateriais(lerMateriais());
  }, []);

  // ===== RESULTADO DA IA =====
  const [material, setMaterial] = useState(null);
  const [urlImagem, setUrlImagem] = useState(null);
  const gerado = !!material;

  // O preview mostra o EXEMPLO (rotulado) até existir um material do professor
  // No exemplo, o nome e a escola são os do professor (formulário, Configurações ou conta Google)
  const nomeProfessor = form.professor?.trim() || sessao?.user?.name || "";
  const formPreview = gerado
    ? form
    : {
        ...EXEMPLO_FORM,
        capa: form.capa,
        professor: nomeProfessor || EXEMPLO_FORM.professor,
        escola: form.escola?.trim() || (nomeProfessor ? "" : EXEMPLO_FORM.escola),
      };
  const materialPreview = gerado ? material : EXEMPLO;
  const imagemPreview = gerado ? urlImagem : null;

  const set = (k) => (e) =>
    setForm((f) => {
      const n = { ...f, [k]: e.target.value };
      // ano/série só faz sentido dentro da etapa escolhida
      if (k === "nivel" && !(ANOS_POR_NIVEL[n.nivel] || []).some((a) => a.valor === n.ano)) n.ano = "";
      return n;
    });

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
      setMateriais(
        adicionarMaterial({
          id: json.id,
          url: json.url,
          titulo: dados.material.tituloDidatico || dados.form.tema,
          tema: dados.form.tema,
          disciplina: dados.form.disciplina,
          nivel: dados.form.nivel,
          ano: dados.form.ano,
          dificuldade: dados.form.dificuldade,
          chave: json.chave,
          bncc: dados.material.bncc?.verificada ? dados.material.bncc.codigo : null,
          criadoEm: new Date().toISOString(),
        })
      );
      return json.url;
    } catch (e) {
      console.error(e);
      setCompartilhar((c) => ({ ...c, estado: "erro" }));
      return null;
    }
  };

  // ===== GERAÇÃO (conteúdo via streaming + imagem em paralelo) =====
  const handleGerarMaterial = async () => {
    // trava contra duplo clique/Enter: uma única requisição por vez
    if (gerandoRef.current) return;
    if (!form.disciplina || !form.nivel || !form.tema.trim()) {
      setErro("Preencha Disciplina, Nível de Ensino e Tema Principal.");
      document.getElementById("campo-tema")?.focus();
      return;
    }
    gerandoRef.current = true;
    try {
      await gerarMaterial();
    } finally {
      gerandoRef.current = false;
    }
  };

  const gerarMaterial = async () => {

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

    let novoMaterial = null;
    let novaImagem = null;
    let imagemPromise = null;

    try {
      const res = await conteudoPromise;
      // a ilustração só começa depois que o servidor registrou a geração
      if (res.ok) {
        imagemPromise = fetch("/api/gerar-imagem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tema: form.tema, estilo: form.estilo, disciplina: form.disciplina, capa: form.capa }),
        });
      }
      novoMaterial = await lerStreamMaterial(res, {
        onProgresso: setProgresso,
        onUso: (uso) => setConta((c) => ({ ...c, uso: { ...c.uso, ...uso } })),
      });
      setMaterial(novoMaterial);
      setUrlImagem(null);
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

    try {
      if (!imagemPromise) throw new Error("Ilustração não gerada.");
      const res = await imagemPromise;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          res.status === 504 && !data.error ? "A ilustração demorou demais (timeout)." : data.error || "Erro ao gerar imagem."
        );
      }
      novaImagem = data.urlImagem;
      if (novoMaterial) setUrlImagem(novaImagem);
    } catch (e) {
      console.error(e);
      if (novoMaterial) setAviso(`${e.message} O material foi criado sem ilustração.`);
      setLoadingImagem(false);
    } finally {
      setLoadingImagem(false);
    }

    if (novoMaterial) {
      await salvarMaterial({ form: formEnviado, material: novoMaterial, urlImagem: novaImagem });
    }
  };

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

  // ===== EXPORTAÇÃO EM PDF: aluno (sem gabarito) ou professor (gabarito em página própria) =====
  const handleBaixarPdf = async (tipo) => {
    if (!folhaRef.current) return;
    // pontos que o professor precisa conferir (correções automáticas não bloqueiam)
    const pendentes = alertas.filter((a) => a.tipo !== "corrigido");
    if (
      pendentes.length > 0 &&
      !window.confirm(
        `Há ${pendentes.length} ponto(s) para conferir antes de imprimir:\n\n` +
          pendentes.map((a) => `• ${a.onde}: ${String(a.motivo).replace(/\.$/, "")}`).join("\n") +
          "\n\nBaixar o PDF mesmo assim?"
      )
    )
      return;
    setBaixandoPdf(tipo);
    flushSync(() => setGabaritoForcado(tipo === "professor"));
    try {
      const base = `apostila-${slugify(formPreview.tema) || "material"}`;
      await exportarPdf(folhaRef.current, `${base}${tipo === "professor" ? "-professor" : ""}.pdf`, {
        capa: form.capa !== "nenhuma" ? capaRef.current : null,
        titulo: materialPreview.tituloDidatico || formPreview.tema,
        assunto: [formPreview.disciplina, formPreview.tema].filter(Boolean).join(" · "),
        autor: formPreview.professor,
      });
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
      setErro("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setGabaritoForcado(null);
      setBaixandoPdf(null);
    }
  };

  const salvarPreferencias = (cfg) => {
    salvarConfig(cfg);
    setConfig(cfg);
    // aplica ao formulário sem apagar o que já foi digitado no tema/BNCC
    setForm((f) => ({ ...formDaConfig(cfg), tema: f.tema, conteudo: f.conteudo, bncc: f.bncc, habilidade: f.habilidade, bnccVerificada: f.bnccVerificada }));
  };

  const revogarLink = async (m) => {
    const res = await fetch(`/api/material/${m.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chave: m.chave }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Não foi possível revogar o link.");
    setMateriais(atualizarMaterial(m.id, { revogado: true, chave: null }));
    if (compartilhar.url === m.url) setCompartilhar({ estado: "vazio", url: null, chave: null });
  };

  const exportarBackup = () => {
    const blob = new Blob([gerarBackup()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `edugera-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importar = (texto) => {
    const { importados, lista } = importarBackup(texto);
    setMateriais(lista);
    const cfg = lerConfig();
    setConfig(cfg);
    return importados;
  };

  const alertas = useMemo(() => {
    // avisos do servidor (geração nova) + conferência local (materiais antigos reabertos)
    const gab = [...(materialPreview.avisosGabarito || []), ...conferirGabarito(materialPreview).avisos];
    const vistos = new Set();
    return [...verificarUnidades(materialPreview), ...gab.filter((a) => !vistos.has(a.onde) && vistos.add(a.onde))];
  }, [materialPreview]);

  const ocupado = loading || loadingImagem;
  const temExercicios = materialPreview.exercicios?.length > 0;
  const gabaritoVisivel = gabaritoForcado ?? mostrarGabarito;
  const textoBotaoLink =
    { salvando: "Salvando...", copiado: "Link copiado!", erro: "Tentar salvar de novo" }[compartilhar.estado] ||
    (linkDesatualizado ? "Atualizar e copiar link" : "Copiar link de compartilhamento");
  const statusGeracao = loading
    ? progresso > 0
      ? `Escrevendo o material... ${(progresso / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil caracteres`
      : "Conectando à IA..."
    : loadingImagem
    ? "Gerando ilustração..."
    : "";
  const tela = NAV.find((n) => n.name === active) || NAV[1];

  return (
    <div className="flex min-h-screen w-full bg-[#F6F5FB] font-sans text-slate-700">
      <a
        href="#conteudo"
        className="nao-imprimir sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        Pular para o conteúdo
      </a>
      {/* ===== MENU LATERAL (desktop) ===== */}
      <aside className="nao-imprimir hidden md:flex w-64 flex-none flex-col bg-white border-r border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 px-6 py-7 border-b border-slate-100">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-indigo-400 shadow-lg shadow-indigo-200">
            <GraduationCap className="h-6 w-6 text-white" strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <p className="text-base font-extrabold text-slate-800">EduGera</p>
            <p className="text-[11px] font-medium text-slate-500">Apostilas BNCC</p>
          </div>
        </div>

        <nav aria-label="Seções" className="flex-1 px-3 py-5 space-y-1">
          {NAV.map(({ name, icon: Icon }) => {
            const on = active === name;
            return (
              <button type="button"
                key={name}
                onClick={() => setActive(name)}
                aria-current={on ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 ${
                  on
                    ? "bg-gradient-to-r from-violet-100 to-indigo-100 text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                <Icon className="h-[18px] w-[18px] flex-none" strokeWidth={2.2} />
                <span className="whitespace-nowrap">{name}</span>
                {name === "Minhas Apostilas" && materiais.length > 0 && (
                  <span className="ml-auto rounded-full bg-indigo-100 px-2 text-[11px] font-bold text-indigo-600">{materiais.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="m-3 rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50 p-4 border border-amber-100">
          <p className="text-xs font-bold text-amber-700">Dica pedagógica</p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-700/80">
            Busque a habilidade da BNCC pelo código ou por palavra-chave: a descrição oficial entra no material.
          </p>
        </div>
        <p className="px-5 pb-4 text-[11px] text-slate-500">
          <a href="/privacidade" className="hover:text-indigo-600 hover:underline">Privacidade</a> ·{" "}
          <a href="/termos" className="hover:text-indigo-600 hover:underline">Termos de Uso</a>
        </p>
      </aside>

      {/* ===== CONTEÚDO ===== */}
      <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 pb-20 outline-none md:pb-0">
        {/* Barra superior no celular */}
        <div className="nao-imprimir flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3 md:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-400">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-extrabold text-slate-800">EduGera</span>
          <div className="ml-auto">
            <Conta sessao={sessao} status={statusSessao} uso={conta.uso} authConfigurado={conta.authConfigurado} />
          </div>
        </div>

        <header className="nao-imprimir flex items-center justify-between px-4 sm:px-6 md:px-8 py-5">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">{active === "Gerar Material" ? "Gerar Material Visual" : active}</h1>
            <p className="text-sm text-slate-700">{tela.descricao}</p>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            {sessao?.user && <MedidorUso uso={conta.uso} />}
            <Conta sessao={sessao} status={statusSessao} uso={conta.uso} authConfigurado={conta.authConfigurado} />
          </div>
        </header>

        {active === "Dashboard" && (
          <div className="px-4 sm:px-6 md:px-8 pb-10">
            <Dashboard materiais={materiais} config={config} irPara={setActive} />
          </div>
        )}
        {active === "Minhas Apostilas" && (
          <div className="px-4 sm:px-6 md:px-8 pb-10">
            <MinhasApostilas
              materiais={materiais}
              irPara={setActive}
              onRemover={(id) => setMateriais(removerMaterial(id))}
              onRevogar={revogarLink}
              onExportar={exportarBackup}
              onImportar={importar}
            />
          </div>
        )}
        {active === "Configurações" && (
          <div className="px-4 sm:px-6 md:px-8 pb-10">
            <Configuracoes
              key={JSON.stringify(config)}
              config={config}
              onSalvar={salvarPreferencias}
              totalMateriais={materiais.length}
              onLimparLista={() => {
                limparMateriais();
                setMateriais([]);
              }}
            />
          </div>
        )}

        {/* Task 2.1 — split-screen: controles à esquerda, live preview à direita */}
        <div className={`${active === "Gerar Material" ? "grid" : "hidden"} grid-cols-1 xl:grid-cols-2 gap-6 px-4 sm:px-6 md:px-8 pb-10`}>
          {/* ===== FORMULÁRIO ===== */}
          <section className="nao-imprimir self-start rounded-3xl bg-white p-5 sm:p-6 md:p-7 shadow-sm border border-slate-100">
            <div className="mb-6 flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-violet-400" />
              <h2 className="text-lg font-bold text-slate-800">Configuração da criação</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <Field label="Identificação do Professor" icon={User} name="professor">
                  <input value={form.professor} onChange={set("professor")} maxLength={LIMITES.professor} autoComplete="name" className="ipt" placeholder="Nome do docente (salve em Configurações)" />
                </Field>
              </div>

              <Field label="Disciplina" icon={BookOpen} required name="disciplina">
                <select value={form.disciplina} onChange={set("disciplina")} className="ipt">
                  {DISCIPLINAS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>

              <Field label="Nível de Ensino" icon={Layers} required name="nivel">
                <select value={form.nivel} onChange={set("nivel")} className="ipt">
                  {NIVEIS.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </Field>

              {ANOS_POR_NIVEL[form.nivel] && (
                <div className="sm:col-span-2">
                  <Field label="Ano / Série" icon={CalendarRange} optional name="ano">
                    <select value={form.ano} onChange={set("ano")} className="ipt">
                      <option value="">Não especificar (toda a etapa)</option>
                      {ANOS_POR_NIVEL[form.nivel].map((a) => (
                        <option key={a.valor} value={a.valor}>
                          {a.rotulo}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              {/* Task 3.1 — autocomplete BNCC com descrição oficial */}
              <div className="sm:col-span-2">
                <SeletorBNCC
                  codigo={form.bncc}
                  habilidade={form.habilidade}
                  disciplina={form.disciplina}
                  nivel={form.nivel}
                  ano={form.ano}
                  onChange={(v) => setForm((f) => ({ ...f, ...v }))}
                />
              </div>

              <div className="sm:col-span-2">
                <Field label="Tema Principal" icon={Target} required name="tema">
                  <input value={form.tema} onChange={set("tema")} maxLength={LIMITES.tema} className="ipt" placeholder='Ex.: "Volume: medida de capacidade"' />
                </Field>
              </div>

              {/* Task 3.2 — nível de dificuldade / adaptação */}
              <fieldset className="sm:col-span-2">
                <legend className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <Gauge className="h-3.5 w-3.5 text-violet-400" aria-hidden="true" />
                  Nível de Dificuldade / Adaptação
                </legend>
                {/* rádios nativos: setas, Tab e leitores de tela funcionam sem ARIA extra */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {NIVEIS_DIFICULDADE.map((n) => (
                    <label key={n.id} className="block cursor-pointer">
                      <input
                        type="radio"
                        name="dificuldade"
                        id={`dificuldade-${n.id}`}
                        value={n.id}
                        checked={form.dificuldade === n.id}
                        onChange={() => setForm((f) => ({ ...f, dificuldade: n.id }))}
                        className="peer sr-only"
                      />
                      <span className="block h-full rounded-xl border-[1.5px] border-[#ECEAF4] bg-[#FAFAFE] px-3 py-2.5 text-left transition-all hover:border-indigo-200 peer-checked:border-indigo-300 peer-checked:bg-indigo-50 peer-checked:shadow-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-indigo-400 [&>b]:peer-checked:text-indigo-700">
                        <b className="block text-[13px] font-bold text-slate-600">{n.rotulo}</b>
                        <span className="mt-0.5 block text-[11.5px] leading-snug text-slate-700">{n.descricao}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="sm:col-span-2">
                <Field label="Conteúdo ou Orientação" icon={Lightbulb} optional name="conteudo">
                  <textarea
                    value={form.conteudo}
                    onChange={set("conteudo")}
                    maxLength={LIMITES.conteudo}
                    rows={3}
                    className="ipt resize-none"
                    placeholder="Instruções específicas, resumos ou orientações da ficha..."
                    aria-describedby="aviso-dados-alunos"
                  />
                </Field>
                <p id="aviso-dados-alunos" className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-slate-600">
                  <ShieldCheck className="h-3.5 w-3.5 flex-none text-emerald-600" />
                  Não escreva nomes ou dados pessoais de alunos: este texto é enviado à IA.
                </p>
              </div>

              <Field label="Estilo das Ilustrações" icon={ImageIcon} name="estilo">
                <select value={form.estilo} onChange={set("estilo")} className="ipt">
                  {ESTILOS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>

              <Field label="Capa" icon={PanelTop} name="capa">
                <select value={form.capa} onChange={set("capa")} className="ipt">
                  {CAPAS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.rotulo}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {erro && (
              <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-600">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{erro}</span>
              </div>
            )}
            {aviso && !erro && (
              <div role="status" className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{aviso}</span>
              </div>
            )}

            {conta.authConfigurado === false && (
              <p role="status" className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                A geração está desativada até o login ser configurado neste site. Você ainda pode ver o exemplo e testar a prévia e o PDF.
              </p>
            )}
            {sessao?.user && conta.uso?.restantes === 0 && (
              <p role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Você usou as {conta.uso.limite} gerações grátis deste mês. O limite renova no dia 1º.
              </p>
            )}

            {conta.authConfigurado && statusSessao === "unauthenticated" ? (
              <button type="button"
                onClick={() => signIn("google")}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:scale-[1.01] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                <Sparkles className="h-5 w-5" /> Entrar ou criar conta com Google para gerar
              </button>
            ) : null}
            {conta.authConfigurado && statusSessao === "unauthenticated" ? (
              <p className="mt-2 text-center text-[12px] text-slate-600">
                Primeira vez? A conta é criada automaticamente ao entrar — sem formulário nem senha.
              </p>
            ) : (
            <button type="button"
              onClick={handleGerarMaterial}
              disabled={ocupado || conta.authConfigurado === false || conta.uso?.restantes === 0}
              aria-busy={ocupado}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              <Sparkles className={`h-5 w-5 ${ocupado ? "animate-spin" : ""}`} />
              {statusGeracao || (gerado ? "Gerar novamente" : "Gerar Material Visual")}
            </button>
            )}
            {sessao?.user && conta.uso && (
              <p className="mt-2 text-center">
                <MedidorUso uso={conta.uso} compacto />
              </p>
            )}
            <p className="sr-only" aria-live="polite">
              {statusGeracao}
            </p>
          </section>

          {/* ===== LIVE PREVIEW A4 ===== */}
          <section aria-label="Prévia do material" className="coluna-preview min-w-0 xl:sticky xl:top-4 self-start xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
            <div className="nao-imprimir mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-600">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wide">{gerado ? "Seu material · A4" : "Prévia A4"}</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {temExercicios && (
                  <button type="button"
                    onClick={() => setMostrarGabarito((g) => !g)}
                    aria-pressed={mostrarGabarito}
                    className={`btn-prev ${mostrarGabarito ? "!bg-indigo-50" : ""}`}
                  >
                    <KeyRound className="h-3.5 w-3.5" /> {mostrarGabarito ? "Ocultar gabarito" : "Ver gabarito"}
                  </button>
                )}
                <button type="button" onClick={() => window.print()} disabled={loading} className="btn-prev">
                  <Printer className="h-3.5 w-3.5" /> Imprimir
                </button>
                <button type="button" onClick={() => handleBaixarPdf("aluno")} disabled={!!baixandoPdf || loading} className="btn-prev">
                  {baixandoPdf === "aluno" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  PDF do aluno
                </button>
                {temExercicios && (
                  <button type="button"
                    onClick={() => handleBaixarPdf("professor")}
                    disabled={!!baixandoPdf || loading}
                    className="btn-prev"
                    title="Mesmo material + gabarito no final"
                  >
                    {baixandoPdf === "professor" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                    PDF do professor
                  </button>
                )}
              </div>
            </div>

            {/* Verificações automáticas: unidades (área × volume × comprimento) e gabarito */}
            {alertas.length > 0 && (
              <div role="alert" className="nao-imprimir mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900">
                <p className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-4 w-4" /> Revise antes de imprimir
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {alertas.map((a, i) => (
                    <li key={i}>
                      <b>{a.onde}:</b> &ldquo;{a.trecho}&rdquo; — {String(a.motivo).replace(/\.$/, "")}.
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {form.capa !== "nenhuma" && paginacao.paginasFolha <= 1 && (
              <div className="nao-imprimir mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[12.5px] text-sky-900">
                <Info className="h-4 w-4 flex-none" />
                <span>Ficha curta: o conteúdo cabe em 1 página e a capa dobra o papel.</span>
                <button type="button" onClick={() => setForm((f) => ({ ...f, capa: "nenhuma" }))} className="btn-prev ml-auto">
                  Tirar a capa
                </button>
              </div>
            )}

            {/* Exemplo claramente separado do material do professor */}
            {!gerado && (
              <div className="nao-imprimir mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-800">
                <Eye className="mt-0.5 h-4 w-4 flex-none" />
                <span>
                  <b>Isto é um exemplo</b> de como o material fica. Preencha o formulário e clique em <b>Gerar</b>: o seu material
                  substitui o exemplo aqui.
                </span>
              </div>
            )}

            {/* Task 4.1 — link de compartilhamento */}
            {gerado && (
              <div className="nao-imprimir mb-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
                <Link2 className="h-4 w-4 flex-none text-indigo-400" />
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-600">
                  {compartilhar.url && !linkDesatualizado
                    ? compartilhar.url
                    : compartilhar.estado === "erro"
                    ? "Não foi possível salvar o material."
                    : linkDesatualizado
                    ? "Você alterou o material — o link será atualizado ao copiar."
                    : "Salvando material para compartilhar..."}
                </span>
                <button type="button"
                  onClick={handleCopiarLink}
                  disabled={compartilhar.estado === "salvando" || loading}
                  className="flex flex-none items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-60"
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
            {gerado && (
              <p className="nao-imprimir -mt-1 mb-3 px-1 text-[11.5px] text-slate-600">
                Qualquer pessoa com o link vê o material (com seu nome e escola). Para desativar: Minhas Apostilas → Revogar link.
              </p>
            )}

            <PreviewEscalado onPaginas={setPaginacao}>
              <CapaA4
                ref={capaRef}
                variante={form.capa}
                form={formPreview}
                material={materialPreview}
                urlImagem={imagemPreview}
                exemplo={!gerado}
              />
              <FolhaA4
                ref={folhaRef}
                form={formPreview}
                material={materialPreview}
                urlImagem={imagemPreview}
                loadingImagem={gerado && loadingImagem}
                mostrarGabarito={gabaritoVisivel}
                exemplo={!gerado}
                imagemNaCapa={form.capa !== "nenhuma"}
              />
            </PreviewEscalado>
          </section>
        </div>
      </main>

      {/* ===== NAVEGAÇÃO INFERIOR (celular) ===== */}
      <nav
        aria-label="Seções"
        className="nao-imprimir fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white/95 md:hidden"
      >
        {NAV.map(({ name, curto, icon: Icon }) => {
          const on = active === name;
          return (
            <button type="button"
              key={name}
              onClick={() => {
                setActive(name);
                window.scrollTo({ top: 0 });
              }}
              aria-current={on ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold ${on ? "text-indigo-600" : "text-slate-600"}`}
            >
              <Icon className="h-5 w-5" />
              {curto}
            </button>
          );
        })}
      </nav>

      <style>{`
        .ipt {
          width: 100%;
          border-radius: 0.85rem;
          border: 1.5px solid #E2E0EE;
          background: #FAFAFE;
          padding: 0.65rem 0.85rem;
          font-size: 0.875rem;
          color: #334155;
          outline: none;
          transition: all .15s;
        }
        .ipt::placeholder { color: #94a3b8; }
        .ipt:focus {
          border-color: #818CF8;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(129,140,248,.3);
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
        .btn-prev:focus-visible { outline: 2px solid #818cf8; outline-offset: 2px; }
        .btn-prev:disabled { opacity: .6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

// Rótulo associado por htmlFor/id; id e name estáveis; obrigatório de verdade
function Field({ label, icon: Icon, required, optional, name, children }) {
  const id = name ? `campo-${name}` : undefined;
  const campo =
    name && React.isValidElement(children)
      ? React.cloneElement(children, { id, name, ...(required ? { required: true, "aria-required": true } : {}) })
      : children;
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600">
        {Icon && <Icon className="h-3.5 w-3.5 text-violet-400" />}
        {label}
        {required && (
          <span className="text-rose-500" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="font-medium text-slate-500">(opcional)</span>}
      </span>
      {campo}
    </label>
  );
}
