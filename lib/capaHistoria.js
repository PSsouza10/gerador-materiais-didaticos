// Capa "História que Ensina" (Premium): regras puras, sem React, testáveis em Node.
// Desenho em components/CapaHistoria.jsx.

const AZUL = "#161a4f";

// Identidade por disciplina: cor do título, fundo da ilustração e desenho central
export const TEMAS = {
  "Matemática": { cor: "#5b45d6", claro: "#ece8fc", ceu: "#f3f0ff", chao: "#d9d1fb", desenho: "matematica" },
  "Português": { cor: "#d4502a", claro: "#fde9e1", ceu: "#fff4ee", chao: "#f8d3c3", desenho: "portugues" },
  "Ciências": { cor: "#2f8a57", claro: "#e3f2e8", ceu: "#effaf2", chao: "#bfe3c9", desenho: "ciencias" },
  "História": { cor: "#a8641a", claro: "#fbefdc", ceu: "#fff7ea", chao: "#efd7b0", desenho: "historia" },
  "Geografia": { cor: "#1f7a8c", claro: "#def2f5", ceu: "#eefafc", chao: "#bfe2e8", desenho: "geografia" },
  "Arte": { cor: "#c2417a", claro: "#fbe4ef", ceu: "#fff1f7", chao: "#f4c8dc", desenho: "arte" },
  "Educação Física": { cor: "#d0671a", claro: "#fdebd9", ceu: "#fff6ec", chao: "#f6d2ad", desenho: "edfisica" },
  "Língua Inglesa": { cor: "#2b5fd9", claro: "#e2eafe", ceu: "#f1f5ff", chao: "#c9d7fb", desenho: "ingles" },
  "Informática": { cor: "#0f766e", claro: "#dcf3f0", ceu: "#effaf8", chao: "#b8e3dd", desenho: "informatica" },
  "Ensino Religioso": { cor: "#7c5cbf", claro: "#efe8fb", ceu: "#f8f4ff", chao: "#ddd0f5", desenho: "religioso" },
};
const PADRAO = { cor: "#5b45d6", claro: "#ece8fc", ceu: "#f5f3ff", chao: "#dcd6f7", desenho: "geral" };

export function temaDaDisciplina(disciplina = "") {
  return { ...(TEMAS[String(disciplina).trim()] || PADRAO), azul: AZUL };
}

const limpo = (t) => String(t ?? "").replace(/\s+/g, " ").trim();

// "5" → "5º ano"; "EM1" → "1ª série"; sem ano → a etapa (ex.: "Ensino Fundamental")
export function rotuloAno(form = {}) {
  const ano = limpo(form.ano);
  if (ano) return /^EM/i.test(ano) ? `${ano.slice(2)}ª série` : `${ano}º ano`;
  return limpo(form.nivel);
}

// Linha de cima: "CIÊNCIAS | 5º ANO" (só com o que foi informado)
export function linhaDisciplina(form = {}) {
  return [limpo(form.disciplina), rotuloAno(form)].filter(Boolean);
}

// Título exatamente como informado; a 1ª palavra ganha a cor da disciplina
export function partesTitulo(titulo = "") {
  const t = limpo(titulo);
  const i = t.indexOf(" ");
  return i < 0 ? { destaque: t, resto: "" } : { destaque: t.slice(0, i), resto: t.slice(i + 1) };
}

// Tamanho inicial da fonte do título (px); a capa ainda reduz até caber (mínimo abaixo)
export const TITULO_MIN = 30;
export function tamanhoInicialTitulo(titulo = "") {
  const t = limpo(titulo);
  const n = t.length;
  const maiorPalavra = Math.max(0, ...t.split(" ").map((p) => p.length));
  let px = n <= 14 ? 92 : n <= 24 ? 80 : n <= 40 ? 66 : n <= 60 ? 56 : n <= 90 ? 46 : 40;
  // palavra muito comprida (ex.: "Proporcionalidade") não pode passar da largura (666 px úteis)
  const porPalavra = Math.floor(666 / Math.max(1, maiorPalavra * 0.6));
  return Math.max(TITULO_MIN, Math.min(px, porPalavra));
}

// Escola, professor(a) e turma: só os informados, na ordem da capa
export function linhasIdentificacao(form = {}) {
  return [
    ["Escola", limpo(form.escola)],
    ["Professor(a)", limpo(form.professor)],
    ["Turma", limpo(form.turma)],
  ].filter(([, v]) => v);
}

// Selo "BNCC alinhada": só com habilidade conferida na base oficial
export function seloBncc(bncc) {
  return bncc?.verificada && bncc.codigo ? { codigo: String(bncc.codigo).toUpperCase() } : null;
}

// Descrição curta da capa: o resumo do material, inteiro (nunca cortado com "…").
// Se não couber, a capa a esconde (o texto completo está na página seguinte).
export function descricaoDaCapa(material = {}) {
  return limpo(material.subtitulo || material.resumoPedagogico);
}

// Fala do personagem na ilustração: a pergunta da situação do cotidiano
export function chamadaDaCena(material = {}) {
  return limpo(material.cena?.pergunta || material.cena?.titulo);
}
