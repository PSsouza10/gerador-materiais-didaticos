import test from "node:test";
import assert from "node:assert/strict";
import { escalaParaUmaPagina } from "../lib/pdf.js";

test("escala de lista não amplia conteúdo que já cabe na área útil A4", () => {
  assert.equal(escalaParaUmaPagina(500), 1);
});

test("escala de lista reduz proporcionalmente o conteúdo que excede uma página", () => {
  const escala = escalaParaUmaPagina(2000);
  assert.ok(escala > 0 && escala < 1);
  assert.ok(2000 * escala <= (297 - 30) * (793.7 / 210));
});

test("escala de lista volta a 1 para alturas ausentes ou inválidas", () => {
  assert.equal(escalaParaUmaPagina(0), 1);
  assert.equal(escalaParaUmaPagina(Number.NaN), 1);
});
