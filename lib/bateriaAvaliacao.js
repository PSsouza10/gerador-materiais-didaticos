// Bateria de qualidade da AVALIAÇÃO (Prova Paulista/SARESP): 5 temas de Matemática com
// figura e 2 de outras disciplinas. Critério para publicar (pedido do Paulo, 16/10/2026):
// nenhuma questão com gabarito fora das alternativas e nenhuma explicação com conta errada.
import { conferirAvaliacao } from "./avaliacao.js";

const caso = (disciplina, ano, bncc, tema, itens = 5) => ({
  disciplina, nivel: "Ensino Fundamental", ano, bncc, tema, itens, figuras: 40,
  professor: "Bateria de qualidade", escola: "", turma: "", observacoes: "",
});

export const CASOS_AVALIACAO = [
  caso("Matemática", "7", "EF07MA32", "Área de retângulos, quadrados e triângulos"),
  caso("Matemática", "7", "EF07MA30", "Volume de blocos retangulares"),
  caso("Matemática", "6", "EF06MA32", "Leitura de gráficos de barras e de linhas"),
  caso("Matemática", "4", "EF04MA09", "Frações unitárias na reta numérica"),
  caso("Matemática", "6", "EF06MA27", "Medida e classificação de ângulos"),
  caso("Ciências", "5", "EF05CI02", "Mudanças de estado físico e ciclo da água"),
  caso("Geografia", "8", "EF08GE03", "Dinâmica demográfica e pirâmide etária"),
];

const CONTA_ERRADA = /conta errada|não ao valor dela|não mostra a conta|erro inventado|resolução chega a .* mas a/i;

// Resultado de um caso: confere de novo no navegador (mesmas regras do servidor)
export function auditarAvaliacao(avaliacao) {
  const { avisos } = conferirAvaliacao(avaliacao);
  const itens = avaliacao?.itens || [];
  const semGabarito = itens.map((it, i) => (it.semGabarito || !it.correta ? i + 1 : null)).filter(Boolean);
  const contasErradas = avisos.filter((a) => CONTA_ERRADA.test(a.motivo));
  return {
    questoes: itens.length,
    comFigura: itens.filter((it) => it.figura).length,
    refeitas: itens.filter((it) => it.refeita).length,
    semGabarito,
    contasErradas,
    outros: avisos.filter((a) => !CONTA_ERRADA.test(a.motivo) && a.tipo !== "corrigido"),
    aprovado: semGabarito.length === 0 && contasErradas.length === 0,
  };
}

export function resumirBateriaAvaliacao(resultados = []) {
  const prontos = resultados.filter((r) => r.auditoria);
  return {
    casos: prontos.length,
    aprovados: prontos.filter((r) => r.auditoria.aprovado).length,
    semGabarito: prontos.reduce((s, r) => s + r.auditoria.semGabarito.length, 0),
    contasErradas: prontos.reduce((s, r) => s + r.auditoria.contasErradas.length, 0),
    liberado: prontos.length > 0 && prontos.every((r) => r.auditoria.aprovado),
  };
}
