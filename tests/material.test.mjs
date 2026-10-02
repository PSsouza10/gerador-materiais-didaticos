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
