// Task 3.1 — Base de habilidades da BNCC (texto oficial).
// Fonte dos dados: bncc.dev (mantido pela Profy) — https://github.com/bncc-dev/bncc-dados — CC BY 4.0.
// Formato compacto de cada item: { c: código, d: componente, e: etapa (EF/EM), a: anos, t: texto oficial }

// Disciplinas do formulário → componente curricular na base
export const DISCIPLINA_PARA_COMPONENTE = {
  Matemática: ["Matemática", "Matemática e suas Tecnologias"],
  Informática: ["Computação"],
  Português: ["Língua Portuguesa", "Linguagens e suas Tecnologias"],
  Ciências: ["Ciências", "Ciências da Natureza e suas Tecnologias"],
  História: ["História", "Ciências Humanas e Sociais Aplicadas"],
  Geografia: ["Geografia", "Ciências Humanas e Sociais Aplicadas"],
  "Ensino Religioso": ["Ensino Religioso"],
  Arte: ["Arte", "Linguagens e suas Tecnologias"],
  "Educação Física": ["Educação Física", "Linguagens e suas Tecnologias"],
  "Língua Inglesa": ["Língua Inglesa", "Linguagens e suas Tecnologias"],
};

export function normalizarCodigo(codigo = "") {
  return String(codigo).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function indexar(habilidades) {
  const mapa = new Map();
  for (const h of habilidades) mapa.set(h.c, h);
  return mapa;
}

const semAcento = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Busca por prefixo de código (ex.: "EF08MA") ou por palavras do texto.
// Prioriza a disciplina e a etapa selecionadas no formulário.
export function buscarHabilidades(habilidades, consulta, { disciplina, nivel, limite = 30 } = {}) {
  const q = consulta.trim();
  if (!q) return [];
  const cod = normalizarCodigo(q);
  const comps = DISCIPLINA_PARA_COMPONENTE[disciplina] || [];
  const etapa = nivel === "Ensino Médio" ? "EM" : nivel === "Ensino Fundamental" ? "EF" : null;
  const palavras = semAcento(q).split(/\s+/).filter((p) => p.length > 2);
  const pareceCodigo = /^(EF|EM|EI)\d/i.test(q) || /^\w{2,}\d{2}/.test(cod);

  const res = [];
  for (const h of habilidades) {
    let pontos = 0;
    if (h.c.startsWith(cod) && cod.length >= 2) pontos = 100 - (h.c.length - cod.length);
    else if (!pareceCodigo && palavras.length) {
      const t = semAcento(h.t);
      if (palavras.every((p) => t.includes(p))) pontos = 40;
    }
    if (!pontos) continue;
    if (comps.includes(h.d)) pontos += 20;
    if (etapa && h.e === etapa) pontos += 10;
    res.push([pontos, h]);
  }
  res.sort((a, b) => b[0] - a[0] || a[1].c.localeCompare(b[1].c));
  return res.slice(0, limite).map((r) => r[1]);
}
