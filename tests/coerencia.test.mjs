import { test } from "node:test";
import assert from "node:assert/strict";
import { conferirCoerencia } from "../lib/coerencia.js";

const ex = (n) => Array.from({ length: n }, () => ({ enunciado: "x", alternativas: [], resposta: "y" }));

test("EF89EF09 com Ensino Médio é apontado", () => {
  const a = conferirCoerencia({ nivel: "Ensino Médio", bncc: "EF89EF09" }, { exercicios: ex(5) });
  assert.equal(a.length, 1);
  assert.match(a[0].motivo, /Ensino Fundamental/);
});
test("código da etapa certa não gera aviso", () => {
  assert.equal(conferirCoerencia({ nivel: "Ensino Fundamental", bncc: "EF06MA03" }, { exercicios: ex(5) }).length, 0);
  assert.equal(conferirCoerencia({ nivel: "Ensino Médio" }, { bncc: { codigo: "EM13MAT101" }, exercicios: ex(5) }).length, 0);
  assert.equal(conferirCoerencia({ nivel: "EJA", bncc: "EF06MA03" }, { exercicios: ex(5) }).length, 0);
});
test("menos de 3 exercícios é apontado", () => {
  assert.equal(conferirCoerencia({}, { exercicios: ex(1) })[0].onde, "Exercícios");
});
