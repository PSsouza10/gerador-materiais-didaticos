import { test } from "node:test";
import assert from "node:assert/strict";
import { conferirQualidade } from "../lib/qualidade.js";
import { normalizarMaterial } from "../lib/material.js";

const base = () => ({
  tituloDidatico: "Frações na reta numérica",
  resumoPedagogico: "Frações representam partes de um inteiro e podem ser localizadas na reta numérica.",
  conceitos: [{ termo: "Fração unitária", definicao: "Fração com numerador 1." }],
  formulas: [{ nome: "Comparação", expressao: "1/a > 1/b se a < b", descricao: "Entre frações unitárias, quanto maior o denominador, menor a fração." }],
  dicas: ["Divida a reta em partes iguais antes de marcar."],
  lembreteImportante: "",
  aplicacaoPratica: { titulo: "Pizza", situacao: "Dividir uma pizza.", exemplos: [] },
  cena: {
    titulo: "A pizza da Vó Ana",
    lugar: "cozinha",
    falas: [
      { quem: "theo", texto: "Quero 1/8 da pizza, é maior que 1/4!" },
      { quem: "vo", texto: "Será? Olha a reta: em quantas partes iguais está dividida?" },
    ],
    figura: { tipo: "reta", inicio: 0, fim: 1, divisoes: 8, rotulos: "extremos", marcar: null, legenda: "" },
    pergunta: "Quem come mais: quem pega 1/8 ou 1/4?",
  },
  exercicios: [
    { enunciado: "Qual fração é maior?", tipo: "multipla_escolha", exigencia: "compreender", alternativas: ["a) 1/2", "b) 1/3", "c) 1/4", "d) 1/5"], resposta: "a) 1/2" },
    { enunciado: "Complete: 1/2 = ____/4", tipo: "completar", exigencia: "aplicar", alternativas: [], resposta: "2" },
    { enunciado: "Marque V ou F: 1) 1/3 > 1/2", tipo: "verdadeiro_falso", exigencia: "lembrar", alternativas: [], resposta: "F" },
    { enunciado: "Ana disse que 1/8 > 1/4. Encontre o erro.", tipo: "explicar", exigencia: "analisar", alternativas: [], resposta: "..." },
  ],
});

const motivos = (avisos) => avisos.map((a) => a.motivo).join(" | ");

test("material bom não gera avisos", () => {
  assert.deepEqual(conferirQualidade(base()), []);
});

test("regra do denominador sem condição é apontada", () => {
  const m = base();
  m.dicas = ["Quanto maior o denominador, menor a fração."];
  const a = conferirQualidade(m);
  assert.equal(a.length, 1);
  assert.match(a[0].motivo, /frações unitárias ou com o mesmo numerador/);
  assert.equal(a[0].onde, "Dica 1");
});

test("regra do numerador sem o mesmo denominador é apontada", () => {
  const m = base();
  m.lembreteImportante = "Quanto maior o numerador, maior a fração.";
  assert.match(motivos(conferirQualidade(m)), /mesmo denominador/);
});

test("frase de enfeite e texto longo", () => {
  const m = base();
  m.resumoPedagogico = "Vamos mergulhar no fascinante mundo das frações!";
  m.conceitos[0].definicao = "x".repeat(200);
  const t = motivos(conferirQualidade(m));
  assert.match(t, /enfeite/);
  assert.match(t, /texto longo \(200 caracteres/);
});

test("alternativas repetidas e gabarito sem letra", () => {
  const m = base();
  m.exercicios[0].alternativas = ["a) 1/2", "b) 1/3", "c) 1/2", "d) 1/5"];
  m.exercicios[0].resposta = "1/2";
  const t = motivos(conferirQualidade(m));
  assert.match(t, /alternativas repetidas/);
  assert.match(t, /não indica a letra/);
});

test("pouca variedade e nenhuma questão exigente", () => {
  const m = base();
  m.exercicios = m.exercicios.map((e) => ({ ...e, tipo: "multipla_escolha", exigencia: "lembrar", alternativas: ["a) 1", "b) 2"], resposta: "a) 1" }));
  const t = motivos(conferirQualidade(m));
  assert.match(t, /pouca variedade/);
  assert.match(t, /analisar, avaliar ou criar/);
});

test("normalizarMaterial guarda tipo e exigência, deduzindo quando faltam", () => {
  const m = normalizarMaterial({
    exercicios: [
      { enunciado: "A", tipo: "associar", exigencia: "criar", alternativas: [] },
      { enunciado: "B", alternativas: ["a) 1", "b) 2"] },
      { enunciado: "C", tipo: "inventado", exigencia: "x" },
    ],
  });
  assert.deepEqual(
    m.exercicios.map((e) => [e.tipo, e.exigencia]),
    [["associar", "criar"], ["multipla_escolha", ""], ["aberta", ""]]
  );
});

test("material antigo (sem tipo/exigência) não reclama de exigência", () => {
  const m = base();
  m.exercicios = m.exercicios.map(({ tipo, exigencia, ...e }) => e);
  assert.doesNotMatch(motivos(conferirQualidade(m)), /analisar, avaliar ou criar/);
});

test("V ou F marcado como 'analisar' não conta como questão exigente", () => {
  const m = base();
  m.exercicios[3] = { enunciado: "Marque V ou F: 1) 1/2 > 1/3", tipo: "verdadeiro_falso", exigencia: "analisar", alternativas: [], resposta: "V" };
  assert.match(motivos(conferirQualidade(m)), /analisar, avaliar ou criar/);
});

test("'Neste material, exploraremos' é enfeite", () => {
  const m = base();
  m.resumoPedagogico = "Neste material, exploraremos como localizar frações na reta.";
  assert.match(motivos(conferirQualidade(m)), /enfeite/);
});

test("apostila sem cena do cotidiano é apontada", () => {
  const m = base();
  m.cena = null;
  assert.match(motivos(conferirQualidade(m)), /situação do cotidiano/);
});

test("exercício sem fala de personagem é apontado (material novo)", () => {
  const m = base();
  m.exercicios[0].fala = null;
  assert.match(motivos(conferirQualidade(m)), /sem a fala do personagem/);
});
