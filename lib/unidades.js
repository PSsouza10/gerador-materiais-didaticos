// Verificação automática de consistência de unidades (dimensional).
// Não corrige nada sozinha: aponta trechos para o professor revisar.
//   comprimento → cm, m ...   área → cm², m² ...   volume/capacidade → cm³, m³, L ...

const U = "(?:mm|cm|dm|m|km)";
const CUBICA = new RegExp(`\\b\\d*[,.]?\\d*\\s*${U}\\s*(?:³|\\^3|3\\b)|\\b(?:mil[ií]metros?|cent[ií]metros?|dec[ií]metros?|metros?|quil[ôo]metros?)\\s+c[úu]bicos?`, "i");
const QUADRADA = new RegExp(`\\b\\d*[,.]?\\d*\\s*${U}\\s*(?:²|\\^2|2\\b)|\\b(?:mil[ií]metros?|cent[ií]metros?|dec[ií]metros?|metros?|quil[ôo]metros?)\\s+quadrados?`, "i");
const LITRO = /\b\d+[,.]?\d*\s*(?:l|ml|litros?|mililitros?)\b/i;

const AREA = /(?<!\p{L})[áa]reas?(?!\p{L})/iu;
const VOLUME = /(?<!\p{L})(?:volumes?|capacidades?)(?!\p{L})/iu;
const PERIMETRO = /(?<!\p{L})per[íi]metros?(?!\p{L})/iu;
// termos que tornam legítimo misturar grandezas na mesma frase (ex.: V = área da base × altura)
const RELACAO = /×|\*|(?<!\p{L})(?:altura|base|vezes)(?!\p{L})|multiplic|=/iu;

function oracoes(texto) {
  return String(texto || "")
    .split(/(?<=[.;!?])\s+|\n|\s—\s|\s-\s|\(|\)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function verificarTexto(texto) {
  const problemas = [];
  for (const o of oracoes(texto)) {
    const temRelacao = RELACAO.test(o);
    if (AREA.test(o) && (CUBICA.test(o) || LITRO.test(o)) && !VOLUME.test(o) && !temRelacao)
      problemas.push({ trecho: o, motivo: "área com unidade de volume (área usa unidade ao quadrado, ex.: dm²)" });
    else if (VOLUME.test(o) && QUADRADA.test(o) && !AREA.test(o) && !temRelacao)
      problemas.push({ trecho: o, motivo: "volume/capacidade com unidade de área (volume usa unidade ao cubo ou litros)" });
    else if (PERIMETRO.test(o) && (QUADRADA.test(o) || CUBICA.test(o)) && !AREA.test(o) && !VOLUME.test(o) && !temRelacao)
      problemas.push({ trecho: o, motivo: "perímetro com unidade de área ou volume (perímetro usa cm, m...)" });
  }
  return problemas;
}

// Percorre todos os textos do material e devolve alertas com a localização
export function verificarUnidades(m = {}) {
  const campos = [];
  (m.conceitos || []).forEach((c, i) => campos.push([`Conceito ${i + 1}`, `${c.termo}: ${c.definicao}`]));
  (m.formulas || []).forEach((f, i) => campos.push([`Fórmula ${i + 1}`, `${f.nome}: ${f.descricao}`]));
  (m.dicas || []).forEach((d, i) => campos.push([`Dica ${i + 1}`, d]));
  campos.push(["Lembre-se", m.lembreteImportante]);
  campos.push(["Aplicação prática", [m.aplicacaoPratica?.situacao, ...(m.aplicacaoPratica?.exemplos || [])].join(". ")]);
  (m.exercicios || []).forEach((e, i) => {
    campos.push([`Exercício ${i + 1}`, [e.enunciado, ...(e.alternativas || [])].join(". ")]);
    campos.push([`Gabarito do exercício ${i + 1}`, e.resposta]);
  });
  const alertas = [];
  for (const [onde, texto] of campos) for (const p of verificarTexto(texto)) alertas.push({ onde, ...p });
  return alertas;
}
