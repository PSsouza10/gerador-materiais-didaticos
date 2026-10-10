"use client";
import React, { useRef, useState } from "react";
import CapaA4 from "@/components/CapaA4";
import FolhaA4 from "@/components/FolhaA4";
import PreviewEscalado from "@/components/PreviewEscalado";
import { exportarPdf } from "@/lib/pdf";

// Casos fixos das prévias (dados de teste; nada inventado sobre pessoas reais)
const exercicios = (a, b) => [
  { enunciado: a.enunciado, alternativas: a.alternativas, resposta: a.resposta, fala: { quem: "lia", texto: a.fala } },
  { enunciado: b.enunciado, alternativas: [], resposta: b.resposta, fala: { quem: "theo", texto: b.fala } },
];
const base = (o) => ({
  conceitos: o.conceitos,
  formulas: o.formulas || [],
  dicas: o.dicas,
  lembreteImportante: o.lembrete,
  cena: { titulo: o.cenaTitulo, lugar: o.lugar, falas: o.falas, pergunta: o.pergunta },
  aplicacaoPratica: { titulo: o.apTitulo, situacao: o.apSituacao, exemplos: o.apExemplos },
  ...o.resto,
});

export const CASOS = [
  {
    id: "matematica",
    rotulo: "1 · Matemática — 5º ano — título curto",
    form: { disciplina: "Matemática", nivel: "Ensino Fundamental", ano: "5", tema: "Volume e capacidade", bncc: "EF05MA21", habilidade: "Reconhecer volume como grandeza associada a sólidos geométricos e medir volumes por meio de empilhamento de cubos, utilizando, preferencialmente, objetos concretos.", bnccVerificada: true, dificuldade: "padrao", escola: "", professor: "" },
    material: {
      tituloDidatico: "Volume e Capacidade",
      resumoPedagogico: "Volume é o espaço que um objeto ocupa; capacidade é o quanto cabe dentro dele.",
      ...base({
        conceitos: [{ termo: "Volume", definicao: "Espaço ocupado por um corpo." }, { termo: "Capacidade", definicao: "Quanto cabe dentro de um recipiente." }],
        formulas: [{ nome: "Bloco retangular", expressao: "V = c × l × h", descricao: "comprimento × largura × altura" }],
        dicas: ["Conte os cubinhos camada por camada."],
        lembrete: "1 dm³ = 1 L.",
        cenaTitulo: "Quantos cubinhos cabem?",
        lugar: "escola",
        falas: [{ quem: "lia", texto: "Montei uma caixa com cubinhos!" }, { quem: "theo", texto: "Quantos cabem dentro dela?" }],
        pergunta: "Quantos cubinhos cabem na caixa?",
        apTitulo: "No dia a dia",
        apSituacao: "Caixas, aquários e garrafas têm volume e capacidade.",
        apExemplos: ["Garrafa de 2 L", "Caixa de sapatos"],
      }),
      exercicios: exercicios(
        { enunciado: "Uma caixa tem 3 camadas de 4 cubinhos. Quantos cubinhos há?", alternativas: ["a) 7", "b) 12", "c) 16", "d) 34"], resposta: "b) 12 — 3 × 4 = 12.", fala: "Vou contar por camadas." },
        { enunciado: "Explique a diferença entre volume e capacidade.", resposta: "Volume é o espaço ocupado; capacidade é o quanto cabe dentro.", fala: "Será que é a mesma coisa?" }
      ),
      bncc: { codigo: "EF05MA21", texto: "Reconhecer volume como grandeza associada a sólidos geométricos e medir volumes por meio de empilhamento de cubos, utilizando, preferencialmente, objetos concretos.", verificada: true },
    },
  },
  {
    id: "portugues",
    rotulo: "2 · Português — 6º ano — título médio",
    form: { disciplina: "Português", nivel: "Ensino Fundamental", ano: "6", tema: "Verbos e suas variações", bncc: "EF06LP04", habilidade: "Analisar a função e as flexões de substantivos e adjetivos e de verbos nos modos Indicativo, Subjuntivo e Imperativo: afirmativo e negativo.", bnccVerificada: true, dificuldade: "padrao", escola: "", professor: "" },
    material: {
      tituloDidatico: "Verbos e suas variações no dia a dia",
      resumoPedagogico: "O verbo muda para mostrar quem faz a ação e quando ela acontece: presente, passado e futuro.",
      ...base({
        conceitos: [{ termo: "Verbo", definicao: "Palavra que indica ação, estado ou fenômeno." }, { termo: "Tempo verbal", definicao: "Presente, pretérito ou futuro." }],
        dicas: ["Pergunte: quem faz? quando?"],
        lembrete: "O verbo concorda com o sujeito.",
        cenaTitulo: "Ontem, hoje e amanhã",
        lugar: "biblioteca",
        falas: [{ quem: "theo", texto: "Eu corri ontem e corro hoje." }, { quem: "vo", texto: "E amanhã, Théo?" }],
        pergunta: "Como fica o verbo correr no futuro?",
        apTitulo: "Na conversa",
        apSituacao: "Usamos tempos verbais para contar histórias.",
        apExemplos: ["Eu li", "Eu lerei"],
      }),
      exercicios: exercicios(
        { enunciado: "Qual frase está no futuro?", alternativas: ["a) Eu estudo.", "b) Eu estudei.", "c) Eu estudarei.", "d) Eu estudava."], resposta: "c) Eu estudarei.", fala: "Amanhã eu…" },
        { enunciado: "Escreva uma frase com o verbo cantar no passado.", resposta: "Exemplo: Ontem eu cantei na escola.", fala: "Cantei ou canto?" }
      ),
      bncc: { codigo: "EF06LP04", texto: "Analisar a função e as flexões de substantivos e adjetivos e de verbos nos modos Indicativo, Subjuntivo e Imperativo: afirmativo e negativo.", verificada: true },
    },
  },
  {
    id: "ciencias",
    rotulo: "3 · Ciências — 5º ano — título longo",
    form: { disciplina: "Ciências", nivel: "Ensino Fundamental", ano: "5", tema: "Meio ambiente", bncc: "EF05CI05", habilidade: "Construir propostas coletivas para um consumo mais consciente e criar soluções tecnológicas para o descarte adequado e a reutilização ou reciclagem de materiais consumidos na escola e/ou na vida cotidiana.", bnccVerificada: true, dificuldade: "padrao", escola: "", professor: "" },
    material: {
      tituloDidatico: "Meio ambiente: pequenas atitudes que cuidam do nosso planeta",
      resumoPedagogico: "Reduzir, reutilizar e reciclar: atitudes do dia a dia que diminuem o lixo e protegem a natureza.",
      ...base({
        conceitos: [{ termo: "Reciclagem", definicao: "Transformar um material usado em um novo." }, { termo: "Consumo consciente", definicao: "Comprar e usar só o necessário." }],
        dicas: ["Separe o lixo seco do orgânico."],
        lembrete: "Reduzir vem antes de reciclar.",
        cenaTitulo: "A horta da escola",
        lugar: "escola",
        falas: [{ quem: "lia", texto: "Vamos usar as cascas como adubo!" }, { quem: "edu", texto: "E o que mais dá para reaproveitar?" }],
        pergunta: "O que a turma pode reaproveitar na horta?",
        apTitulo: "Na escola",
        apSituacao: "Coleta seletiva e horta reduzem o lixo.",
        apExemplos: ["Composteira", "Garrafa vira vaso"],
      }),
      exercicios: exercicios(
        { enunciado: "Qual atitude reduz o lixo?", alternativas: ["a) Usar copo descartável", "b) Levar garrafinha", "c) Jogar tudo junto", "d) Comprar sem precisar"], resposta: "b) Levar garrafinha.", fala: "Trouxe minha garrafa!" },
        { enunciado: "Proponha uma ação para diminuir o lixo na sua escola.", resposta: "Resposta pessoal, com uma ação coletiva viável.", fala: "Qual seria a sua ideia?" }
      ),
      bncc: { codigo: "EF05CI05", texto: "Construir propostas coletivas para um consumo mais consciente e criar soluções tecnológicas para o descarte adequado e a reutilização ou reciclagem de materiais consumidos na escola e/ou na vida cotidiana.", verificada: true },
    },
  },
  {
    id: "completo",
    rotulo: "4 · Escola, professor e turma + título muito longo + descrição longa",
    form: {
      disciplina: "Geografia",
      nivel: "Ensino Fundamental",
      ano: "7",
      tema: "Paisagens do Brasil",
      bncc: "EF07GE01",
      habilidade: "Avaliar, por meio de exemplos extraídos dos meios de comunicação, ideias e estereótipos acerca das paisagens e da formação territorial do Brasil.",
      bnccVerificada: true,
      dificuldade: "padrao",
      escola: "Escola Municipal de Ensino Fundamental Professora Maria José da Conceição",
      professor: "Prof.ª Ana Beatriz Nascimento Ferreira",
      turma: "7º ano B — período da tarde",
    },
    material: {
      tituloDidatico: "Paisagens do Brasil: como o relevo, o clima, a vegetação e a ação humana transformam os lugares onde vivemos",
      resumoPedagogico:
        "Nesta apostila você vai observar paisagens de diferentes regiões do Brasil, comparar o que é natural e o que foi construído pelas pessoas, entender como o relevo e o clima influenciam a vida nas cidades e no campo, e analisar como notícias e propagandas às vezes mostram estereótipos sobre esses lugares.",
      ...base({
        conceitos: [{ termo: "Paisagem", definicao: "Tudo o que vemos em um lugar." }, { termo: "Relevo", definicao: "Formas da superfície da Terra." }],
        dicas: ["Compare fotos de antes e depois."],
        lembrete: "A paisagem muda com o tempo.",
        cenaTitulo: "Fotos da viagem",
        lugar: "casa",
        falas: [{ quem: "vo", texto: "Esta foto é do sertão, Lia." }, { quem: "lia", texto: "É bem diferente da nossa cidade!" }],
        pergunta: "O que mudou na paisagem entre as duas fotos?",
        apTitulo: "Nas notícias",
        apSituacao: "Reportagens mostram paisagens de todo o país.",
        apExemplos: ["Serra", "Litoral"],
      }),
      exercicios: exercicios(
        { enunciado: "Qual elemento é natural na paisagem?", alternativas: ["a) Ponte", "b) Rio", "c) Prédio", "d) Estrada"], resposta: "b) Rio.", fala: "O rio já estava lá!" },
        { enunciado: "Descreva uma paisagem do lugar onde você vive.", resposta: "Resposta pessoal, citando elementos naturais e construídos.", fala: "E a sua rua?" }
      ),
      bncc: { codigo: "EF07GE01", texto: "Avaliar, por meio de exemplos extraídos dos meios de comunicação, ideias e estereótipos acerca das paisagens e da formação territorial do Brasil.", verificada: true },
    },
  },
  {
    id: "vazio",
    rotulo: "5 · Campos vazios: sem BNCC, sem ano, sem escola — Arte",
    form: { disciplina: "Arte", nivel: "", ano: "", tema: "Cores", dificuldade: "padrao", escola: "", professor: "" },
    material: {
      tituloDidatico: "Cores",
      ...base({
        conceitos: [{ termo: "Cor primária", definicao: "Vermelho, amarelo e azul." }],
        dicas: ["Misture duas cores primárias."],
        lembrete: "Cores secundárias nascem da mistura.",
        cenaTitulo: "",
        lugar: "escola",
        falas: [{ quem: "lia", texto: "Misturei azul e amarelo!" }, { quem: "edu", texto: "Que cor apareceu?" }],
        pergunta: "",
        apTitulo: "Na arte",
        apSituacao: "Pintores misturam cores.",
        apExemplos: ["Verde", "Laranja"],
      }),
      exercicios: exercicios(
        { enunciado: "Azul + amarelo = ?", alternativas: ["a) Verde", "b) Roxo", "c) Laranja", "d) Rosa"], resposta: "a) Verde.", fala: "Vou testar!" },
        { enunciado: "Pinte um desenho só com cores secundárias.", resposta: "Atividade prática.", fala: "Quais são?" }
      ),
    },
  },
  {
    id: "ciencias-ia",
    rotulo: "3b · Ciências com ilustração da IA (exemplo)",
    imagem: "/vitrine/ilustracao-exemplo-ciencias.webp",
    base: "ciencias",
  },
];

function Caso({ caso, variante = "historia", pdf = true }) {
  const capa = useRef(null);
  const folha = useRef(null);
  const [gab, setGab] = useState(false);
  const [estado, setEstado] = useState("");
  const dados = caso.base ? { ...CASOS.find((c) => c.id === caso.base), ...caso } : caso;
  const baixar = async (prof) => {
    setEstado("gerando…");
    setGab(prof);
    await new Promise((ok) => setTimeout(ok, 120));
    try {
      await exportarPdf(folha.current, `capa-${caso.id}-${variante}${prof ? "-professor" : ""}.pdf`, { capa: capa.current, titulo: dados.material.tituloDidatico, assunto: dados.form.disciplina, autor: dados.form.professor });
      setEstado("pronto");
    } catch (e) {
      setEstado("erro: " + e.message);
    } finally {
      setGab(false);
    }
  };
  return (
    <figure className="caso-capa" data-caso={caso.id} data-variante={variante}>
      <figcaption className="mb-2 text-sm font-bold text-slate-700">{variante === "historia" ? caso.rotulo : `Comparação · capa ${variante}`}</figcaption>
      <PreviewEscalado larguraMax={420}>
        <CapaA4 ref={capa} variante={variante} form={dados.form} material={dados.material} urlImagem={caso.imagem || null} />
      </PreviewEscalado>
      {pdf && (
        <div className="mt-2 flex gap-2 text-xs">
          <button type="button" className="rounded-full border px-3 py-1" data-pdf="aluno" onClick={() => baixar(false)}>PDF do aluno</button>
          <button type="button" className="rounded-full border px-3 py-1" data-pdf="professor" onClick={() => baixar(true)}>PDF do professor</button>
          <span data-estado>{estado}</span>
        </div>
      )}
      {/* folha completa fora da tela: o PDF usa a mesma capa da prévia + o conteúdo */}
      <div style={{ position: "absolute", left: -10000, top: 0 }} aria-hidden="true">
        <FolhaA4 ref={folha} form={dados.form} material={dados.material} mostrarGabarito={gab} imagemNaCapa />
      </div>
    </figure>
  );
}

export default function CapasTeste() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-black text-slate-800">Prévias · capa “História que Ensina” (teste)</h1>
      <p className="mt-1 text-sm text-slate-600">Dados de teste. A ilustração de exemplo (3b) mostra como fica quando a IA gera a imagem do tema; sem ela, a capa usa o desenho do próprio sistema.</p>
      <section className="mt-6 grid gap-8 sm:grid-cols-2 xl:grid-cols-3" id="historia">
        {CASOS.map((c) => (
          <Caso key={c.id} caso={c} />
        ))}
      </section>
      <h2 className="mt-12 text-xl font-black text-slate-800">Comparação com as capas atuais (caso 1)</h2>
      <section className="mt-4 grid gap-8 sm:grid-cols-2 xl:grid-cols-4" id="comparacao">
        {["historia", "infografico", "escolar", "comfy"].map((v) => (
          <Caso key={v} caso={CASOS[0]} variante={v} pdf={false} />
        ))}
      </section>
    </main>
  );
}
