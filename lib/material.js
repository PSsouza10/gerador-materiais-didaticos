// Normaliza a resposta da IA para o formato esperado pela folha A4,
// mesmo se o modelo devolver algum campo faltando ou com tipo errado.

import { normalizarFigura, completarFigurasCitadas } from "./figuras.js";
import { normalizarCena, normalizarFala } from "./cena.js";

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
      fala: normalizarFala(e.fala),
      enunciado: texto(e.enunciado),
      alternativas: lista(e.alternativas).map(texto).filter(Boolean),
      tipo: tipoQuestao(e),
      exigencia: EXIGENCIAS.includes(e.exigencia) ? e.exigencia : "",
      resolucao: texto(e.resolucao),
      resposta: juntarResposta(texto(e.resposta), texto(e.resolucao)),
      figura: normalizarFigura(e.figura),
    }));

  const ap = parsed.aplicacaoPratica && typeof parsed.aplicacaoPratica === "object" ? parsed.aplicacaoPratica : {};

  return completarFigurasCitadas({
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
    figuraExplicativa: normalizarFigura(parsed.figuraExplicativa),
    cena: normalizarCena(parsed.cena),
    // visual das páginas: "premium" (pôster 3D) ou "padrao"; definido pelo servidor na geração
    tema: parsed.tema === "premium" ? "premium" : "padrao",
    exercicios,
  });
}

// Tipos de questão e nível de exigência (lembrar → criar) pedidos à IA
export const TIPOS_QUESTAO = ["multipla_escolha", "aberta", "completar", "verdadeiro_falso", "associar", "explicar"];
export const EXIGENCIAS = ["lembrar", "compreender", "aplicar", "analisar", "avaliar", "criar"];
export const EXIGENCIAS_ALTAS = ["analisar", "avaliar", "criar"];

// Usa o tipo informado pela IA; se faltar ou vier errado, deduz pelas alternativas
function tipoQuestao(e) {
  if (TIPOS_QUESTAO.includes(e.tipo)) return e.tipo;
  return lista(e.alternativas).filter(Boolean).length ? "multipla_escolha" : "aberta";
}

export function slugify(s = "") {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Habilidade BNCC exibida no material. "verificada" = o código existe na base
// oficial (conferido pelo servidor na geração, ou pelo seletor no formulário).
export function bnccDoMaterial(form = {}, m = {}) {
  if (m.bncc?.codigo && m.bncc.codigo === form.bncc) return m.bncc;
  if (form.bncc) return { codigo: form.bncc, texto: form.habilidade, verificada: !!form.bnccVerificada };
  return null;
}

// Só afirma alinhamento quando há habilidade oficial conferida.
export function rodapeBncc(bncc, exemplo = false) {
  const base = exemplo ? "Material de EXEMPLO · EduGera" : "Material gerado com EduGera";
  if (bncc?.verificada) return `${base} · alinhado à habilidade ${bncc.codigo} da BNCC`;
  if (bncc?.codigo) return `${base} · habilidade ${bncc.codigo} informada pelo docente (não localizada na BNCC)`;
  return `${base} · personalize com uma habilidade da BNCC`;
}

// "Matemática · Ensino Fundamental · 7º ano"
export function linhaEtapa(form = {}) {
  const ano = !form.ano ? "" : form.ano.startsWith("EM") ? `${form.ano.slice(2)}ª série` : `${form.ano}º ano`;
  return [form.disciplina, form.nivel, ano].filter(Boolean).join(" · ");
}

// Linhas de resposta de questão aberta conforme o tipo e o tamanho do enunciado
export function linhasResposta(enunciado = "") {
  const t = String(enunciado).toLowerCase();
  let n = 4;
  if (/\b(calcule|resolva|determine|quanto|quantos|quantas|encontre|mostre)\b/.test(t)) n = 5;
  if (/\b(explique|justifique|descreva|compare|argumente|comente|diferen[cç]a|por que|porque|demonstre|elabore|crie|redija)\b/.test(t)) n = 6;
  if (t.length > 220) n += 1;
  if (t.length > 400) n += 1;
  return Math.min(n, 9);
}

// Gabarito = alternativa marcada + resolução (sem repetir se a IA já incluiu)
function juntarResposta(resposta, resolucao) {
  if (!resolucao) return resposta;
  if (!resposta) return resolucao;
  const limpa = (t) => t.replace(/\s+/g, "").toLowerCase();
  if (limpa(resposta).includes(limpa(resolucao))) return resposta;
  return `${resposta.replace(/[.\s]+$/, "")}. ${resolucao}`;
}
