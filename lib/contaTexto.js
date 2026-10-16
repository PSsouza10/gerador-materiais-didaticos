// Contas escritas em texto ("V = 10 × 5 = 50 m²; 50 + 7,5 = 57,5 m². Portanto, ...")
// refeitas pelo próprio sistema, sem confiar no resultado que a IA escreveu.
// Usado na Avaliação para conferir a resolução e cada explicação de alternativa errada.

import { evaluate } from "./avaliar.js";

// unidade com expoente (m², cm³) não é potência: vira só a unidade
const semExpoenteDeUnidade = (t) => String(t).replace(/([a-zA-Z])\s*[²³]/g, "$1");
// "6 000" → "6000" (milhar com espaço)
const juntarMilhar = (t) => String(t).replace(/(\d)\s(?=\d{3}(?!\d))/g, "$1");

// Trecho aritmético no fim (antes do "=") ou no começo (depois do "=") de um pedaço de texto
const ARIT = "[\\d\\s.,+\\-−–×*·÷/()^⁰¹²³⁴⁵⁶⁷⁸⁹⁻]";
const reFim = new RegExp(`(${ARIT}*\\d${ARIT}*)$`);
const reInicio = new RegExp(`^(${ARIT}*\\d${ARIT}*)`);
const limpar = (s) => s.replace(/^[\s+×*·÷/)]+/, "").replace(/[\s+\-−–×*·÷/(]+$/, "").trim();

// "x" entre números é multiplicação (2 x 3); fora disso é letra
const xVezes = (t) => t.replace(/(\d)\s*[xX]\s*(?=[\d(])/g, "$1 × ");

function valor(trecho) {
  const s = limpar(trecho);
  if (!s || !/\d/.test(s)) return null;
  // vírgula de lista ("5, 7 e 9") não é decimal: só aceita vírgula entre dígitos sem espaço
  if (/,\s/.test(s)) return null;
  try {
    return { expr: s, v: evaluate(s), conta: /[+\-−–×*·÷/^]|\d\s*\(/.test(s.replace(/^[-−–]/, "")) };
  } catch {
    return null;
  }
}

const iguais = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));

// Divide em orações (";" e ". "), cada uma com uma cadeia "a = b = c"
function oracoes(texto) {
  return juntarMilhar(xVezes(semExpoenteDeUnidade(texto)))
    .split(/;|\.\s+|\.$|\n|\s(?=portanto\b)/i)
    .map((o) => o.trim())
    .filter(Boolean);
}

// Contas do texto: cada "expressão = resultado escrito", com o valor calculado pelo sistema.
// final = valor calculado da ÚLTIMA conta (é o resultado de verdade da resolução).
export function contasDoTexto(texto = "") {
  const contas = [];
  for (const o of oracoes(texto)) {
    if (/^portanto\b/i.test(o) || !o.includes("=")) continue;
    const partes = o.split("=");
    for (let k = 0; k < partes.length - 1; k++) {
      const esq = valor((reFim.exec(partes[k].trim()) || [])[1] || "");
      const dir = valor((reInicio.exec(partes[k + 1].trim()) || [])[1] || "");
      if (!esq || !esq.conta) continue; // "3 m³ = 3000 L" é conversão, não conta
      contas.push({ expressao: esq.expr, calculado: esq.v, escrito: dir ? dir.v : null, certo: dir ? iguais(esq.v, dir.v) : null });
    }
  }
  const ultima = contas[contas.length - 1];
  return { contas, erradas: contas.filter((c) => c.certo === false), final: ultima ? ultima.calculado : null };
}

// Números usados como dados (operandos) nas contas, exceto os que são resultado de uma conta anterior
export function operandos(texto = "") {
  const { contas } = contasDoTexto(texto);
  const resultados = contas.flatMap((c) => [c.calculado, c.escrito]).filter((v) => v != null);
  const usados = contas.flatMap((c) => [...c.expressao.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => parseFloat(m[0].replace(",", "."))));
  return usados.filter((v) => !resultados.some((r) => iguais(r, v)));
}

export { iguais };
