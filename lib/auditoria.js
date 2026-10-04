// Auditoria completa de uma apostila: junta TODAS as conferências do EduGera
// (gabarito, BNCC/etapa, unidades, revisão, qualidade) e algumas que só fazem
// sentido na bateria de qualidade (quantidade pedida, figuras, regra com letras
// no Fundamental I). Devolve uma nota de 0 a 100 e a lista de problemas.
// É usada na página /qualidade (bateria) e no script scripts/auditar.mjs.

import { conferirGabarito } from "./gabarito.js";
import { conferirCoerencia } from "./coerencia.js";
import { verificarUnidades } from "./unidades.js";
import { revisarMaterial } from "./revisao.js";
import { conferirQualidade } from "./qualidade.js";

export const PESO = { erro: 15, aviso: 4 };

const anoNumero = (form = {}) => {
  if (!/fundamental/i.test(form.nivel || "")) return null;
  const n = parseInt(String(form.ano || "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

// Regra escrita com letras soltas: "1/a < 1/b", "a > b", "V = c × l × h" não conta (fórmula com nomes de medida é ok a partir do 6º)
const REGRA_COM_LETRAS = /(^|[^\p{L}])[a-dmnxy]\s*[<>≤≥]\s*[a-dmnxy0-9]([^\p{L}]|$)|1\s*\/\s*[a-dmn]\b/u;

function extras(form, m, opcoes) {
  const p = [];
  const add = (onde, motivo, gravidade = "aviso") => p.push({ onde, motivo, gravidade, fonte: "bateria" });
  const ex = m.exercicios || [];

  if (!m.tituloDidatico) add("Título", "veio vazio.", "erro");
  if (!m.resumoPedagogico) add("Resumo", "veio vazio.", "erro");
  if (!(m.conceitos || []).some((c) => c.termo && c.termo !== "—")) add("Conceitos", "nenhum conceito veio.", "erro");

  const pedido = Number(opcoes.questoes || form.questoes);
  if (pedido && ex.length !== pedido) add("Exercícios", `vieram ${ex.length}, mas foram pedidos ${pedido}.`, "erro");

  ex.forEach((e, i) => {
    const n = (e.alternativas || []).length;
    if (n && n !== 4) add(`Exercício ${i + 1}`, `múltipla escolha com ${n} alternativas (o padrão é 4).`);
    if (!String(e.resposta || "").trim()) add(`Exercício ${i + 1}`, "sem resposta no gabarito.", "erro");
  });

  if (!m.figuraExplicativa) add("Figura do conteúdo", "não veio a figura que representa o conceito principal.");
  const comFigura = ex.filter((e) => e.figura).length;
  if (ex.length >= 4 && comFigura < 2) add("Figuras", `só ${comFigura} exercício(s) com figura (o mínimo pedido é 2).`);

  const ano = anoNumero(form);
  if (ano && ano <= 5) {
    const textos = [
      ...(m.formulas || []).map((f, i) => [`Fórmula ${i + 1}`, `${f.expressao || ""} ${f.descricao || ""}`]),
      ["Lembrete", m.lembreteImportante || ""],
      ...(m.dicas || []).map((d, i) => [`Dica ${i + 1}`, d]),
    ];
    for (const [onde, t] of textos)
      if (REGRA_COM_LETRAS.test(t)) add(onde, `regra escrita com letras (${t.trim().slice(0, 50)}); até o 5º ano, use palavras.`);
  }
  return p;
}

// Converte os avisos das outras conferências para o formato da auditoria.
// "conferir" do gabarito e da coerência (BNCC, figura faltando) são erros; o resto é aviso.
const converter = (lista, fonte, erroSeConferir) =>
  (lista || [])
    .filter((a) => a && a.tipo !== "corrigido")
    .map((a) => ({ onde: a.onde, motivo: a.motivo, trecho: a.trecho, gravidade: erroSeConferir ? "erro" : "aviso", fonte }));

export function auditarMaterial(form = {}, material = {}, opcoes = {}) {
  const m = material || {};
  const problemas = [
    ...converter(conferirGabarito(m).avisos, "gabarito", true),
    ...converter(conferirCoerencia(form, m), "coerência", true),
    ...converter(verificarUnidades(m), "unidades", false),
    ...converter(revisarMaterial(m).avisos, "revisão", false),
    ...converter(conferirQualidade(m), "qualidade", false),
    ...extras(form, m, opcoes),
  ];
  const erros = problemas.filter((p) => p.gravidade === "erro").length;
  const avisos = problemas.length - erros;
  const nota = Math.max(0, 100 - erros * PESO.erro - avisos * PESO.aviso);
  return { nota, erros, avisos, problemas };
}

// Resumo de uma bateria inteira: média, piores casos e problemas mais comuns
export function resumirBateria(resultados = []) {
  const ok = resultados.filter((r) => r.auditoria);
  const media = ok.length ? Math.round(ok.reduce((s, r) => s + r.auditoria.nota, 0) / ok.length) : 0;
  const contagem = new Map();
  for (const r of ok)
    for (const p of r.auditoria.problemas) {
      const chave = `${p.fonte}: ${p.motivo.replace(/\d+/g, "N").slice(0, 90)}`;
      contagem.set(chave, (contagem.get(chave) || 0) + 1);
    }
  const comuns = [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([problema, vezes]) => ({ problema, vezes }));
  return {
    casos: resultados.length,
    gerados: ok.length,
    falhas: resultados.length - ok.length,
    media,
    aprovados: ok.filter((r) => r.auditoria.erros === 0 && r.auditoria.nota >= 80).length,
    comuns,
  };
}
