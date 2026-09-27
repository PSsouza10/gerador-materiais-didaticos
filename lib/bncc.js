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

// Anos/séries por etapa (valor = como aparece na base; EM não tem ano por habilidade)
export const ANOS_POR_NIVEL = {
  "Ensino Fundamental": ["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((a) => ({ valor: a, rotulo: `${a}º ano` })),
  "Ensino Médio": ["1", "2", "3"].map((a) => ({ valor: `EM${a}`, rotulo: `${a}ª série` })),
};

export const rotuloAno = (valor) =>
  !valor ? "" : valor.startsWith("EM") ? `${valor.slice(2)}ª série` : `${valor}º ano`;

export function normalizarCodigo(codigo = "") {
  return String(codigo).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Corrige digitações comuns: letra O no lugar de zero ("EFO7MA30") e
// zero do ano omitido ("EF7MA30" → "EF07MA30").
export function variantesCodigo(codigo = "") {
  const c = normalizarCodigo(codigo);
  if (!c) return [];
  const v = new Set([c]);
  const semO = c.replace(/^(E[FIM])O/, "$10").replace(/^(E[FIM]\d)O/, "$10");
  v.add(semO);
  for (const x of [...v]) {
    // só completa o ANO com zero, e só com o código inteiro (2 dígitos no item);
    // assim "EF07MA3" (ainda digitando) nunca vira outro código
    const m = /^(EF|EI)(\d)([A-Z]{2})(\d{2})$/.exec(x);
    if (m) v.add(`${m[1]}0${m[2]}${m[3]}${m[4]}`);
  }
  return [...v];
}

export function resolverCodigo(mapa, codigo) {
  for (const v of variantesCodigo(codigo)) {
    const h = mapa.get(v);
    if (h) return h;
  }
  return null;
}

export function indexar(habilidades) {
  const mapa = new Map();
  for (const h of habilidades) mapa.set(h.c, h);
  return mapa;
}

export const daDisciplina = (h, disciplina) => (DISCIPLINA_PARA_COMPONENTE[disciplina] || []).includes(h.d);

export function cobreAno(h, ano) {
  if (!ano || !h.a) return null; // sem informação para comparar
  if (ano.startsWith("EM")) return h.e === "EM";
  return h.a.split(/\s*,\s*/).includes(ano);
}

const semAcento = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Busca por prefixo de código (ex.: "EF08MA", também "EF8MA") ou por palavras do texto.
// Resultados da disciplina selecionada vêm primeiro (e com ano/etapa compatíveis);
// de outras disciplinas, no máximo `limiteOutras`, marcadas para a interface separar.
export function buscarHabilidades(habilidades, consulta, { disciplina, nivel, ano, limite = 30, limiteOutras = 5 } = {}) {
  const q = consulta.trim();
  if (!q) return [];
  const prefixos = variantesCodigo(q);
  const etapa = nivel === "Ensino Médio" ? "EM" : nivel === "Ensino Fundamental" ? "EF" : null;
  const palavras = semAcento(q).split(/\s+/).filter((p) => p.length > 2);
  const pareceCodigo = /^(EF|EM|EI)[\dO]/i.test(q.trim());

  const res = [];
  for (const h of habilidades) {
    let pontos = 0;
    const pref = prefixos.find((p) => p.length >= 2 && h.c.startsWith(p));
    if (pref) pontos = 100 - (h.c.length - pref.length);
    else if (!pareceCodigo && palavras.length) {
      const t = semAcento(h.t);
      if (palavras.every((p) => t.includes(p))) pontos = 40;
    }
    if (!pontos) continue;
    const mesma = daDisciplina(h, disciplina);
    if (mesma) pontos += 30;
    if (etapa && h.e === etapa) pontos += 10;
    if (cobreAno(h, ano)) pontos += 15;
    res.push([pontos, h, mesma]);
  }
  res.sort((a, b) => b[0] - a[0] || a[1].c.localeCompare(b[1].c));
  const mesmas = res.filter((r) => r[2]).map((r) => r[1]);
  const outras = res.filter((r) => !r[2]).map((r) => r[1]);
  // Busca por código explícito: mostra o que casar; por palavra-chave: limita outras áreas
  return [...mesmas, ...outras.slice(0, pareceCodigo || !mesmas.length ? limite : limiteOutras)].slice(0, limite);
}
