// Conferência automática do gabarito de múltipla escolha.
// A IA às vezes calcula certo e marca a letra errada (ex.: "b) 625. Pois 5^2 × 5^3
// = 5^5 = 3125" — a correta é d) 3125). Aqui o resultado final da resolução é
// comparado com os valores das alternativas: se ele bate com UMA alternativa
// diferente da marcada, a letra é corrigida e o professor é avisado; se não bate
// com nenhuma, só avisa para conferir. Nunca inventa resposta.

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
  if (/\^/.test(s)) return null; // potência não resolvida: não arrisca
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

// Devolve { exercicio (talvez corrigido), aviso | null }
export function conferirExercicio(ex, numero) {
  const alts = (ex.alternativas || []).map((a, i) => ({
    letra: (/^\s*\(?([a-e])\)/i.exec(a)?.[1] || "abcde"[i]).toLowerCase(),
    texto: semLetra(a),
    valor: valorNumerico(semLetra(a)),
  }));
  if (alts.length < 2 || !ex.resposta) return { exercicio: ex, aviso: null };
  // só confere alternativas puramente numéricas (com unidade no máximo)
  if (alts.some((a) => a.valor == null || /[a-zà-ú]{4,}/i.test(a.texto.replace(/\b(?:cm|dm|km|mm|m|l|ml|kg|g|anos?-luz)\b/gi, "")))) {
    return { exercicio: ex, aviso: null };
  }
  const final = resultadoFinal(ex.resolucao) ?? resultadoFinal(ex.resposta);
  if (final == null) return { exercicio: ex, aviso: null };
  const marcada = letraMarcada(ex.resposta);
  const batem = alts.filter((a) => iguais(a.valor, final));
  const certa = batem.length === 1 ? batem[0] : null;

  if (certa && marcada && certa.letra !== marcada) {
    const justificativa = String(ex.resposta).replace(/^\s*(?:alternativa\s+)?\(?[a-e]\)\s*[^.;]*[.;]?\s*/i, "");
    return {
      exercicio: { ...ex, resposta: `${certa.letra}) ${certa.texto}. ${justificativa}`.trim() },
      aviso: {
        onde: `Gabarito do exercício ${numero}`,
        trecho: ex.resposta,
        motivo: `corrigido automaticamente para ${certa.letra}) ${certa.texto}: a própria resolução chega a esse valor (a IA tinha marcado ${marcada}).`,
      },
    };
  }
  if (!certa && batem.length === 0) {
    return {
      exercicio: ex,
      aviso: {
        onde: `Gabarito do exercício ${numero}`,
        trecho: ex.resposta,
        motivo: "o resultado da resolução não coincide com nenhuma alternativa — confira a questão antes de usar.",
      },
    };
  }
  return { exercicio: ex, aviso: null };
}

export function conferirGabarito(material) {
  const avisos = [];
  const exercicios = (material.exercicios || []).map((ex, i) => {
    const r = conferirExercicio(ex, i + 1);
    if (r.aviso) avisos.push(r.aviso);
    return r.exercicio;
  });
  return { material: { ...material, exercicios }, avisos };
}
