// Conferência de qualidade da apostila depois da IA (melhorias sugeridas no Atoms).
// Só AVISA o professor: não altera o material. Tudo aqui é regra fixa e testável.
//  - texto longo demais (conceito, dica, resumo, enunciado);
//  - frase de enfeite ("vamos mergulhar", "fascinante mundo"...);
//  - alternativas repetidas numa mesma questão;
//  - múltipla escolha com gabarito sem a letra;
//  - pouca variedade de tipos de questão / nenhuma questão exigente;
//  - regra apresentada como se valesse sempre (ex.: frações e denominadores).

import { normalizar } from "./revisao.js";
import { letraMarcada } from "./gabarito.js";
import { EXIGENCIAS_ALTAS } from "./material.js";

// limites em caracteres
export const LIMITES_TEXTO = {
  resumo: 420,
  definicao: 170,
  dica: 130,
  lembrete: 260,
  enunciado: 380,
};

// expressões de enfeite (comparadas sem acento e em minúsculas)
export const FRASES_ENFEITE = [
  "vamos mergulhar",
  "vamos embarcar",
  "embarque nessa",
  "embarque nesta",
  "jornada fascinante",
  "fascinante mundo",
  "mundo fascinante",
  "mundo incrivel",
  "incrivel mundo",
  "universo fascinante",
  "prepare se para",
  "e muito importante destacar",
  "vale ressaltar que",
  "nao e mesmo",
  "de forma ludica e divertida",
  "aventura do conhecimento",
];

const curto = (t = "", n = 60) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);
const aviso = (onde, trecho, motivo) => ({ onde, trecho: curto(trecho), motivo, tipo: "conferir" });

function textosDoMaterial(m) {
  return [
    ["Resumo", m.resumoPedagogico],
    ...(m.conceitos || []).map((c, i) => [`Conceito ${i + 1}`, c.definicao]),
    ...(m.formulas || []).map((f, i) => [`Fórmula ${i + 1}`, [f.nome, f.expressao, f.descricao].filter(Boolean).join(" — ")]),
    ...(m.dicas || []).map((d, i) => [`Dica ${i + 1}`, d]),
    ["Lembrete", m.lembreteImportante],
    ["Aplicação prática", m.aplicacaoPratica?.situacao],
    ...(m.aplicacaoPratica?.exemplos || []).map((e, i) => [`Exemplo ${i + 1}`, e]),
    ...(m.exercicios || []).map((e, i) => [`Exercício ${i + 1}`, e.enunciado]),
  ].filter(([, t]) => typeof t === "string" && t.trim());
}

// Regras que só valem com uma condição: [padrão da regra, condição exigida, explicação]
const REGRAS_CONDICIONAIS = [
  [
    /quanto maior (?:for )?o denominador[^.;]*menor (?:sera |e )?a fracao/,
    /unitari|mesmo numerador|numeradores iguais|numerador igual|numerador 1|numerador for 1/,
    'só vale para frações unitárias ou com o mesmo numerador (ex.: 2/3 é maior que 1/2). Inclua essa condição.',
  ],
  [
    /quanto menor (?:for )?o denominador[^.;]*maior (?:sera |e )?a fracao/,
    /unitari|mesmo numerador|numeradores iguais|numerador igual|numerador 1|numerador for 1/,
    'só vale para frações unitárias ou com o mesmo numerador. Inclua essa condição.',
  ],
  [
    /quanto maior (?:for )?o numerador[^.;]*maior (?:sera |e )?a fracao/,
    /mesmo denominador|denominadores iguais|denominador igual/,
    "só vale quando as frações têm o mesmo denominador. Inclua essa condição.",
  ],
];

export function conferirQualidade(material = {}) {
  const m = material || {};
  const avisos = [];

  // 1) texto longo demais
  const limite = (onde) =>
    onde === "Resumo"
      ? LIMITES_TEXTO.resumo
      : onde.startsWith("Conceito")
      ? LIMITES_TEXTO.definicao
      : onde.startsWith("Dica")
      ? LIMITES_TEXTO.dica
      : onde === "Lembrete"
      ? LIMITES_TEXTO.lembrete
      : onde.startsWith("Exercício")
      ? LIMITES_TEXTO.enunciado
      : null;
  for (const [onde, t] of textosDoMaterial(m)) {
    const max = limite(onde);
    if (max && t.length > max)
      avisos.push(aviso(onde, t, `texto longo (${t.length} caracteres; o ideal é até ${max}). Deixe mais direto.`));
  }

  // 2) frase de enfeite
  for (const [onde, t] of [["Título", m.tituloDidatico], ...textosDoMaterial(m)]) {
    if (typeof t !== "string") continue;
    const n = normalizar(t);
    const achada = FRASES_ENFEITE.find((f) => n.includes(f));
    if (achada) avisos.push(aviso(onde, t, "tem frase de enfeite, que não ensina nada. Corte ou troque por informação."));
  }

  // 3) alternativas repetidas e 4) gabarito sem letra
  (m.exercicios || []).forEach((e, i) => {
    const alts = e.alternativas || [];
    if (!alts.length) return;
    const semLetra = (a) => normalizar(String(a).replace(/^\s*\(?[a-e]\)\s*/i, ""));
    const vistas = new Set();
    for (const a of alts) {
      const k = semLetra(a);
      if (!k) continue;
      if (vistas.has(k)) {
        avisos.push(aviso(`Exercício ${i + 1}`, a, "tem alternativas repetidas. Troque uma delas por outro distrator."));
        break;
      }
      vistas.add(k);
    }
    if (!letraMarcada(e.resposta || ""))
      avisos.push(aviso(`Exercício ${i + 1}`, e.resposta || "(sem resposta)", "é de múltipla escolha, mas o gabarito não indica a letra correta."));
  });

  // 5) variedade e exigência das questões
  const ex = m.exercicios || [];
  if (ex.length >= 4) {
    const tipos = new Set(ex.map((e) => e.tipo || (e.alternativas?.length ? "multipla_escolha" : "aberta")));
    if (tipos.size < 3)
      avisos.push(
        aviso("Exercícios", `${tipos.size} tipo(s) de questão`, "pouca variedade de questões. Misture múltipla escolha, completar, verdadeiro ou falso, associar e explicar.")
      );
    if (ex.some((e) => e.exigencia) && !ex.some((e) => EXIGENCIAS_ALTAS.includes(e.exigencia)))
      avisos.push(aviso("Exercícios", "nenhuma questão exigente", "falta ao menos uma questão que peça para analisar, avaliar ou criar."));
  }

  // 6) regra apresentada como se valesse sempre
  for (const [onde, t] of textosDoMaterial(m)) {
    const n = normalizar(t);
    for (const [regra, condicao, motivo] of REGRAS_CONDICIONAIS) {
      if (regra.test(n) && !condicao.test(n)) {
        avisos.push(aviso(onde, t, `a regra aparece como se valesse sempre, mas ${motivo}`));
        break;
      }
    }
  }

  return avisos;
}
