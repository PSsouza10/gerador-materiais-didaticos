// Bateria de qualidade da AVALIAÇÃO (Prova Paulista/SARESP): 5 temas de Matemática com
// figura e 2 de outras disciplinas. Critério para publicar (pedido do Paulo, 16/10/2026):
// nenhuma questão com gabarito fora das alternativas e nenhuma explicação com conta errada.
import { conferirAvaliacao } from "./avaliacao.js";
import { semelhanca, mesmaPergunta } from "./diagnostico.js";

const caso = (disciplina, ano, bncc, tema, itens = 5, modo = "") => ({
  disciplina, nivel: "Ensino Fundamental", ano, bncc, tema, itens, figuras: 40, modo,
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
  // diagnóstico (primeiro uso real, 23/10/2026): tema amplo, 10 questões, uma habilidade por questão
  caso("Matemática", "7", "", "Diagnóstico do 7º ano: números, álgebra, geometria, grandezas e medidas, estatística", 10, "diagnostico"),
];

const CONTA_ERRADA = /conta errada|não ao valor dela|não mostra a conta|erro inventado|resolução chega a .* mas a/i;

// Resultado de um caso: confere de novo no navegador (mesmas regras do servidor)
export function auditarAvaliacao(avaliacao, pedidas = null) {
  const { avisos } = conferirAvaliacao(avaliacao);
  const itens = avaliacao?.itens || [];
  const semGabarito = itens.map((it, i) => (it.semGabarito || !it.correta ? i + 1 : null)).filter(Boolean);
  const contasErradas = avisos.filter((a) => CONTA_ERRADA.test(a.motivo));
  // diagnóstico: habilidades repetidas, unidades cobertas e situações parecidas
  const diagnostico = avaliacao?.pedido?.modo === "diagnostico";
  const codigos = itens.map((it) => (it.habilidades?.[0] || it.habilidade)?.codigo || "");
  const repetidas = diagnostico ? codigos.filter((c, i) => c && codigos.indexOf(c) !== i).length : 0;
  const unidades = diagnostico ? [...new Set((avaliacao.pedido.plano || []).filter((p) => codigos.includes(p.codigo)).map((p) => p.unidade))] : [];
  const texto = (it) => `${it.textoBase || ""} ${it.comando || ""}`;
  const parecidas = itens.filter((it, j) => itens.slice(0, j).some((x) => semelhanca(texto(x), texto(it)) >= 0.5 || mesmaPergunta(x, it, { diagnostico }))).length;
  return {
    diagnostico,
    habilidadesRepetidas: repetidas,
    unidades,
    situacoesParecidas: parecidas,
    questoes: itens.length,
    comFigura: itens.filter((it) => it.figura).length,
    refeitas: itens.filter((it) => it.refeita).length,
    retiradas: pedidas ? Math.max(0, pedidas - itens.length) : 0,
    semGabarito,
    contasErradas,
    outros: avisos.filter((a) => !CONTA_ERRADA.test(a.motivo) && a.tipo !== "corrigido"),
    aprovado: semGabarito.length === 0 && contasErradas.length === 0 && repetidas === 0 && parecidas === 0 && (!diagnostico || !pedidas || itens.length >= pedidas),
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
