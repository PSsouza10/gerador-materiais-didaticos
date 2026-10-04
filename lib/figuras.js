// Figuras didáticas desenhadas pelo próprio EduGera (não pela IA de imagem):
// a IA só descreve a figura em JSON; aqui os dados são limpos e limitados, e
// components/FiguraDidatica.jsx desenha em SVG/HTML. Servem a qualquer disciplina:
//   reta            — reta numérica (Matemática)
//   fracao          — barra ou círculo dividido em partes iguais (Matemática)
//   grade           — malha/disposição retangular (multiplicação, área)
//   tabela          — dados e classificações (todas as disciplinas)
//   barras          — gráfico de barras (Geografia, Ciências, Matemática)
//   linha_do_tempo  — eventos em ordem (História, Ciências)
//   fluxo           — etapas ligadas por setas, em linha ou em ciclo (ciclo da água,
//                     cadeia alimentar, processo de produção, etapas de um texto)
//   mapa            — mapa conceitual: ideia central + ramos (qualquer disciplina)

export const TIPOS_FIGURA = ["reta", "fracao", "grade", "tabela", "barras", "linha_do_tempo", "fluxo", "mapa"];

// Em Linguagens (Português, Inglês, Arte, Educação Física...) figura em exercício
// só quando ajuda de verdade; obrigar 2 gerava figura forçada (ex.: linha do tempo
// para modos verbais). Nas outras disciplinas, pelo menos 2 exercícios com figura.
export const figurasObrigatorias = (disciplina = "") =>
  !/portugu|ingl|espanhol|l[ií]ngua|arte|educa[cç][aã]o f[ií]sica|linguagens/i.test(disciplina);

const txt = (v, max = 60) => (typeof v === "string" || typeof v === "number" ? String(v).slice(0, max) : "");
const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const inteiro = (v, min, max, padrao) => {
  const n = num(v);
  return n == null ? padrao : Math.min(max, Math.max(min, Math.round(n)));
};

export function normalizarFigura(f) {
  if (!f || typeof f !== "object" || !TIPOS_FIGURA.includes(f.tipo)) return null;
  const legenda = txt(f.legenda, 160);
  switch (f.tipo) {
    case "reta": {
      const inicio = num(f.inicio) ?? 0;
      const fim = num(f.fim) ?? 1;
      if (!(fim > inicio)) return null;
      const divisoes = inteiro(f.divisoes, 1, 20, 4);
      const marcar = f.marcar == null || f.marcar === "" ? null : inteiro(f.marcar, 0, divisoes, null);
      const rotulos = ["nenhum", "extremos", "todos"].includes(f.rotulos) ? f.rotulos : "extremos";
      return { tipo: "reta", inicio, fim, divisoes, marcar, rotulos, legenda };
    }
    case "fracao": {
      const partes = inteiro(f.partes, 1, 16, 4);
      return { tipo: "fracao", forma: f.forma === "circulo" ? "circulo" : "barra", partes, pintadas: inteiro(f.pintadas, 0, partes, 1), legenda };
    }
    case "grade": {
      const linhas = inteiro(f.linhas, 1, 12, 3);
      const colunas = inteiro(f.colunas, 1, 12, 4);
      return { tipo: "grade", linhas, colunas, pintadas: inteiro(f.pintadas, 0, linhas * colunas, 0), legenda };
    }
    case "tabela": {
      const cabecalho = (Array.isArray(f.cabecalho) ? f.cabecalho : []).slice(0, 6).map((c) => txt(c, 40));
      const largura = Math.max(cabecalho.length, 1);
      const linhas = (Array.isArray(f.linhas) ? f.linhas : [])
        .filter(Array.isArray)
        .slice(0, 8)
        .map((l) => Array.from({ length: largura }, (_, i) => txt(l[i], 60)));
      if (!linhas.length) return null;
      return { tipo: "tabela", cabecalho, linhas, legenda };
    }
    case "barras": {
      const itens = (Array.isArray(f.itens) ? f.itens : [])
        .map((i) => ({ rotulo: txt(i?.rotulo, 24), valor: num(i?.valor) }))
        .filter((i) => i.rotulo && i.valor != null && i.valor >= 0)
        .slice(0, 8);
      if (!itens.length) return null;
      return { tipo: "barras", titulo: txt(f.titulo, 80), unidade: txt(f.unidade, 20), itens, legenda };
    }
    case "linha_do_tempo": {
      const eventos = (Array.isArray(f.eventos) ? f.eventos : [])
        .map((e) => ({ data: txt(e?.data, 20), texto: txt(e?.texto, 70) }))
        .filter((e) => e.data || e.texto)
        .slice(0, 6);
      if (!eventos.length) return null;
      return { tipo: "linha_do_tempo", eventos, legenda };
    }
    case "fluxo": {
      const etapas = (Array.isArray(f.etapas) ? f.etapas : []).map((e) => txt(e, 50)).filter(Boolean).slice(0, 6);
      if (etapas.length < 2) return null;
      return { tipo: "fluxo", etapas, ciclo: f.ciclo === true, legenda };
    }
    case "mapa": {
      const centro = txt(f.centro, 40);
      const ramos = (Array.isArray(f.ramos) ? f.ramos : []).map((r) => txt(r, 50)).filter(Boolean).slice(0, 6);
      if (!centro || ramos.length < 2) return null;
      return { tipo: "mapa", centro, ramos, legenda };
    }
    default:
      return null;
  }
}

// O enunciado depende de algo visual? ("observe a figura", "na reta numérica", "a tabela abaixo"…)
export const citaFigura = (enunciado = "") =>
  /\b(figura|imagem|desenho|reta num[eé]rica|na reta|tabela|gr[aá]fico|linha do tempo|malha|parte colorida|partes coloridas|pintad[ao]s?|esquema|mapa conceitual|fluxograma)\b/i.test(enunciado);

// Qual tipo de figura o enunciado cita? (para reaproveitar a figura do conteúdo)
const CITACOES = [
  [/linha do tempo/i, "linha_do_tempo"],
  [/reta num[eé]rica|\bna reta\b|\ba reta\b/i, "reta"],
  [/tabela/i, "tabela"],
  [/gr[aá]fico/i, "barras"],
  [/mapa conceitual/i, "mapa"],
  [/esquema|fluxograma|\bciclo\b/i, "fluxo"],
  [/malha|quadradinhos/i, "grade"],
  [/parte colorida|partes coloridas|pintad[ao]s?|barra dividida|c[ií]rculo dividido/i, "fracao"],
];
export const tipoCitado = (enunciado = "") => CITACOES.find(([re]) => re.test(enunciado))?.[1] || null;

// Exercício que cita "a linha do tempo", "a reta", "a tabela"... sem trazer figura:
// se a figura do conteúdo (ou da cena) é desse mesmo tipo, ela é a figura citada.
export function completarFigurasCitadas(m) {
  const fontes = [m.figuraExplicativa, m.cena?.figura].filter(Boolean);
  // "marque / localize 3/4 na reta" com o ponto já destacado entrega a resposta: tira o destaque
  const pedeMarcar = (t = "") => /\b(marque|localize|indique|assinale|posicione|represente)\b/i.test(t);
  const semResposta = (e) =>
    e.figura?.tipo === "reta" && e.figura.marcar != null && pedeMarcar(e.enunciado) ? { ...e, figura: { ...e.figura, marcar: null } } : e;
  if (!fontes.length) return { ...m, exercicios: (m.exercicios || []).map(semResposta) };
  const exercicios = (m.exercicios || []).map(semResposta).map((e) => {
    if (e.figura || !citaFigura(e.enunciado)) return e;
    const tipo = tipoCitado(e.enunciado);
    // cópia sem ponto destacado, para não entregar resposta
    const f = fontes.find((x) => x.tipo === tipo);
    return f ? { ...e, figura: f.tipo === "reta" ? { ...f, marcar: null } : f } : e;
  });
  return { ...m, exercicios };
}

// Rótulo do tracinho k da reta: frações quando é de 0 a 1, números nos outros casos
export function rotuloReta(fig, k) {
  const { inicio, fim, divisoes } = fig;
  if (inicio === 0 && fim === 1) return k === 0 ? "0" : k === divisoes ? "1" : `${k}/${divisoes}`;
  const v = inicio + ((fim - inicio) * k) / divisoes;
  return String(Number(v.toPrecision(10))).replace(".", ",");
}
