import { test } from "node:test";
import assert from "node:assert/strict";
import { linhasResposta } from "../lib/material.js";

test("linhas de resposta conforme o tipo da questão", () => {
  assert.equal(linhasResposta("Cite um exemplo de sólido."), 3);
  assert.equal(linhasResposta("Calcule o volume do cubo."), 4);
  assert.equal(linhasResposta("Explique a diferença entre volume e capacidade."), 5);
  assert.equal(linhasResposta("Justifique sua resposta."), 5);
});

test("enunciado longo ganha mais linhas, com teto", () => {
  const longo = "Explique " + "texto ".repeat(80);
  assert.ok(linhasResposta(longo) > 5);
  assert.ok(linhasResposta("Explique " + "x".repeat(5000)) <= 8);
  assert.equal(linhasResposta(), 3);
});
