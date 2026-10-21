import { normalizar } from "./revisao.js";

const semAcentos = (texto = "") => normalizar(texto);
const texto = (valor) => (typeof valor === "string" ? valor : "");
const dinheiro = (valor) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

function textosDoMaterial(m = {}) {
  return [
    ...(m.formulas || []).flatMap((f) => [texto(f.nome), texto(f.expressao), texto(f.descricao)]),
    ...(m.dicas || []).map(texto),
    texto(m.lembreteImportante),
    texto(m.resumoPedagogico),
    texto(m.aplicacaoPratica?.situacao),
    ...(m.aplicacaoPratica?.exemplos || []).map(texto),
    ...(m.cena?.falas || []).map((f) => texto(f.texto)),
    ...(m.exercicios || []).flatMap((e) => [texto(e.enunciado), texto(e.resposta), texto(e.resolucao)]),
  ].filter(Boolean);
}

function auditarRotuloDaAdicao(m = {}, disciplina = "") {
  if (!/matem[aá]tica/i.test(disciplina)) return [];
  const problemas = [];
  for (const [i, formula] of (m.formulas || []).entries()) {
    const expressao = texto(formula.expressao).replace(/\s+/g, "").replace(/[×·]/g, "*");
    const comutativa = /^([a-z])\+([a-z])=\2\+\1$/i.test(expressao);
    const nome = semAcentos(formula.nome);
    if (comutativa && /\bigualdade\b/.test(nome) && !/\bcomutativa\b/.test(nome)) {
      problemas.push({
        onde: `Fórmula ${i + 1}`,
        trecho: formula.nome,
        motivo: "a expressão mostra a propriedade comutativa da adição, não uma propriedade geral da igualdade. Revise o nome e a explicação.",
        gravidade: "aviso",
        fonte: "pedagógica",
      });
    }
  }
  return problemas;
}

function sugereTrocaNaSubtracao(conteudo) {
  const t = semAcentos(conteudo);
  const padroes = [
    /\b(?:subtrair|subtracao)\b[^.!?]{0,120}\b(?:troc\w*|invert\w*|permut\w*|mud\w*)\b[^.!?]{0,35}\bordem\b/,
    /\b(?:troc\w*|invert\w*|permut\w*|mud\w*)\b[^.!?]{0,35}\bordem\b[^.!?]{0,120}\b(?:subtrair|subtracao)\b/,
  ];
  for (const padrao of padroes) {
    const match = padrao.exec(t);
    if (!match) continue;
    const acao = /\b(?:troc\w*|invert\w*|permut\w*|mud\w*)\b/.exec(match[0]);
    const antesDaAcao = acao ? match[0].slice(0, acao.index) : "";
    if (/\b(?:nao|nunca|jamais|evite|evitar)\b/.test(antesDaAcao)) continue;
    return true;
  }
  return false;
}

function auditarTrocaNaSubtracao(m = {}, disciplina = "") {
  if (!/matem[aá]tica/i.test(disciplina)) return [];
  const textos = textosDoMaterial(m);
  const achado = textos.find(sugereTrocaNaSubtracao);
  if (!achado) return [];
  return [{
    onde: "Orientação matemática",
    trecho: achado,
    motivo: "a frase pode sugerir que se pode trocar a ordem dos termos na subtração; essa operação não é comutativa. Esclareça que a troca vale para parcelas da adição.",
    gravidade: "erro",
    fonte: "pedagógica",
  }];
}

function numeroBR(valor) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  let s = String(valor ?? "").replace(/\s/g, "").replace(/r\$/i, "").replace(/[^\d,.-]/g, "");
  if (!s || !/\d/.test(s)) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function tabelaDePrecos(m = {}) {
  const tabelas = [m.cena?.figura, m.figuraExplicativa, ...(m.exercicios || []).map((e) => e.figura)]
    .filter((f) => f?.tipo === "tabela");
  for (const tabela of tabelas) {
    const cabecalho = (tabela.cabecalho || []).map(semAcentos);
    const colunaPreco = cabecalho.findIndex((h) => /\b(preco|valor|custo)\b/.test(h));
    if (colunaPreco < 0) continue;
    const colunaItemEncontrada = cabecalho.findIndex((h) => /\b(fruta|produto|item)\b/.test(h));
    const colunaItem = colunaItemEncontrada >= 0 ? colunaItemEncontrada : (colunaPreco === 0 ? 1 : 0);
    const precos = new Map();
    for (const linha of tabela.linhas || []) {
      const nome = semAcentos(linha?.[colunaItem]).replace(/\s+/g, " ").replace(/s$/, "").trim();
      const preco = numeroBR(linha?.[colunaPreco]);
      if (nome && preco != null) precos.set(nome, preco);
    }
    if (precos.size) return precos;
  }
  return null;
}

function escaparRegex(valor) {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function auditarExemploDeCompra(exemplo, precos) {
  if (!/reais?|r\$/i.test(exemplo)) return null;
  const declarado = /\bpor\s+(?:r\$\s*)?([\d.]+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s*(?:reais?|r\$)?/i.exec(exemplo);
  if (!declarado) return null;
  const valorDeclarado = numeroBR(declarado[1]);
  if (valorDeclarado == null) return null;

  const normalizado = semAcentos(exemplo);
  let calculado = 0;
  let itens = 0;
  for (const [nome, preco] of precos) {
    const re = new RegExp(`\\b(\\d+)\\s+(?:de\\s+)?${escaparRegex(nome)}s?\\b`, "g");
    for (const match of normalizado.matchAll(re)) {
      calculado += Number(match[1]) * preco;
      itens++;
    }
  }
  if (!itens) return null;
  return { calculado, declarado: valorDeclarado };
}

function auditarTotaisDeCompra(m = {}, disciplina = "") {
  if (!/matem[aá]tica/i.test(disciplina)) return [];
  const exemplos = m.aplicacaoPratica?.exemplos || [];
  const precos = tabelaDePrecos(m);
  if (!precos || !exemplos.length) return [];

  const calculos = exemplos.map((exemplo, i) => ({ exemplo, numero: i + 1, valores: auditarExemploDeCompra(exemplo, precos) })).filter((x) => x.valores);
  const problemas = [];
  for (const { exemplo, numero, valores } of calculos) {
    if (Math.abs(valores.calculado - valores.declarado) > 1e-8) {
      problemas.push({
        onde: `Exemplo ${numero} da aplicação prática`,
        trecho: exemplo,
        motivo: `pela tabela de preços, a combinação soma ${dinheiro(valores.calculado)}, mas o texto declara ${dinheiro(valores.declarado)}. Confira o cálculo.`,
        gravidade: "erro",
        fonte: "pedagógica",
      });
    }
  }

  const contexto = semAcentos(`${m.aplicacaoPratica?.situacao || ""} ${exemplos.join(" ")}`);
  const prometeMesmoTotal = /\bmesm[oa] (?:total|valor|soma|quantia)\b|\bresultem no mesmo\b|\bgastar igual\b/.test(contexto);
  if (prometeMesmoTotal && calculos.length >= 2) {
    const totais = calculos.map((x) => x.valores.declarado);
    if (totais.some((v) => Math.abs(v - totais[0]) > 1e-8)) {
      problemas.push({
        onde: "Exemplos da aplicação prática",
        trecho: calculos.map((x) => x.exemplo).join(" / "),
        motivo: `o texto anuncia combinações com o mesmo total, mas os valores declarados diferem (${totais.map(dinheiro).join(" e ")}). Confira os exemplos.`,
        gravidade: "erro",
        fonte: "pedagógica",
      });
    }
  }
  return problemas;
}

function auditarAssociacao(m = {}) {
  const problemas = [];
  (m.exercicios || []).forEach((exercicio, i) => {
    const enunciado = semAcentos(exercicio.enunciado);
    const pedeAssociacao = exercicio.tipo === "associar" || /\b(?:associe|relacione|ligue)\b/.test(enunciado);
    const tabela = exercicio.figura?.tipo === "tabela" ? exercicio.figura : null;
    if (!pedeAssociacao || !tabela) return;

    const citaGrupos = /\b1\s+2\s+3\b/.test(enunciado) && /\ba\s+b\s+c\b/.test(enunciado);
    const cabecalhos = (tabela.cabecalho || []).filter((c) => String(c || "").trim()).length;
    if (citaGrupos && cabecalhos < 2) {
      problemas.push({
        onde: `Exercício ${i + 1}`,
        trecho: exercicio.enunciado,
        motivo: "o enunciado pede associar dois grupos, mas a tabela fornece apenas uma coluna. Inclua as duas colunas e todos os itens a relacionar.",
        gravidade: "erro",
        fonte: "pedagógica",
      });
    }
  });
  return problemas;
}

export function auditarInconsistenciasPedagogicas(form = {}, material = {}) {
  const disciplina = form.disciplina || "";
  return [
    ...auditarRotuloDaAdicao(material, disciplina),
    ...auditarTrocaNaSubtracao(material, disciplina),
    ...auditarTotaisDeCompra(material, disciplina),
    ...auditarAssociacao(material),
  ];
}
