// Avaliador matemático seguro (sem eval) para conferir exercícios.
// Aceita: números com vírgula ou ponto decimal, 1.234 (milhar), notação e (5.972e24),
// + − - × x* · ÷ /, potência ^ (associativa à direita), sobrescritos (10⁻³),
// parênteses, menos unário e multiplicação implícita entre ")(" ou "2(".
// O resultado é arredondado a 15 algarismos significativos, para que 5.972e24/10
// dê exatamente 5.972e23 (ponto flutuante daria 5.9720000000000005e23).

const SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+", "⁽": "(", "⁾": ")" };

function normalizar(expr) {
  return String(expr)
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺⁽⁾]+/g, (m) => "^(" + [...m].map((c) => SUP[c]).join("") + ")")
    .replace(/[−–]/g, "-")
    .replace(/[×·*]/g, "*")
    .replace(/÷/g, "/")
    .replace(/(\d)\s+(?=\d{3}(?!\d))/g, "$1"); // "60 000" → "60000"
}

function tokenizar(s) {
  const tokens = [];
  const re = /\s*(?:(\d+(?:[.,]\d+)*(?:[eE][+-]?\d+)?)|([-+*/^()]))/y;
  let pos = 0;
  while (pos < s.length) {
    if (/\s/.test(s[pos])) {
      pos++;
      continue;
    }
    re.lastIndex = pos;
    const m = re.exec(s);
    if (!m) throw new Error(`símbolo inesperado: ${s[pos]}`);
    if (m[1] !== undefined) tokens.push({ t: "num", v: lerNumero(m[1]) });
    else tokens.push({ t: m[2] });
    pos = re.lastIndex;
  }
  return tokens;
}

function lerNumero(txt) {
  let s = txt;
  const [mant, exp] = s.split(/[eE]/);
  let m = mant;
  if (/,/.test(m)) m = m.replace(/\./g, "").replace(",", "."); // 1.234,5 / 0,00056
  else if (exp === undefined && /^\d{1,3}(\.\d{3})+$/.test(m)) m = m.replace(/\./g, ""); // 1.000 (milhar); com "e" é decimal
  const v = parseFloat(m) * (exp !== undefined ? Math.pow(10, parseInt(exp, 10)) : 1);
  if (!Number.isFinite(v)) throw new Error("número inválido");
  return v;
}

export function evaluate(expr) {
  const tokens = tokenizar(normalizar(expr));
  let i = 0;
  const olhar = () => tokens[i];
  const comer = (t) => {
    if (!tokens[i] || tokens[i].t !== t) throw new Error(`esperava ${t}`);
    i++;
  };
  // soma := produto (('+'|'-') produto)*
  function soma() {
    let v = produto();
    while (olhar() && (olhar().t === "+" || olhar().t === "-")) {
      const op = tokens[i++].t;
      const d = produto();
      v = op === "+" ? v + d : v - d;
    }
    return v;
  }
  // produto := unario (('*'|'/'|implícito) unario)*
  function produto() {
    let v = unario();
    for (;;) {
      const o = olhar();
      if (o && (o.t === "*" || o.t === "/")) {
        i++;
        const d = unario();
        if (o.t === "/" && d === 0) throw new Error("divisão por zero");
        v = o.t === "*" ? v * d : v / d;
      } else if (o && (o.t === "(" || o.t === "num") && tokens[i - 1] && (tokens[i - 1].t === ")" || tokens[i - 1].t === "num")) {
        v = v * unario(); // 2(3+1), (5^2)(5^3)
      } else return v;
    }
  }
  // unario := ('-'|'+') unario | potencia   → -2^2 = -4
  function unario() {
    const o = olhar();
    if (o && (o.t === "-" || o.t === "+")) {
      i++;
      const v = unario();
      return o.t === "-" ? -v : v;
    }
    return potencia();
  }
  // potencia := primario ('^' unario)?   (à direita: 2^3^2 = 2^9)
  function potencia() {
    const b = primario();
    if (olhar() && olhar().t === "^") {
      i++;
      return Math.pow(b, unario());
    }
    return b;
  }
  function primario() {
    const o = olhar();
    if (!o) throw new Error("expressão incompleta");
    if (o.t === "num") {
      i++;
      return o.v;
    }
    if (o.t === "(") {
      i++;
      const v = soma();
      comer(")");
      return v;
    }
    throw new Error(`símbolo inesperado: ${o.t}`);
  }
  const v = soma();
  if (i !== tokens.length) throw new Error("sobrou texto na expressão");
  if (!Number.isFinite(v)) throw new Error("resultado não finito");
  return Number(v.toPrecision(15));
}

export function tentarAvaliar(expr) {
  try {
    return evaluate(expr);
  } catch {
    return null;
  }
}

// Acha no enunciado UMA expressão de cálculo explícita ("Calcule 3^4",
// "Qual o resultado de (2^3)^2?", "10^5 × 10^-3"). Se houver mais de um trecho
// numérico (problema contextualizado: "1/10 de 5,972 × 10²⁴", "10 prótons"),
// devolve null — nesses casos a conferência usa a própria resolução.
const TRECHO = /[\d(⁽][\d\s.,()^+\-−×*·÷/⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺⁽⁾eE]*[\d)⁾⁰¹²³⁴⁵⁶⁷⁸⁹]|\d/g;
export function extrairExpressao(enunciado = "") {
  const trechos = (String(enunciado).match(TRECHO) || [])
    .map((t) => t.trim())
    .filter((t) => /\d/.test(t))
    // "e"/"E" soltos de palavras não entram: só valem colados a dígitos (5.972e24)
    .filter((t) => !/[eE](?![+-]?\d)/.test(t));
  if (trechos.length !== 1) return null;
  const expr = trechos[0];
  if (!/[\^*×·÷/+\-−⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(expr.replace(/^-/, ""))) return null; // sem operação: nada a calcular
  // fração sozinha (1/4, 3/10) é um número, não uma conta: "1/4 de hora", "localize 1/4 na reta"
  if (/^\s*\d+\s*\/\s*\d+\s*$/.test(expr)) return null;
  const v = tentarAvaliar(expr);
  return v == null ? null : { expressao: expr, valor: v };
}
