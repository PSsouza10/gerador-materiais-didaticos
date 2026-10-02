import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarCena, elencoDaCena, normalizarFala } from "../lib/cena.js";
import { normalizarMaterial } from "../lib/material.js";

test("cena válida é limpa: personagem desconhecido sai, lugar inválido vira casa", () => {
  const c = normalizarCena({
    titulo: "Na feira",
    lugar: "shopping",
    falas: [
      { quem: "lia", texto: "Quanto custa meio quilo?" },
      { quem: "zezinho", texto: "não existe" },
      { quem: "vo", texto: "Metade do preço do quilo!" },
    ],
    figura: { tipo: "fracao", forma: "barra", partes: 2, pintadas: 1 },
    pergunta: "E um quarto de quilo?",
  });
  assert.equal(c.lugar, "casa");
  assert.deepEqual(c.falas.map((f) => f.quem), ["lia", "vo"]);
  assert.equal(c.figura.tipo, "fracao");
  assert.deepEqual(elencoDaCena(c), ["lia", "vo"]);
});

test("cena com menos de 2 falas não aparece", () => {
  assert.equal(normalizarCena({ falas: [{ quem: "lia", texto: "oi" }] }), null);
  assert.equal(normalizarCena(null), null);
});

test("normalizarMaterial leva a cena para a folha", () => {
  const m = normalizarMaterial({ cena: { lugar: "escola", falas: [{ quem: "edu", texto: "A" }, { quem: "theo", texto: "B" }] } });
  assert.equal(m.cena.lugar, "escola");
  assert.equal(normalizarMaterial({}).cena, null);
});

test("fala do exercício: personagem válido e texto obrigatório", () => {
  assert.deepEqual(normalizarFala({ quem: "theo", texto: " Acho que é 15! " }), { quem: "theo", texto: "Acho que é 15!" });
  assert.equal(normalizarFala({ quem: "fulano", texto: "oi" }), null);
  assert.equal(normalizarFala({ quem: "lia", texto: "" }), null);
  const m = normalizarMaterial({ exercicios: [{ enunciado: "A", fala: { quem: "vo", texto: "Na feira..." } }, { enunciado: "B" }] });
  assert.equal(m.exercicios[0].fala.quem, "vo");
  assert.equal(m.exercicios[1].fala, null);
});
