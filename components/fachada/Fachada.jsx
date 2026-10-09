import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  PlayCircle,
  BadgeCheck,
  ListChecks,
  FileDown,
  Search,
  LayoutTemplate,
  ClipboardCheck,
  BookOpenCheck,
  Eye,
  Printer,
  Sparkles,
  Layers3,
  MessagesSquare,
  Files,
  FolderHeart,
  Smartphone,
  Calculator,
  Ruler,
  ShieldCheck,
  Images,
  Plus,
  UserRound,
  GraduationCap,
} from "lucide-react";
import Cabecalho from "./Cabecalho";
import Vitrine from "./Vitrine";
import Marca from "./Marca";
import "./fachada.css";

// Fachada pública do EduGera ("/"). O gerador fica em /criar, sem mudanças.
// Regras de conteúdo: nada de números, depoimentos ou avaliações inventados;
// as imagens são capturas da prévia A4 real do app (material de exemplo).

function Titulo2({ eyebrow, children, centro = false, id }) {
  return (
    <div className={centro ? "mx-auto max-w-[860px] text-center" : "max-w-[760px]"}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 id={id} className="font-titulo mt-3 text-[2.15rem] font-semibold leading-[1.1] text-marinho sm:text-[2.75rem]">
        {children}
      </h2>
    </div>
  );
}

function Hero() {
  return (
    <section aria-labelledby="titulo-principal" className="relative">
      {/* fundo editorial: manchas suaves */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full bg-roxo-claro opacity-80 blur-3xl" />
        <div className="absolute -left-48 bottom-[-180px] h-[420px] w-[420px] rounded-full bg-verde-claro opacity-70 blur-2xl" />
      </div>

      <div className="relative mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)] items-center gap-14 px-5 pb-20 pt-8 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10 lg:pb-28 lg:pt-14">
        <div>
          <p className="surgir inline-flex items-center gap-2 rounded-full bg-verde-claro px-4 py-2 text-sm font-semibold text-verde-escuro">
            <BookOpenCheck className="h-4 w-4" aria-hidden="true" /> Alinhado à BNCC
          </p>
          <h1
            id="titulo-principal"
            className="surgir atraso-1 font-titulo mt-6 text-[2.6rem] font-semibold leading-[1.04] text-marinho sm:text-[3.6rem] xl:text-[4.25rem]"
          >
            A apostila que você imaginou. Pronta para{" "}
            <span className="whitespace-nowrap">
              <span className="relative inline-block text-coral">
                ensinar.
                <svg aria-hidden="true" viewBox="0 0 260 18" className="absolute -bottom-2 left-0 h-[0.32em] w-full" preserveAspectRatio="none">
                  <path className="traco" d="M3 13c48-8 104-11 164-8 30 1.6 58 4 90 7" fill="none" stroke="#e0592f" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>
            </span>
          </h1>
          <p className="surgir atraso-2 mt-7 max-w-[560px] text-[1.15rem] leading-relaxed text-tinta sm:text-[1.25rem]">
            Crie materiais visuais alinhados à BNCC, com exercícios, gabarito e PDFs prontos para imprimir — sem começar do zero.
          </p>
          <div className="surgir atraso-3 mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/criar" className="btn-primario justify-center">
              <Sparkles className="h-5 w-5" aria-hidden="true" /> Criar minha primeira apostila
            </Link>
            <a href="#como-funciona" className="btn-secundario justify-center">
              <PlayCircle className="h-5 w-5" aria-hidden="true" /> Ver como funciona
            </a>
          </div>
          <ul className="surgir atraso-4 mt-10 grid max-w-[560px] grid-cols-1 gap-4 text-[15px] text-tinta sm:grid-cols-3">
            <li className="flex items-center gap-2.5">
              <BadgeCheck className="h-5 w-5 shrink-0 text-verde" aria-hidden="true" /> Habilidade BNCC conferida
            </li>
            <li className="flex items-center gap-2.5">
              <ListChecks className="h-5 w-5 shrink-0 text-roxo" aria-hidden="true" /> Exercícios com gabarito
            </li>
            <li className="flex items-center gap-2.5">
              <FileDown className="h-5 w-5 shrink-0 text-coral-escuro" aria-hidden="true" /> PDF do aluno e do professor
            </li>
          </ul>
        </div>

        <MockupHero />
      </div>
    </section>
  );
}

// Composição com prévias reais: capa + página de conteúdo + gabarito, e cartões do que vem junto.
function MockupHero() {
  return (
    <div className="surgir atraso-2 relative mx-auto aspect-[1/1.02] w-full max-w-[560px]" aria-label="Prévia de uma apostila gerada pelo EduGera" role="img">
      <div aria-hidden="true" className="absolute inset-[6%] rounded-full bg-[radial-gradient(circle_at_40%_40%,#cfc5fa_0%,#e9e3fd_55%,transparent_72%)]" />

      {/* página de conteúdo (atrás) */}
      <div className="folha-sombra absolute right-[2%] top-[9%] w-[52%] rotate-[5deg] overflow-hidden bg-white">
        <Image src="/vitrine/conteudo.webp" width={960} height={1064} alt="" priority sizes="300px" className="h-auto w-full" />
      </div>
      {/* capa (frente) */}
      <div className="folha-sombra absolute left-[6%] top-[4%] w-[56%] -rotate-[4deg] overflow-hidden bg-white">
        <Image src="/vitrine/capa-infografico.webp" width={760} height={1076} alt="" priority sizes="320px" className="h-auto w-full" />
      </div>
      {/* gabarito (base) */}
      <div className="folha-sombra absolute bottom-[3%] right-[0%] w-[58%] rotate-[-2deg] overflow-hidden bg-white">
        <Image src="/vitrine/gabarito.webp" width={960} height={254} alt="" sizes="330px" className="h-auto w-full" />
      </div>

      {/* cartões: BNCC, exercícios, gabarito, PDF */}
      <div className="flutuar absolute left-0 top-[46%] flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-[0_14px_30px_-14px_rgba(22,26,79,0.45)] sm:-left-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-verde-claro">
          <BadgeCheck className="h-5 w-5 text-verde" aria-hidden="true" />
        </span>
        <span className="leading-tight">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-verde-escuro">BNCC verificada</span>
          <span className="block text-sm font-bold text-marinho">EF07MA30</span>
        </span>
      </div>
      <div className="flutuar-lento absolute right-[1%] top-[0%] flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 shadow-[0_14px_30px_-14px_rgba(22,26,79,0.45)]">
        <ListChecks className="h-5 w-5 text-roxo" aria-hidden="true" />
        <span className="text-sm font-bold text-marinho">3 exercícios</span>
      </div>
      <div className="flutuar-lento absolute bottom-[20%] left-[4%] flex items-center gap-2 rounded-2xl bg-marinho px-3.5 py-2.5 text-white shadow-[0_14px_30px_-14px_rgba(22,26,79,0.6)]">
        <ClipboardCheck className="h-5 w-5 text-[#9ee0b6]" aria-hidden="true" />
        <span className="text-sm font-semibold">Gabarito conferido</span>
      </div>
      <div className="absolute -bottom-3 left-[18%] flex gap-2 sm:left-[22%]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-roxo-claro px-3 py-1.5 text-[13px] font-semibold text-roxo-escuro shadow-sm">
          <FileDown className="h-4 w-4" aria-hidden="true" /> PDF do aluno
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-claro px-3 py-1.5 text-[13px] font-semibold text-coral-escuro shadow-sm">
          <FileDown className="h-4 w-4" aria-hidden="true" /> PDF do professor
        </span>
      </div>
    </div>
  );
}

const DORES = [
  { icone: Search, titulo: "Achar a habilidade certa", texto: "Ler a BNCC, conferir a etapa e o ano, escrever o código no cabeçalho." },
  { icone: LayoutTemplate, titulo: "Diagramar para imprimir", texto: "Ajustar texto, figura e espaço de resposta até caber direito na folha A4." },
  { icone: ClipboardCheck, titulo: "Revisar cada resposta", texto: "Refazer as contas do gabarito e conferir se nenhuma alternativa ficou trocada." },
];

function Problema() {
  return (
    <section aria-labelledby="titulo-problema" className="bg-white/60 py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <Titulo2 eyebrow="O problema" id="titulo-problema">
          Planejar, diagramar e revisar uma atividade consome tempo.
        </Titulo2>
        <p className="mt-5 max-w-[640px] text-lg leading-relaxed text-tinta">
          Tempo que sai da correção, do planejamento da aula e da sua vida fora da escola. A parte repetitiva não precisa ser sua.
        </p>
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {DORES.map(({ icone: Icone, titulo, texto }) => (
            <li key={titulo} className="papel p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral-claro">
                <Icone className="h-6 w-6 text-coral-escuro" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-bold text-marinho">{titulo}</h3>
              <p className="mt-2 leading-relaxed text-tinta">{texto}</p>
            </li>
          ))}
        </ul>
        <p className="font-titulo mt-12 max-w-[820px] text-[1.6rem] font-medium italic leading-snug text-marinho sm:text-[1.9rem]">
          O EduGera monta o primeiro rascunho completo. <span className="text-roxo">Você revisa, decide e imprime.</span>
        </p>
      </div>
    </section>
  );
}

const PASSOS = [
  {
    icone: Search,
    cor: "bg-coral-claro text-coral-escuro",
    titulo: "Escolha tema e habilidade",
    texto: "Informe disciplina, etapa, ano e tema. Se quiser, indique a habilidade da BNCC pelo código (como EF07MA30) ou por palavra-chave.",
  },
  {
    icone: Eye,
    cor: "bg-roxo-claro text-roxo-escuro",
    titulo: "Revise o material",
    texto: "Veja a prévia A4 e passe por cada exercício: aprovar, editar, corrigir com IA ou excluir. As conferências automáticas apontam o que olhar.",
  },
  {
    icone: Printer,
    cor: "bg-verde-claro text-verde-escuro",
    titulo: "Imprima ou compartilhe",
    texto: "Baixe o PDF do aluno e o PDF do professor, com gabarito. Ou envie um link para a turma abrir no celular.",
  },
];

function ComoFunciona() {
  return (
    <section id="como-funciona" aria-labelledby="titulo-como" className="py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <Titulo2 eyebrow="Como funciona" id="titulo-como" centro>
          Da ideia à folha impressa em 3 passos
        </Titulo2>
        <ol className="relative mt-14 grid gap-6 md:grid-cols-3 md:gap-8">
          <div aria-hidden="true" className="absolute left-[16%] right-[16%] top-[44px] hidden border-t-2 border-dashed border-marinho/15 md:block" />
          {PASSOS.map(({ icone: Icone, cor, titulo, texto }, i) => (
            <li key={titulo} className="papel relative p-7 text-center">
              <span className={`relative mx-auto flex h-[60px] w-[60px] items-center justify-center rounded-2xl ${cor}`}>
                <Icone className="h-7 w-7" aria-hidden="true" />
                <span className="absolute -right-2.5 -top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-marinho text-sm font-bold text-white">
                  {i + 1}
                </span>
              </span>
              <h3 className="mt-6 text-xl font-bold text-marinho">{titulo}</h3>
              <p className="mt-2.5 leading-relaxed text-tinta">{texto}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 text-center">
          <Link href="/criar" className="btn-primario">
            Experimentar agora <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Exemplos() {
  return (
    <section id="exemplos" aria-labelledby="titulo-exemplos" className="grao bg-creme-escuro py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <Titulo2 eyebrow="Exemplo real" id="titulo-exemplos">
          Veja o que sai do EduGera
        </Titulo2>
        <p className="mt-5 max-w-[680px] text-lg leading-relaxed text-tinta">
          Uma ficha de Matemática do 7º ano sobre volume e capacidade, do jeito que o EduGera monta: capa, conteúdo, exercícios, gabarito e os dois PDFs.
        </p>
        <Vitrine />
      </div>
    </section>
  );
}

const BENEFICIOS = [
  { icone: Sparkles, titulo: "Nada de página em branco", texto: "Você parte de um material completo e ajusta o que quiser, em vez de montar tudo do zero." },
  { icone: Layers3, titulo: "Três níveis de dificuldade", texto: "Acompanhamento/Adaptado, Padrão ou Desafio: a linguagem e as questões mudam conforme a turma." },
  { icone: MessagesSquare, titulo: "Matemática do dia a dia", texto: "Situações do cotidiano apresentadas por personagens, para o aluno ver sentido no conteúdo." },
  { icone: Files, titulo: "Aluno e professor separados", texto: "Dois PDFs: a folha da turma e a sua, com gabarito e resolução." },
  { icone: FolderHeart, titulo: "Tudo guardado", texto: "Seus materiais ficam em Minhas Apostilas. Com login, a lista acompanha você em outros aparelhos." },
  { icone: Smartphone, titulo: "No computador ou no celular", texto: "Crie na escola, revise em casa e compartilhe por link." },
];

function Beneficios() {
  return (
    <section aria-labelledby="titulo-beneficios" className="py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <Titulo2 eyebrow="Para professores" id="titulo-beneficios">
          Feito para a rotina de quem dá aula
        </Titulo2>
        <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFICIOS.map(({ icone: Icone, titulo, texto }) => (
            <li key={titulo} className="flex gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-roxo-claro">
                <Icone className="h-6 w-6 text-roxo-escuro" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-marinho">{titulo}</h3>
                <p className="mt-1.5 leading-relaxed text-tinta">{texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const CONFERENCIAS = [
  { icone: BookOpenCheck, titulo: "Habilidade da BNCC", texto: "O código é buscado na base oficial e conferido com a etapa e o ano escolhidos." },
  { icone: Calculator, titulo: "Gabarito pelo cálculo", texto: "Se a conta dá uma alternativa diferente da marcada, a letra é corrigida e você é avisado." },
  { icone: Ruler, titulo: "Unidades de medida", texto: "Área em cm², volume em m³ ou litros: misturas suspeitas são apontadas para revisão." },
  { icone: ListChecks, titulo: "Qualidade das questões", texto: "Alternativas repetidas, textos longos demais e pouca variedade de questões geram aviso." },
  { icone: Images, titulo: "Figuras citadas", texto: "Se um enunciado fala de uma figura ou tabela que não veio, você fica sabendo." },
];

function Bncc() {
  return (
    <section id="bncc" aria-labelledby="titulo-bncc" className="bg-marinho py-20 text-white sm:py-28">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <p className="eyebrow !text-[#ffb59a]">BNCC e revisão automática</p>
          <h2 id="titulo-bncc" className="font-titulo mt-3 text-[2.15rem] font-semibold leading-[1.1] sm:text-[2.75rem]">
            Alinhado à BNCC. Conferido antes de chegar à sua turma.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-white/80">
            Depois que a IA escreve, o EduGera passa o material por conferências fixas, sem depender de outra resposta da IA. Elas não substituem o seu olhar: mostram onde vale a pena olhar primeiro.
          </p>
          <p className="mt-8 flex items-start gap-3 rounded-2xl border border-white/15 bg-white/5 p-5 text-[15px] leading-relaxed text-white/85">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#9ee0b6]" aria-hidden="true" />
            A IA pode errar. Por isso cada material diz “revise antes de aplicar”, e a palavra final é sempre sua.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {CONFERENCIAS.map(({ icone: Icone, titulo, texto }, i) => (
            <li key={titulo} className={`rounded-2xl border border-white/10 bg-white/[0.06] p-6 ${i === 0 ? "sm:col-span-2" : ""}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9ee0b6]/15">
                  <Icone className="h-5 w-5 text-[#9ee0b6]" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-bold">{titulo}</h3>
              </div>
              <p className="mt-3 leading-relaxed text-white/75">{texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const CAPAS = [
  { img: "/vitrine/capa-infografico.webp", nome: "Infográfico", texto: "Colorida, com fórmulas e personagens." },
  { img: "/vitrine/capa-escolar.webp", nome: "Escolar", texto: "Clara, com ilustração e espaço para o nome." },
  { img: "/vitrine/capa-escura.webp", nome: "Escura", texto: "Visual de projeto, com o resumo do pedido." },
];

function Demonstracao() {
  return (
    <section aria-labelledby="titulo-demo" className="py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <Titulo2 eyebrow="Demonstração" id="titulo-demo" centro>
          O mesmo conteúdo, a capa que combina com a sua turma
        </Titulo2>
        <p className="mx-auto mt-5 max-w-[640px] text-center text-lg leading-relaxed text-tinta">
          Três estilos de capa para a mesma ficha de exemplo — ou nenhuma capa, para economizar papel.
        </p>
        <ul className="mt-14 grid gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-10">
          {CAPAS.map((c, i) => (
            <li key={c.nome} className={i === 1 ? "sm:-translate-y-6" : ""}>
              <figure>
                <div className="folha-sombra overflow-hidden bg-white transition-transform duration-300 hover:-translate-y-1">
                  <Image
                    src={c.img}
                    width={760}
                    height={1076}
                    sizes="(min-width: 640px) 33vw, 90vw"
                    alt={`Capa estilo ${c.nome} da ficha “Volume e Capacidade no Dia a Dia”.`}
                    className="h-auto w-full"
                  />
                </div>
                <figcaption className="mt-5 text-center">
                  <span className="block text-lg font-bold text-marinho">Capa {c.nome}</span>
                  <span className="mt-1 block text-[15px] text-tinta">{c.texto}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const PERGUNTAS = [
  {
    p: "Preciso pagar para usar?",
    r: "Não. Você cria materiais de graça, com um limite mensal de gerações por conta, que renova no dia 1º de cada mês.",
  },
  {
    p: "Preciso criar uma conta?",
    r: "Para gerar materiais, você entra com a sua conta Google. Não há cadastro nem senha nova.",
  },
  {
    p: "O material segue a BNCC?",
    r: "Sim. Você pode indicar a habilidade pelo código ou por palavra-chave. O EduGera busca a habilidade na base oficial, confere se ela combina com a etapa e o ano escolhidos e mostra o código no material.",
  },
  {
    p: "Posso editar antes de imprimir?",
    r: "Pode. Na revisão, cada exercício pode ser aprovado, editado, corrigido com IA ou excluído. Você também escolhe o nível de dificuldade, o estilo da capa e o tipo de ilustração.",
  },
  {
    p: "A inteligência artificial pode errar?",
    r: "Pode. As conferências automáticas (gabarito, unidades, BNCC e qualidade das questões) ajudam a encontrar problemas, mas a revisão final é sempre do professor.",
  },
  {
    p: "Posso colocar o nome dos meus alunos?",
    r: "Não escreva nomes ou dados pessoais de alunos no pedido: esse texto é enviado à IA. O cabeçalho da folha já traz espaço para o aluno preencher nome, turma e data.",
  },
  {
    p: "Como entrego para a turma?",
    r: "Imprima o PDF do aluno, ou envie o link do material para a turma abrir no celular. O PDF do professor, com gabarito, fica com você.",
  },
  {
    p: "Onde ficam os materiais que eu criei?",
    r: "Em Minhas Apostilas. Com login, a lista acompanha a sua conta no computador e no celular.",
  },
];

function Faq() {
  return (
    <section id="perguntas" aria-labelledby="titulo-faq" className="bg-white/60 py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 sm:px-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
        <div>
          <Titulo2 eyebrow="Perguntas frequentes" id="titulo-faq">
            Antes de começar
          </Titulo2>
          <p className="mt-5 text-lg leading-relaxed text-tinta">
            Ainda tem dúvida? Veja a{" "}
            <Link href="/privacidade" className="font-semibold text-roxo underline underline-offset-4 hover:text-roxo-escuro">
              Política de Privacidade
            </Link>{" "}
            e os{" "}
            <Link href="/termos" className="font-semibold text-roxo underline underline-offset-4 hover:text-roxo-escuro">
              Termos de Uso
            </Link>
            .
          </p>
        </div>
        <div className="divide-y divide-marinho/10 border-y border-marinho/10">
          {PERGUNTAS.map(({ p, r }) => (
            <details key={p} className="group">
              <summary className="flex min-h-[64px] items-center justify-between gap-6 py-5 text-left text-lg font-semibold text-marinho">
                {p}
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-roxo-claro text-roxo-escuro">
                  <Plus className="seta-faq h-5 w-5 transition-transform duration-200" aria-hidden="true" />
                </span>
              </summary>
              <p className="-mt-1 max-w-[680px] pb-6 pr-12 leading-relaxed text-tinta">{r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChamadaFinal() {
  return (
    <section aria-labelledby="titulo-final" className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="relative mx-auto max-w-[1100px] overflow-hidden rounded-[32px] bg-gradient-to-br from-roxo-escuro via-roxo to-[#7a5ce6] px-6 py-16 text-center text-white sm:px-12 sm:py-20">
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div aria-hidden="true" className="absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-coral/30 blur-2xl" />
        <h2 id="titulo-final" className="font-titulo relative text-[2.3rem] font-semibold leading-[1.08] sm:text-[3.4rem]">
          Crie sua primeira apostila hoje.
        </h2>
        <p className="relative mx-auto mt-5 max-w-[560px] text-lg text-white/85">
          Escolha o tema, revise e imprima. O resto, o EduGera prepara para você.
        </p>
        <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/criar"
            className="inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-white px-8 py-4 text-[1.0625rem] font-bold text-marinho shadow-[0_14px_30px_-12px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5"
          >
            <Sparkles className="h-5 w-5 text-roxo" aria-hidden="true" /> Criar minha primeira apostila
          </Link>
        </div>
        <p className="relative mt-5 text-sm text-white/75">Gratuito, com limite mensal de gerações. Entre com sua conta Google.</p>
      </div>
    </section>
  );
}

function Rodape() {
  return (
    <footer className="border-t border-marinho/10">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-[340px]">
          <Marca />
          <p className="mt-4 text-[15px] leading-relaxed text-tinta">Materiais didáticos visuais alinhados à BNCC, feitos para professores.</p>
        </div>
        <nav aria-label="Rodapé">
          <ul className="grid grid-cols-2 gap-x-12 gap-y-3 text-[15px] font-medium text-marinho">
            <li>
              <Link href="/criar" className="inline-flex items-center gap-1.5 hover:text-roxo">
                <GraduationCap className="h-4 w-4" aria-hidden="true" /> Criar material
              </Link>
            </li>
            <li>
              <a href="#como-funciona" className="hover:text-roxo">Como funciona</a>
            </li>
            <li>
              <Link href="/criar" className="inline-flex items-center gap-1.5 hover:text-roxo">
                <UserRound className="h-4 w-4" aria-hidden="true" /> Entrar
              </Link>
            </li>
            <li>
              <a href="#perguntas" className="hover:text-roxo">Perguntas</a>
            </li>
            <li>
              <Link href="/privacidade" className="hover:text-roxo">Privacidade</Link>
            </li>
            <li>
              <Link href="/termos" className="hover:text-roxo">Termos de Uso</Link>
            </li>
          </ul>
        </nav>
      </div>
      <p className="border-t border-marinho/10 py-6 text-center text-[13px] text-tinta">
        © {new Date().getFullYear()} EduGera · Materiais que geram novas histórias
      </p>
    </footer>
  );
}

export default function Fachada() {
  return (
    <div className="fachada min-h-screen">
      <a href="#conteudo" className="sr-only z-50 rounded-lg bg-marinho px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Pular para o conteúdo
      </a>
      <Cabecalho />
      <main id="conteudo">
        <Hero />
        <Problema />
        <ComoFunciona />
        <Exemplos />
        <Beneficios />
        <Bncc />
        <Demonstracao />
        <Faq />
        <ChamadaFinal />
      </main>
      <Rodape />
    </div>
  );
}
