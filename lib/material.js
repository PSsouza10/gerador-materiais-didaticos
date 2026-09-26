// Normaliza a resposta da IA para o formato esperado pela folha A4,
// mesmo se o modelo devolver algum campo faltando ou com tipo errado.

const lista = (v) => (Array.isArray(v) ? v : []);
const texto = (v) => (typeof v === "string" ? v : "");

export function normalizarMaterial(parsed = {}, tema = "") {
  const conceitos = lista(parsed.conceitos)
    .filter((c) => c && (c.termo || c.definicao))
    .map((c) => ({ termo: texto(c.termo), definicao: texto(c.definicao) }));

  const formulas = lista(parsed.formulas)
    .filter((f) => f && (f.expressao || f.nome))
    .map((f) => ({ nome: texto(f.nome), expressao: texto(f.expressao), descricao: texto(f.descricao) }));

  const exercicios = lista(parsed.exercicios)
    .filter((e) => e && e.enunciado)
    .map((e) => ({
      enunciado: texto(e.enunciado),
      alternativas: lista(e.alternativas).map(texto).filter(Boolean),
      resposta: texto(e.resposta),
    }));

  const ap = parsed.aplicacaoPratica && typeof parsed.aplicacaoPratica === "object" ? parsed.aplicacaoPratica : {};

  return {
    tituloDidatico: texto(parsed.tituloDidatico) || String(tema).toUpperCase(),
    resumoPedagogico: texto(parsed.resumoPedagogico),
    conceitos: conceitos.length ? conceitos : [{ termo: "—", definicao: "—" }],
    formulas,
    dicas: lista(parsed.dicas).map(texto).filter(Boolean),
    lembreteImportante: texto(parsed.lembreteImportante),
    aplicacaoPratica: {
      titulo: texto(ap.titulo),
      situacao: texto(ap.situacao),
      exemplos: lista(ap.exemplos).map(texto).filter(Boolean),
    },
    exercicios,
  };
}

export function slugify(s = "") {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
