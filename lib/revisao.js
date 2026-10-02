// Revisão determinística do material depois da IA (plano "enxugar o PDF", P2/P5/P7):
//  - corrige erros de digitação já vistos em produção (lista de regressão);
//  - remove blocos repetidos em campos secundários (exemplo que repete fórmula etc.);
//  - aponta conceitos definidos que não aparecem em nenhum outro lugar do material.
// Não chama a IA de novo: tudo aqui é regra fixa e testável.

// Comparação: minúsculas, sem acento, sem pontuação, espaços colapsados
export function normalizar(t = "") {
  return String(t)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}²³]+/gu, " ")
    .trim();
}
// Versão sem espaços: pega "IMC = peso (kg) / altura (m)²" × "IMC=peso(kg)/altura(m)²"
const chave = (t) => normalizar(t).replace(/\s+/g, "");

// Erros já observados em materiais gerados → correção
export const TYPOS_CONHECIDOS = {
  exempplos: "exemplos",
  exempplo: "exemplo",
  "expíques": "explique",
  expiques: "explique",
  "aplicaçoes": "aplicações",
};

function corrigirTexto(t, achados) {
  if (typeof t !== "string" || !t) return t;
  return t.replace(/[\p{L}]+/gu, (palavra) => {
    const certo = TYPOS_CONHECIDOS[palavra.toLowerCase()];
    if (!certo) return palavra;
    achados.push({ de: palavra, para: certo });
    // mantém a caixa: TUDO MAIÚSCULO, Inicial maiúscula ou minúsculo
    if (palavra === palavra.toUpperCase()) return certo.toUpperCase();
    if (palavra[0] === palavra[0].toUpperCase()) return certo[0].toUpperCase() + certo.slice(1);
    return certo;
  });
}

// Percorre o objeto inteiro corrigindo strings (exceto figuras, que são dados de desenho)
function corrigirProfundo(v, achados) {
  if (typeof v === "string") return corrigirTexto(v, achados);
  if (Array.isArray(v)) return v.map((x) => corrigirProfundo(x, achados));
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, x] of Object.entries(v)) out[k] = k === "figura" || k === "figuraExplicativa" ? x : corrigirProfundo(x, achados);
    return out;
  }
  return v;
}

// Blocos "principais" (ficam) na ordem em que aparecem na folha
function blocosPrincipais(m) {
  return [
    ["Resumo", m.resumoPedagogico],
    ...(m.conceitos || []).map((c, i) => [`Conceito ${i + 1}`, `${c.termo}: ${c.definicao}`]),
    ...(m.conceitos || []).map((c, i) => [`Conceito ${i + 1}`, c.definicao]),
    ...(m.formulas || []).map((f, i) => [`Fórmula ${i + 1}`, f.expressao]),
    ...(m.formulas || []).map((f, i) => [`Fórmula ${i + 1}`, f.descricao]),
  ];
}

const MIN_CHAVE = 8; // frases muito curtas ("V = a³") podem repetir sem problema

export function revisarMaterial(material = {}) {
  const typos = [];
  const m = corrigirProfundo(material, typos);
  const avisos = [];

  // P5 — typos corrigidos (avisa uma vez por palavra)
  const vistosTypo = new Set();
  for (const t of typos) {
    const k = `${t.de}>${t.para}`;
    if (vistosTypo.has(k)) continue;
    vistosTypo.add(k);
    avisos.push({ onde: "Revisão", trecho: t.de, motivo: `erro de digitação corrigido automaticamente para "${t.para}".`, tipo: "corrigido" });
  }

  // P2 — duplicados: o que já apareceu num bloco principal sai dos secundários
  const vistos = new Map();
  for (const [onde, t] of blocosPrincipais(m)) {
    const k = chave(t);
    if (k.length >= MIN_CHAVE && !vistos.has(k)) vistos.set(k, onde);
  }
  const repetido = (t) => {
    const k = chave(t);
    return k.length >= MIN_CHAVE && vistos.has(k) ? vistos.get(k) : null;
  };
  const marcar = (t, onde) => {
    const k = chave(t);
    if (k.length >= MIN_CHAVE && !vistos.has(k)) vistos.set(k, onde);
  };
  const removido = (onde, t, origem) =>
    avisos.push({ onde, trecho: t, motivo: `repetia o que já está em "${origem}" e foi retirado.`, tipo: "corrigido" });

  const filtrar = (lista = [], rotulo) =>
    lista.filter((t, i) => {
      const origem = repetido(t);
      if (origem) {
        removido(`${rotulo} ${i + 1}`, t, origem);
        return false;
      }
      marcar(t, `${rotulo} ${i + 1}`);
      return true;
    });

  m.dicas = filtrar(m.dicas, "Dica");
  if (m.lembreteImportante) {
    const origem = repetido(m.lembreteImportante);
    if (origem) {
      removido("Lembrete", m.lembreteImportante, origem);
      m.lembreteImportante = "";
    } else marcar(m.lembreteImportante, "Lembrete");
  }
  if (m.aplicacaoPratica) {
    m.aplicacaoPratica = { ...m.aplicacaoPratica, exemplos: filtrar(m.aplicacaoPratica.exemplos, "Exemplo") };
  }

  // P7 — conceito órfão: termo que não aparece em nenhum outro bloco
  const resto = normalizar(
    [
      m.tituloDidatico,
      m.resumoPedagogico,
      ...(m.formulas || []).flatMap((f) => [f.nome, f.expressao, f.descricao]),
      ...(m.dicas || []),
      m.lembreteImportante,
      m.aplicacaoPratica?.titulo,
      m.aplicacaoPratica?.situacao,
      ...(m.aplicacaoPratica?.exemplos || []),
      ...(m.cena?.falas || []).map((f) => f.texto),
      m.cena?.pergunta,
      ...(m.exercicios || []).map((e) => e.fala?.texto),
      ...(m.exercicios || []).flatMap((e) => [e.enunciado, ...(e.alternativas || []), e.resposta]),
    ]
      .filter(Boolean)
      .join(" ")
  );
  for (const c of m.conceitos || []) {
    const termo = normalizar(c.termo);
    if (!termo || termo === "—") continue;
    // aceita o radical (ex.: "anabolismo" × "anabólico") com 6+ letras
    const raiz = termo.length > 7 ? termo.slice(0, Math.max(6, termo.length - 3)) : termo;
    if (!resto.includes(raiz))
      avisos.push({
        onde: "Conceitos",
        trecho: c.termo,
        motivo: "o conceito é definido mas não aparece em nenhum exercício, fórmula ou exemplo. Confira se ele é necessário.",
        tipo: "conferir",
      });
  }

  return { material: m, avisos };
}
