import { test } from "node:test";
import assert from "node:assert/strict";
import { linhasResposta } from "../lib/material.js";

test("linhas de resposta conforme o tipo da questão", () => {
  assert.equal(linhasResposta("Cite um exemplo de sólido."), 4);
  assert.equal(linhasResposta("Calcule o volume do cubo."), 5);
  assert.equal(linhasResposta("Explique a diferença entre volume e capacidade."), 6);
  assert.equal(linhasResposta("Justifique sua resposta."), 6);
});

test("enunciado longo ganha mais linhas, com teto", () => {
  const longo = "Explique " + "texto ".repeat(80);
  assert.ok(linhasResposta(longo) > 6);
  assert.ok(linhasResposta("Explique " + "x".repeat(5000)) <= 9);
  assert.equal(linhasResposta(), 4);
});

test("tema visual: só 'premium' passa; o resto vira 'padrao'", async () => {
  const { normalizarMaterial } = await import("../lib/material.js");
  assert.equal(normalizarMaterial({ tema: "premium" }).tema, "premium");
  assert.equal(normalizarMaterial({ tema: "qualquer" }).tema, "padrao");
  assert.equal(normalizarMaterial({}).tema, "padrao");
});

test("gabarito não repete a mesma frase (resposta + resolução)", async () => {
  const { juntarResposta, semFrasesRepetidas } = await import("../lib/material.js");
  assert.equal(
    juntarResposta("Não. 6 × 7 = 42.", "6 × 7 = 42. Portanto, ele errou: o produto é 42."),
    "Não. 6 × 7 = 42. Portanto, ele errou: o produto é 42."
  );
  // frases diferentes continuam
  assert.equal(semFrasesRepetidas("3 × 4 = 12. 4 × 3 = 12."), "3 × 4 = 12. 4 × 3 = 12.");
  assert.equal(juntarResposta("c) 36", "3 × 12 = 36. Portanto, são 36 figurinhas."), "c) 36. 3 × 12 = 36. Portanto, são 36 figurinhas.");
});
