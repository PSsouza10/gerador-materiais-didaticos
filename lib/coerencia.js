// Conferências de coerência do pedido × material (além do gabarito):
// BNCC da etapa certa, quantidade mínima de exercícios e figuras citadas que faltam.

import { citaFigura } from "./figuras.js";

const etapaDoCodigo = (codigo = "") => (/^EF/i.test(codigo) ? "Ensino Fundamental" : /^EM/i.test(codigo) ? "Ensino Médio" : null);
const etapaDoNivel = (nivel = "") => (/m[eé]dio/i.test(nivel) ? "Ensino Médio" : /fundamental/i.test(nivel) ? "Ensino Fundamental" : null);

export function conferirCoerencia(form = {}, material = {}) {
  const avisos = [];
  const codigo = material.bncc?.codigo || form.bncc || "";
  const doCodigo = etapaDoCodigo(codigo);
  const doNivel = etapaDoNivel(form.nivel);
  if (doCodigo && doNivel && doCodigo !== doNivel)
    avisos.push({
      onde: "Habilidade BNCC",
      trecho: codigo,
      motivo: `o código ${codigo} é do ${doCodigo}, mas o nível escolhido é ${doNivel}. Escolha uma habilidade da etapa certa no seletor BNCC.`,
      tipo: "conferir",
    });
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
