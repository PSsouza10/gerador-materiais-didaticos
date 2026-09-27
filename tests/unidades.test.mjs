import test from "node:test";
import assert from "node:assert/strict";
import { verificarTexto, verificarUnidades } from "../lib/unidades.js";

test("aponta o erro relatado na revisão: área em dm³", () => {
  const p = verificarTexto("c) 27 dm³ — V = 3 × 3 × 3 = 27 dm³ (9 dm³ seria a área de uma face).");
  assert.equal(p.length, 1);
  assert.match(p[0].motivo, /área com unidade de volume/);
});

test("aceita a versão corrigida em dm²", () => {
  assert.deepEqual(verificarTexto("c) 27 dm³ — V = 3 × 3 × 3 = 27 dm³ (9 dm² seria a área de uma face)."), []);
});

test("aponta volume em unidade quadrada", () => {
  assert.equal(verificarTexto("O volume da caixa é 24 cm².").length, 1);
  assert.equal(verificarTexto("A capacidade do tanque é de 3 metros quadrados.").length, 1);
});

test("aponta área em litros e perímetro em cm²", () => {
  assert.equal(verificarTexto("A área do terreno mede 40 litros.").length, 1);
  assert.equal(verificarTexto("O perímetro do quadrado é 16 cm².").length, 1);
});

test("não acusa usos corretos nem relações legítimas", () => {
  for (const ok of [
    "A área do retângulo é 12 cm².",
    "O volume do cubo é 27 dm³, ou seja, 27 L.",
    "V = área da base × altura = 12 cm² × 5 cm = 60 cm³.",
    "O perímetro mede 16 cm.",
    "Converta 1 dm³ = 1 L = 1000 cm³.",
    "Frações representam partes de um todo.",
  ]) {
    assert.deepEqual(verificarTexto(ok), [], ok);
  }
});

test("percorre o material inteiro e indica onde está o problema", () => {
  const alertas = verificarUnidades({
    conceitos: [{ termo: "Área", definicao: "Medida da superfície, em cm²." }],
    exercicios: [{ enunciado: "Calcule a área.", alternativas: [], resposta: "A área é 9 m³." }],
  });
  assert.equal(alertas.length, 1);
  assert.equal(alertas[0].onde, "Gabarito do exercício 1");
});
