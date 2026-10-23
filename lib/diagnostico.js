// Avaliação DIAGNÓSTICA (tema amplo, sem habilidade escolhida): o sistema monta antes a
// distribuição — uma habilidade diferente por questão, espalhada pelas unidades temáticas
// (e só pelas que o professor pediu, quando ele cita algumas) — e confere depois:
// habilidade fora da distribuição ou repetida → a questão é refeita com uma das que faltam.
// Também (em qualquer prova): questões com a mesma situação e texto-base que repete a pergunta.
import { normalizar } from "./revisao.js";

export const UNIDADES = ["numeros", "algebra", "geometria", "grandezas", "estatistica"];
export const NOME_UNIDADE = {
  numeros: "Números",
  algebra: "Álgebra",
  geometria: "Geometria",
  grandezas: "Grandezas e medidas",
  estatistica: "Probabilidade e estatística",
  geral: "Geral",
};

// Unidade temática de uma habilidade de Matemática, pelo texto oficial
export function unidadeDaHabilidade(h = {}) {
  if (!/matem/i.test(h.d || "")) return "geral";
  const t = normalizar(h.t || "");
  if (/probabilidade|estatistic|pesquisa|grafico|tabela|\bmedia\b|amostra|frequencia|aleatori|espaco amostral/.test(t)) return "estatistica";
  if (/\barea|perimetro|volume|capacidade|\bmassa|comprimento|unidades? de medida|medidas? de tempo|temperatura|grandezas? (?:como|comprimento|massa)/.test(t)) return "grandezas";
  if (/poligono|triangulo|quadrilater|angulo|circunferencia|circulo|simetri|plano cartesiano|translac|rotac|reflex|figuras? (?:geometric|plana)|solido|prisma|piramide|vertice|ponto medio|retas? paralel|mediatriz|bissetriz/.test(t)) return "geometria";
  if (/equac|inequac|expressao algebric|expressoes algebric|variavel|incognita|sequencia|proporcional|regra de tres|grandezas diretamente|inversamente|funcao|algebric/.test(t)) return "algebra";
  return "numeros";
}

// Unidades citadas no tema/orientações ("diagnóstico de geometria e frações")
export function unidadesPedidas(texto = "") {
  const t = normalizar(texto);
  const out = [];
  if (/numer|frac|decima|porcent|operac|inteir|racion|potenc|raiz|multiplo|divisor/.test(t)) out.push("numeros");
  if (/algebr|equac|express|propor|sequenc|regra de tres|variavel/.test(t)) out.push("algebra");
  if (/geometr|figura|poligon|angul|triangul|circunf|simetr|plano cartesiano|quadrilater/.test(t)) out.push("geometria");
  if (/grandeza|medida|\barea|perimetr|volume|capacidade|comprimento/.test(t)) out.push("grandezas");
  if (/estatist|probabil|grafic|tabela|\bmedia\b|pesquisa/.test(t)) out.push("estatistica");
  return out;
}

const embaralhar = (l, rnd) => {
  const a = [...l];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Distribuição: n vagas, cada uma com { codigo, texto, unidade, dificuldade }.
// pool: habilidades oficiais do componente e do ano (objetos { c, t, d }).
export function planoDiagnostico(pool = [], d = {}, n = d.itens || 8, rnd = Math.random) {
  if (!pool.length || n < 1) return [];
  const comUnidade = pool.map((h) => ({ codigo: h.c, texto: h.t, unidade: unidadeDaHabilidade(h) }));
  const pedidas = unidadesPedidas(`${d.tema || ""} ${d.observacoes || ""}`);
  const presentes = [...new Set(comUnidade.map((h) => h.unidade))];
  const ordem = [...UNIDADES, "geral"].filter((u) => presentes.includes(u));
  let usar = ordem.filter((u) => pedidas.includes(u));
  if (!usar.length) usar = ordem;
  const filas = Object.fromEntries(usar.map((u) => [u, embaralhar(comUnidade.filter((h) => h.unidade === u), rnd)]));
  const escolhidas = [];
  // rodízio entre as unidades até preencher; sem habilidade nova, repete a partir do começo
  for (let volta = 0; escolhidas.length < n && volta < n * 2; volta++) {
    let algum = false;
    for (const u of usar) {
      if (escolhidas.length >= n) break;
      const h = filas[u].shift();
      if (h) {
        escolhidas.push(h);
        algum = true;
      }
    }
    if (!algum) break;
  }
  for (let k = 0; escolhidas.length < n && escolhidas.length; k++) escolhidas.push(escolhidas[k]);
  const faceis = Math.max(1, Math.round(n * 0.3));
  const dificeis = Math.max(1, Math.round(n * 0.3));
  const niveis = [...Array(faceis).fill("facil"), ...Array(n - faceis - dificeis).fill("media"), ...Array(dificeis).fill("dificil")];
  return escolhidas.slice(0, n).map((h, i) => ({ ...h, dificuldade: niveis[i] || "media" }));
}

export const resumirPlano = (plano = []) => plano.map((p) => ({ codigo: p.codigo, unidade: p.unidade, dificuldade: p.dificuldade }));

export function blocoPlano(plano = []) {
  if (!plano.length) return "";
  return `DISTRIBUIÇÃO OBRIGATÓRIA (avaliação diagnóstica: uma habilidade DIFERENTE por questão, na ordem):
${plano.map((p, i) => `${i + 1}. ${p.codigo} (${NOME_UNIDADE[p.unidade] || p.unidade}, ${p.dificuldade}) — ${String(p.texto || "").slice(0, 220)}`).join("\n")}
Em "habilidades", a 1ª de cada questão é EXATAMENTE o código da sua linha. Cada questão tem situação, contexto e formato próprios (nada de duas receitas, duas compras ou duas tabelas parecidas).`;
}

// ---------- conferências ----------
const principal = (it) => (it?.habilidades?.[0] || it?.habilidade)?.codigo || "";
const curto = (t = "", n = 110) => (t.length > n ? `${t.slice(0, n).trimEnd()}…` : t);

// Habilidades do plano que ainda não têm questão boa (contando repetições do plano)
export function habilidadesQueFaltam(itens = [], plano = []) {
  const falta = new Map();
  for (const p of plano) falta.set(p.codigo, (falta.get(p.codigo) || 0) + 1);
  const textos = new Map(plano.map((p) => [p.codigo, p.texto]));
  for (const it of itens) {
    if (it.problemas?.length) continue;
    const c = principal(it);
    if (falta.get(c) > 0) falta.set(c, falta.get(c) - 1);
  }
  return [...falta.entries()].filter(([, n]) => n > 0).flatMap(([c, n]) => Array(n).fill({ codigo: c, texto: textos.get(c) || "" }));
}

// Diagnóstico: questão com habilidade fora da distribuição ou já cobrada → problema (refazer com uma das que faltam)
export function conferirCobertura(av, plano = []) {
  if (!plano.length) return av;
  const restante = new Map();
  for (const p of plano) restante.set(p.codigo, (restante.get(p.codigo) || 0) + 1);
  const ondeVi = new Map();
  const marcas = (av.itens || []).map((it, i) => {
    if (it.problemas?.length) return null;
    const c = principal(it);
    if (!restante.has(c)) return { tipo: "fora", c };
    if (restante.get(c) === 0) return { tipo: "repetida", c, n: ondeVi.get(c) };
    restante.set(c, restante.get(c) - 1);
    ondeVi.set(c, i + 1);
    return null;
  });
  const faltam = [...restante.entries()].filter(([, n]) => n > 0).map(([c]) => c);
  const textos = new Map(plano.map((p) => [p.codigo, p.texto]));
  const sugestao = faltam.length ? ` Use uma destas, que ainda faltam: ${faltam.map((c) => `${c} — ${curto(textos.get(c) || "")}`).join("; ")}` : "";
  const itens = (av.itens || []).map((it, i) => {
    const m = marcas[i];
    if (!m) return it;
    const motivo =
      m.tipo === "fora"
        ? `a questão avalia ${m.c || "uma habilidade não informada"}, que não está na distribuição do diagnóstico.${sugestao}`
        : `a habilidade ${m.c} já é cobrada na questão ${m.n}: o diagnóstico usa uma habilidade diferente por questão.${sugestao}`;
    return { ...it, problemas: [...(it.problemas || []), motivo] };
  });
  return { ...av, itens };
}

// palavras que aparecem em qualquer questão (não indicam a mesma situação)
const PARADAS = new Set(
  "para pela pelo pelos pelas como cada esta este essa esse isso qual quais quanto quantos quantas sobre entre depois antes tinha tem tinham foram seria sera sendo uma umas uns dele dela deles delas mais menos muito pouco ainda tambem quando onde voce todo toda todos todas outra outro outras outros mesma mesmo assim entao porque figura mostra observe abaixo acima seguir seguinte tabela grafico valor valores medida medidas total resposta correta alternativa questao situacao problema calcule determine resolva"
    .split(" ")
);
const palavras = (t = "") => new Set(normalizar(t).split(" ").filter((w) => w.length >= 4 && !PARADAS.has(w) && !/^\d+$/.test(w)));
// Jaccard das palavras de conteúdo (0 quando um dos textos é curto demais para comparar)
export function semelhanca(a, b) {
  const A = palavras(a);
  const B = palavras(b);
  if (A.size < 5 || B.size < 5) return 0;
  let comum = 0;
  for (const w of A) if (B.has(w)) comum++;
  return comum / (A.size + B.size - comum);
}

// Mesma pergunta: comando igual (sem acento, pontuação e números). No diagnóstico basta isso;
// nas outras provas, só com o mesmo tipo de figura (ex.: "Qual é a área do terreno?" com figuras
// diferentes é normal numa prova de área).
const semNumeros = (t = "") => normalizar(t).replace(/\b\d+\b/g, "").replace(/\s+/g, " ").trim();
export function mesmaPergunta(a = {}, b = {}, { diagnostico = false } = {}) {
  const ca = semNumeros(a.comando);
  if (!ca || ca !== semNumeros(b.comando)) return false;
  return diagnostico || (a.figura?.tipo || "") === (b.figura?.tipo || "");
}

// Duas questões com a mesma situação (texto-base + comando muito parecidos) ou a mesma pergunta:
// a segunda é refeita
export function conferirRepeticoes(av, { limite = 0.5, diagnostico = false } = {}) {
  const itens = [...(av.itens || [])];
  const texto = (it) => `${it.textoBase || ""} ${it.comando || ""}`;
  for (let j = 1; j < itens.length; j++) {
    if (itens[j].problemas?.length || itens[j].doSistema) continue;
    for (let i = 0; i < j; i++) {
      if (itens[i].problemas?.length) continue;
      if (mesmaPergunta(itens[i], itens[j], { diagnostico })) {
        itens[j] = { ...itens[j], problemas: [...(itens[j].problemas || []), `a questão faz a mesma pergunta da questão ${i + 1} ("${String(itens[j].comando).slice(0, 90)}"): escreva outra pergunta, sobre o conteúdo da habilidade desta questão`] };
        break;
      }
      if (semelhanca(texto(itens[i]), texto(itens[j])) >= limite) {
        itens[j] = { ...itens[j], problemas: [...(itens[j].problemas || []), `a questão repete a situação ou o formato da questão ${i + 1}: escreva outra situação, com outro contexto`] };
        break;
      }
    }
  }
  return { ...av, itens };
}

// O texto-base que termina repetindo a pergunta do comando: o sistema tira a frase repetida
export function tirarPerguntaRepetida(textoBase = "", comando = "") {
  if (!textoBase || !comando) return textoBase;
  const frases = textoBase.match(/[^.!?]+[.!?]*/g) || [textoBase];
  const c = normalizar(comando);
  const manter = frases.filter((f) => {
    if (!/\?/.test(f)) return true;
    const nf = normalizar(f);
    return !(nf === c || (nf.length > 12 && (c.includes(nf) || nf.includes(c))) || semelhanca(f, comando) >= 0.6);
  });
  const novo = manter.join("").replace(/\s+/g, " ").trim();
  return novo.length >= 15 ? novo : textoBase;
}
