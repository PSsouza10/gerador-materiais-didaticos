import { test } from "node:test";
import assert from "node:assert/strict";
import { valorNumerico, letraMarcada, resultadoFinal, conferirExercicio, conferirGabarito } from "../lib/gabarito.js";
import { partesComExpoentes } from "../lib/expoentes.js";

const alts = ["a) 125", "b) 625", "c) 25", "d) 3125"];

test("caso real: IA calculou 3125 e marcou b) 625 → corrige para d)", () => {
  const ex = { enunciado: "Calcule (5^2) × (5^3).", alternativas: alts, resposta: "b) 625. Pois 5^2 × 5^3 = 5^(2+3) = 5^5 = 3125." };
  const r = conferirExercicio(ex, 5);
  assert.match(r.exercicio.resposta, /^d\) 3125\. Pois/);
  assert.match(r.aviso.motivo, /corrigido automaticamente para d\) 3125/);
});

test("gabarito certo não é alterado", () => {
  for (const [a, resp] of [
    [["a) 12", "b) 64", "c) 81", "d) 27"], "c) 81. Pois 3 × 3 × 3 × 3 = 81."],
    [["a) 64", "b) 16", "c) 32", "d) 8"], "a) 64. Pois (2^3)^2 = 2^(3×2) = 2^6 = 64."],
  ]) {
    const r = conferirExercicio({ enunciado: "x", alternativas: a, resposta: resp }, 1);
    assert.equal(r.aviso, null);
    assert.equal(r.exercicio.resposta, resp);
  }
});

test("resultado que não bate com nenhuma alternativa só gera aviso", () => {
  const r = conferirExercicio({ enunciado: "x", alternativas: alts, resposta: "a) 125. Pois 5 × 5 × 5 × 5 = 600." }, 2);
  assert.equal(r.exercicio.resposta, "a) 125. Pois 5 × 5 × 5 × 5 = 600.");
  assert.match(r.aviso.motivo, /confira/);
});

test("alternativas com texto (não numéricas) não são mexidas", () => {
  const r = conferirExercicio({ enunciado: "x", alternativas: ["a) Triângulo equilátero", "b) Quadrado perfeito"], resposta: "a) Triângulo = 3 lados" }, 1);
  assert.equal(r.aviso, null);
});

test("usa o campo resolucao quando existe", () => {
  const r = conferirExercicio({ enunciado: "x", alternativas: ["a) 6 L", "b) 60 L", "c) 600 L", "d) 6000 L"], resolucao: "50 × 30 × 40 = 60 000 cm³ = 60 L", resposta: "c) 600 L" }, 1);
  assert.match(r.exercicio.resposta, /^b\) 60 L/);
});

test("números: milhar, decimal, científica e sobrescritos", () => {
  assert.equal(valorNumerico("3 125"), 3125);
  assert.equal(valorNumerico("3.125"), 3125);
  assert.equal(valorNumerico("0,5"), 0.5);
  assert.ok(Math.abs(valorNumerico("1,67 × 10^-26 kg") - 1.67e-26) < 1e-35);
  assert.ok(Math.abs(valorNumerico("5,2 × 10⁻⁴") - 5.2e-4) < 1e-12);
  assert.equal(valorNumerico("2^6"), null);
  assert.equal(letraMarcada("Alternativa c"), "c");
  assert.equal(resultadoFinal("5^5 = 3125."), 3125);
});

test("conferirGabarito junta os avisos", () => {
  const { material, avisos } = conferirGabarito({ exercicios: [{ enunciado: "x", alternativas: alts, resposta: "b) 625. 5^5 = 3125" }] });
  assert.equal(avisos.length, 1);
  assert.match(material.exercicios[0].resposta, /^d\)/);
});

test("expoentes: 3^4 → 3⁴ e 10^-27 → 10⁻²⁷; complexos viram sup", () => {
  assert.deepEqual(partesComExpoentes("Calcule 3^4."), [{ tipo: "texto", valor: "Calcule 3⁴." }]);
  assert.equal(partesComExpoentes("1,67 × 10^-27 kg")[0].valor, "1,67 × 10⁻²⁷ kg");
  assert.deepEqual(partesComExpoentes("a^(m+n)"), [{ tipo: "texto", valor: "a" }, { tipo: "sup", valor: "m+n" }]);
});
