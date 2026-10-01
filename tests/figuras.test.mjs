import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarFigura, citaFigura, rotuloReta } from "../lib/figuras.js";
import { normalizarMaterial } from "../lib/material.js";
import { conferirCoerencia } from "../lib/coerencia.js";

test("reta numérica limpa e rótulos em fração", () => {
  const f = normalizarFigura({ tipo: "reta", inicio: 0, fim: 1, divisoes: "4", marcar: 9, rotulos: "todos" });
  assert.equal(f.divisoes, 4);
  assert.equal(f.marcar, 4); // limitado ao último tracinho
  assert.equal(rotuloReta(f, 1), "1/4");
  assert.equal(rotuloReta({ inicio: 0, fim: 10, divisoes: 4 }, 1), "2,5");
});
test("tipos inválidos ou vazios viram null", () => {
  assert.equal(normalizarFigura({ tipo: "imagem" }), null);
  assert.equal(normalizarFigura({ tipo: "tabela", cabecalho: ["a"], linhas: [] }), null);
  assert.equal(normalizarFigura({ tipo: "reta", inicio: 1, fim: 0 }), null);
});
test("fração pintada nunca passa do total", () => {
  assert.deepEqual(normalizarFigura({ tipo: "fracao", partes: 5, pintadas: 9 }), { tipo: "fracao", forma: "barra", partes: 5, pintadas: 5, legenda: "" });
});
test("figura chega ao material normalizado", () => {
  const m = normalizarMaterial({ exercicios: [{ enunciado: "Que fração da barra está pintada?", alternativas: [], resposta: "1/5", figura: { tipo: "fracao", partes: 5, pintadas: 1 } }] });
  assert.equal(m.exercicios[0].figura.partes, 5);
  assert.equal(m.figuraExplicativa, null);
});
test("enunciado que cita figura sem figura gera aviso (caso EF04MA09)", () => {
  assert.ok(citaFigura("Localize 1/2 na reta numérica de 0 a 1"));
  assert.ok(!citaFigura("Calcule 3 + 4."));
  const ex = (figura) => ({ enunciado: "Qual fração representa a parte colorida da figura?", alternativas: [], resposta: "1/5", figura });
  const sem = conferirCoerencia({}, { exercicios: [ex(null), ex(null), ex(null)] });
  assert.equal(sem.filter((a) => a.onde.startsWith("Exercício")).length, 3);
  const com = conferirCoerencia({}, { exercicios: [1, 2, 3].map(() => ex({ tipo: "fracao", partes: 5, pintadas: 1 })) });
  assert.equal(com.length, 0);
});
