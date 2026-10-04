// Conferências de coerência do pedido × material (além do gabarito):
// BNCC da etapa certa, quantidade mínima de exercícios e figuras citadas que faltam.

import { citaFigura } from "./figuras.js";

const etapaDoCodigo = (codigo = "") => (/^EF/i.test(codigo) ? "Ensino Fundamental" : /^EM/i.test(codigo) ? "Ensino Médio" : null);
const etapaDoNivel = (nivel = "") => (/m[eé]dio/i.test(nivel) ? "Ensino Médio" : /fundamental/i.test(nivel) ? "Ensino Fundamental" : null);

// Anos do código EF: "06" → [6]; "67" → 6 e 7; "69" → 6 a 9; "15" → 1 a 5
export function anosDoCodigo(codigo = "") {
  const m = /^EF(\d)(\d)/i.exec(codigo);
  if (!m) return null;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 0) return [b];
  return b >= a ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : null;
}

// Componente do código → disciplinas do formulário em que ele faz sentido
const COMPONENTES = {
  MA: ["Matemática"], MAT: ["Matemática"],
  LP: ["Português"], CI: ["Ciências"], CNT: ["Ciências"],
  HI: ["História"], GE: ["Geografia"], CHS: ["História", "Geografia"],
  AR: ["Arte"], EF: ["Educação Física"], LI: ["Língua Inglesa"], ER: ["Ensino Religioso"],
  LGG: ["Português", "Arte", "Educação Física", "Língua Inglesa"],
  CO: ["Informática"],
};
const NOME_COMPONENTE = { MA: "Matemática", MAT: "Matemática", LP: "Língua Portuguesa", CI: "Ciências", CNT: "Ciências da Natureza", HI: "História", GE: "Geografia", CHS: "Ciências Humanas", AR: "Arte", EF: "Educação Física", LI: "Língua Inglesa", ER: "Ensino Religioso", LGG: "Linguagens", CO: "Computação" };
const componenteDoCodigo = (codigo = "") => (/^EF\d\d([A-Z]{2})/i.exec(codigo) || /^EM\d\d([A-Z]{2,3})/i.exec(codigo))?.[1]?.toUpperCase() || null;

// Confere o PEDIDO antes de gerar: BNCC × etapa × ano × disciplina (sem gastar IA)
export function conferirPedido(form = {}, codigoMaterial = "") {
  const avisos = [];
  const codigo = String(codigoMaterial || form.bncc || "").trim().toUpperCase();
  if (!codigo) return avisos;
  const add = (motivo) => avisos.push({ onde: "Habilidade BNCC", trecho: codigo, motivo, tipo: "conferir" });

  const doCodigo = etapaDoCodigo(codigo);
  const doNivel = etapaDoNivel(form.nivel);
  if (doCodigo && doNivel && doCodigo !== doNivel) {
    add(`o código ${codigo} é do ${doCodigo}, mas o nível escolhido é ${doNivel}. Escolha uma habilidade da etapa certa no seletor BNCC.`);
    return avisos; // etapa errada: o resto não importa
  }

  const ano = parseInt(String(form.ano || "").replace(/\D/g, ""), 10);
  const anos = doNivel === "Ensino Fundamental" ? anosDoCodigo(codigo) : null;
  if (anos && Number.isFinite(ano) && !anos.includes(ano))
    add(`o código ${codigo} é do ${anos.length === 1 ? `${anos[0]}º ano` : `${anos[0]}º ao ${anos[anos.length - 1]}º ano`}, mas o ano escolhido é o ${ano}º.`);

  const comp = componenteDoCodigo(codigo);
  const aceitas = comp && COMPONENTES[comp];
  if (aceitas && form.disciplina && COMPONENTES_CONHECIDAS.has(form.disciplina) && !aceitas.includes(form.disciplina))
    add(`o código ${codigo} é de ${NOME_COMPONENTE[comp] || comp}, mas a disciplina escolhida é ${form.disciplina}.`);
  return avisos;
}
const COMPONENTES_CONHECIDAS = new Set(Object.values(COMPONENTES).flat());

export function conferirCoerencia(form = {}, material = {}) {
  const avisos = [...conferirPedido(form, material.bncc?.codigo)];
  const n = (material.exercicios || []).length;
  if (material.exercicios && n < 3)
    avisos.push({ onde: "Exercícios", trecho: `${n} exercício(s)`, motivo: "o material veio com menos de 3 exercícios. Gere novamente.", tipo: "conferir" });
  (material.exercicios || []).forEach((ex, i) => {
    if (!ex.figura && citaFigura(ex.enunciado))
      avisos.push({
        onde: `Exercício ${i + 1}`,
        trecho: ex.enunciado,
        motivo: "o enunciado cita uma figura, reta, tabela ou gráfico que não veio no material. Gere novamente ou reescreva a questão.",
        tipo: "conferir",
      });
  });
  return avisos;
}
