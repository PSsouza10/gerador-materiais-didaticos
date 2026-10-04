// Conferência automática do gabarito de múltipla escolha.
// A IA às vezes calcula certo e marca a letra errada (ex.: "b) 625. Pois 5^2 × 5^3
// = 5^5 = 3125" — a correta é d) 3125). Aqui o resultado final da resolução é
// comparado com os valores das alternativas: se ele bate com UMA alternativa
// diferente da marcada, a letra é corrigida e o professor é avisado; se não bate
// com nenhuma, só avisa para conferir. Nunca inventa resposta.

import { extrairExpressao } from "./avaliar.js";

const SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+" };

// "3 125" / "3.125" / "3125" / "1,67 × 10^-26" / "5,2 × 10⁻⁴" / "-12" / "0,5" → número
export function valorNumerico(bruto) {
  if (bruto == null) return null;
  let s = String(bruto)
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, (m) => "^" + [...m].map((c) => SUP[c]).join(""))
    .replace(/−/g, "-")
    .trim();
  // notação científica: a × 10^b
  const cient = /(-?\d+(?:[.,]\d+)?)\s*[×x*·]\s*10\s*\^\s*\(?\s*([+-]?\d+)\s*\)?/i.exec(s);
  if (cient) {
    const a = numeroSimples(cient[1]);
    return a == null ? null : a * Math.pow(10, parseInt(cient[2], 10));
  }
  // potência simples: 5^5, 2^(6), 10^-3 (com unidade opcional depois)
  const pot = /^\s*(-?\d+(?:[.,]\d+)?)\s*\^\s*\(?\s*([+-]?\d+)\s*\)?(?:\s*[a-zA-Zµ²³]*)?\s*[.;]?\s*$/.exec(s);
  if (pot) {
    const base = numeroSimples(pot[1]);
    const v = base == null ? null : Math.pow(base, parseInt(pot[2], 10));
    return Number.isFinite(v) ? v : null;
  }
  // fração simples: 1/4, 3 / 10 (com unidade opcional depois)
  const fr = /^\s*(-?\d+)\s*\/\s*(\d+)(?![\d,.])/.exec(s);
  if (fr) return Number(fr[2]) === 0 ? null : Number(fr[1]) / Number(fr[2]);
  if (/\^/.test(s)) return null; // expressão com potência não resolvida: não arrisca
  const m = /-?\d[\d.\s]*(?:,\d+)?|-?\d+(?:\.\d+)?/.exec(s);
  return m ? numeroSimples(m[0]) : null;
}

function numeroSimples(t) {
  let s = String(t).replace(/\s/g, "");
  if (/,\d+$/.test(s)) s = s.replace(/\./g, "").replace(",", "."); // 1.234,5
  else if (/^\-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); // 3.125 (milhar)
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

const iguais = (a, b) => a != null && b != null && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

// letra marcada no início da resposta: "b) 625..." / "Alternativa c" / "(d)"
export function letraMarcada(resposta = "") {
  const m = /^\s*(?:alternativa\s+)?\(?([a-e])\)/i.exec(resposta) || /alternativa\s+\(?([a-e])\b/i.exec(resposta);
  return m ? m[1].toLowerCase() : null;
}

// valor depois do ÚLTIMO "=" da resolução (o resultado final do cálculo)
export function resultadoFinal(texto = "") {
  const partes = String(texto).split("=");
  if (partes.length < 2) return null;
  const fim = partes[partes.length - 1].split(/[.;!?](?:\s|$)|,\s(?!\d)|\s(?:pois|logo|portanto)\b/i)[0];
  return valorNumerico(fim);
}

const semLetra = (alt) => String(alt).replace(/^\s*\(?[a-e]\)\s*/i, "").trim();

const fmt = (v) => (Math.abs(v) >= 1e6 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential().replace("e", " × 10^") : String(v).replace(".", ","));
const aviso = (numero, trecho, motivo, tipo) => ({ onde: `Gabarito do exercício ${numero}`, trecho, motivo, tipo });
const trocarLetra = (resposta, certa) => {
  const justificativa = String(resposta).replace(/^\s*(?:alternativa\s+)?\(?[a-e]\)\s*[^.;]*[.;]?\s*/i, "");
  return `${certa.letra}) ${certa.texto}. ${justificativa}`.trim();
};

// Devolve { exercicio (talvez corrigido), aviso (o primeiro) | null, avisos[] }
// tipo "corrigido": ajustado automaticamente; tipo "conferir": o professor precisa olhar.
export function conferirExercicio(ex, numero) {
  const avisos = [];
  const fim = (exercicio) => ({ exercicio, aviso: avisos[0] || null, avisos });
  if (!ex.resposta) return fim(ex);
  // 1) cálculo explícito no enunciado ("Calcule 3^4", "(2^3)^2", "10^5 × 10^-3")
  const calc = extrairExpressao(ex.enunciado);
  const explicacao = resultadoFinal(ex.resolucao) ?? resultadoFinal(ex.resposta);

  const alts = (ex.alternativas || []).map((a, i) => ({
    letra: (/^\s*\(?([a-e])\)/i.exec(a)?.[1] || "abcde"[i]).toLowerCase(),
    texto: semLetra(a),
    valor: valorNumerico(semLetra(a)),
  }));

  // questão aberta: compara a resposta com o cálculo do enunciado
  if (alts.length < 2) {
    if (calc) {
      const dada = valorNumerico(String(ex.resposta).split(/\.\s|,\s(?!\d)|;|\bpois\b/i)[0]); // "8. 5 + 3 = 8" → "8"
      // a resolução chega ao valor do cálculo e depois converte a unidade ("10^3 g = 1000 g = 1 kg"): está certa
      const passos = [...String(`${ex.resolucao || ""} ${ex.resposta}`).matchAll(/=\s*([^=]+?)(?=\s*=|[.;]\s|$)/g)].map((x) => valorNumerico(x[1]));
      const resolucaoConfere = passos.some((v) => iguais(v, calc.valor));
      if (dada != null && !iguais(dada, calc.valor) && !resolucaoConfere)
        avisos.push(aviso(numero, ex.resposta, `a resposta não confere com o cálculo: ${calc.expressao} = ${fmt(calc.valor)} — confira antes de usar.`, "conferir"));
    }
    return fim(ex);
  }
  // só confere alternativas puramente numéricas (com unidade no máximo)
  if (alts.some((a) => a.valor == null || /[a-zà-ú]{4,}/i.test(a.texto.replace(/\b(?:cm|dm|km|mm|m|l|ml|kg|g|anos?-luz)\b/gi, "")))) return fim(ex);

  const marcada = letraMarcada(ex.resposta);
  const referencia = calc ? calc.valor : explicacao;
  if (referencia == null) return fim(ex);
  const batem = alts.filter((a) => iguais(a.valor, referencia));
  const certa = batem.length === 1 ? batem[0] : null;
  const origem = calc ? `o cálculo de ${calc.expressao} dá ${fmt(calc.valor)}` : "a própria resolução chega a esse valor";

  let exercicio = ex;
  if (certa && marcada && certa.letra !== marcada) {
    exercicio = { ...ex, resposta: trocarLetra(ex.resposta, certa) };
    avisos.push(aviso(numero, ex.resposta, `corrigido automaticamente para ${certa.letra}) ${certa.texto}: ${origem} (a IA tinha marcado ${marcada}).`, "corrigido"));
  } else if (batem.length === 0) {
    avisos.push(
      aviso(numero, ex.resposta, calc
        ? `nenhuma alternativa corresponde a ${calc.expressao} = ${fmt(calc.valor)} — confira a questão antes de usar.`
        : "o resultado da resolução não coincide com nenhuma alternativa — confira a questão antes de usar.", "conferir")
    );
  }
  // 2) a explicação precisa chegar ao mesmo resultado do cálculo
  if (calc && explicacao != null && !iguais(explicacao, calc.valor))
    avisos.push(aviso(numero, ex.resolucao || ex.resposta, `a explicação chega a ${fmt(explicacao)}, mas ${calc.expressao} = ${fmt(calc.valor)} — revise a explicação.`, "conferir"));
  return fim(exercicio);
}

// Notação científica: convenção única N × 10ⁿ, com 1 ≤ N < 10 e n inteiro.
// Ajusta fórmulas como "N = a × 10^n" ou "a × 10^n" para "N × 10^n".
export function conferirNotacao(material) {
  const avisos = [];
  const formulas = (material.formulas || []).map((f) => {
    const ctx = `${f.nome} ${f.descricao} ${f.expressao}`;
    if (!/nota[cç][aã]o\s+cient[ií]fica/i.test(ctx)) return f;
    let e = String(f.expressao || "");
    const original = e;
    e = e.replace(/^\s*N\s*=\s*(?=[a-zA-Z]\s*[×x*·]\s*10)/, "");
    e = e.replace(/(^|[^\w])(?!N\b)([a-zA-Z])(\s*[×x*·]\s*10\s*(?:\^|[⁰¹²³⁴⁵⁶⁷⁸⁹⁻ⁿ]))/g, "$1N$3");
    if (e === original) return f;
    avisos.push({ onde: `Fórmula "${f.nome || "notação científica"}"`, trecho: original, motivo: "ajustada para a convenção N × 10ⁿ (1 ≤ N < 10, n inteiro), a mesma do resto do material.", tipo: "corrigido" });
    return { ...f, expressao: e, descricao: /1\s*≤\s*N/.test(f.descricao || "") ? f.descricao : `${(f.descricao || "").replace(/[.\s]+$/, "")}${f.descricao ? "; " : ""}com 1 ≤ N < 10 e n inteiro.` };
  });
  return { material: { ...material, formulas }, avisos };
}

export function conferirGabarito(material) {
  const n = conferirNotacao(material);
  const avisos = [...n.avisos];
  const exercicios = (n.material.exercicios || []).map((ex, i) => {
    const r = conferirExercicio(ex, i + 1);
    avisos.push(...r.avisos);
    return r.exercicio;
  });
  return { material: { ...n.material, exercicios }, avisos };
}
