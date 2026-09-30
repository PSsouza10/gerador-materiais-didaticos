import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, tentarAvaliar, extrairExpressao } from "../lib/avaliar.js";
import { conferirExercicio, conferirGabarito, conferirNotacao } from "../lib/gabarito.js";

test("evaluate: exemplos obrigatórios", () => {
  assert.equal(evaluate("3^4"), 81);
  assert.equal(evaluate("(2^3)^2"), 64);
  assert.equal(evaluate("10^5 * 10^-3"), 100);
  assert.equal(evaluate("5.972e24 / 10"), 5.972e23);
});

test("evaluate: notação brasileira, sobrescritos e precedência", () => {
  assert.equal(evaluate("10⁵ × 10⁻³"), 100);
  assert.equal(evaluate("(5²) × (5³)"), 3125);
  assert.equal(evaluate("5,6 × 10^-4"), 0.00056);
  assert.equal(evaluate("1/10 * 5,972 × 10^24"), 5.972e23);
  assert.equal(evaluate("-2^2"), -4);
  assert.equal(evaluate("2^3^2"), 512);
  assert.equal(evaluate("(5^2)(5^3)"), 3125);
  assert.equal(evaluate("60 000 / 1000"), 60);
  assert.equal(tentarAvaliar("2 +"), null);
  assert.equal(tentarAvaliar("alert(1)"), null);
});

test("extrai só cálculos explícitos do enunciado", () => {
  assert.deepEqual(extrairExpressao("Calcule 3^4."), { expressao: "3^4", valor: 81 });
  assert.equal(extrairExpressao("Qual é o resultado de (2^3)^2?").valor, 64);
  assert.equal(extrairExpressao("Simplifique 10⁵ × 10⁻³.").valor, 100);
  assert.equal(extrairExpressao("Escreva 0,00056 em notação científica."), null);
  assert.equal(extrairExpressao("A Terra tem 5,972 × 10²⁴ kg. Qual é 1/10 dessa massa?"), null);
  assert.equal(extrairExpressao("A massa de um próton é 1,67 × 10^-27 kg. Qual a massa de 10 prótons?"), null);
});

test("apostila 'Domine as Potências Agora': gabaritos corretos passam sem aviso", () => {
  const exs = [
    { enunciado: "Calcule 3^4.", alternativas: [], resposta: "81" },
    { enunciado: "Escreva 0,00056 em notação científica.", alternativas: [], resposta: "5,6 × 10^-4" },
    { enunciado: "Qual é o resultado de (2^3)^2?", alternativas: ["a) 16", "b) 32", "c) 64", "d) 8"], resposta: "c) 64. (2^3)^2 = 2^6 = 64" },
    { enunciado: "Calcule 10^5 × 10^-3.", alternativas: ["a) 10^2", "b) 10^8", "c) 10^-15", "d) 10^-2"], resposta: "a) 10^2. 10^(5-3) = 10^2" },
    { enunciado: "A massa da Terra é 5,972 × 10^24 kg. Quanto é 1/10 dessa massa?", alternativas: [], resposta: "5,972 × 10^23 kg" },
    { enunciado: "Escreva 0,000045 em notação científica.", alternativas: ["a) 4,5 × 10^-5", "b) 45 × 10^-6", "c) 4,5 × 10^5", "d) 0,45 × 10^-4"], resposta: "a) 4,5 × 10^-5" },
  ];
  const { avisos, material } = conferirGabarito({ exercicios: exs });
  assert.deepEqual(avisos, []);
  assert.deepEqual(material.exercicios.map((e) => e.resposta), exs.map((e) => e.resposta));
});

test("cálculo do enunciado corrige a letra mesmo sem resolução", () => {
  const r = conferirExercicio({ enunciado: "Calcule 10^5 × 10^-3.", alternativas: ["a) 10^2", "b) 10^8", "c) 10^-15", "d) 10^-2"], resposta: "b) 10^8" }, 4);
  assert.match(r.exercicio.resposta, /^a\) 10\^2/);
  assert.equal(r.aviso.tipo, "corrigido");
});

test("explicação divergente do cálculo gera aviso", () => {
  const r = conferirExercicio({ enunciado: "Calcule 3^4.", alternativas: ["a) 12", "b) 64", "c) 81", "d) 27"], resposta: "c) 81. Pois 3 × 4 = 12" }, 1);
  assert.equal(r.aviso.tipo, "conferir");
  assert.match(r.aviso.motivo, /explicação chega a 12/);
});

test("questão aberta com resposta errada gera aviso", () => {
  const r = conferirExercicio({ enunciado: "Calcule 3^4.", alternativas: [], resposta: "64" }, 1);
  assert.equal(r.aviso.tipo, "conferir");
});

test("notação científica: 'N = a × 10^n' vira 'N × 10^n' com 1 ≤ N < 10", () => {
  const { material, avisos } = conferirNotacao({ formulas: [{ nome: "Notação científica", expressao: "N = a × 10^n", descricao: "Representa números grandes" }] });
  assert.equal(material.formulas[0].expressao, "N × 10^n");
  assert.match(material.formulas[0].descricao, /1 ≤ N < 10 e n inteiro/);
  assert.equal(avisos.length, 1);
  const ok = conferirNotacao({ formulas: [{ nome: "Notação científica", expressao: "N × 10^n", descricao: "1 ≤ N < 10" }] });
  assert.equal(ok.avisos.length, 0);
});
