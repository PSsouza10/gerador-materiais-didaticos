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

test("pedido: ano e disciplina do código BNCC (antes de gerar)", async () => {
  const { conferirPedido, anosDoCodigo } = await import("../lib/coerencia.js");
  assert.deepEqual(anosDoCodigo("EF06MA03"), [6]);
  assert.deepEqual(anosDoCodigo("EF69AR01"), [6, 7, 8, 9]);
  assert.deepEqual(anosDoCodigo("EF15AR04"), [1, 2, 3, 4, 5]);
  const F = { nivel: "Ensino Fundamental" };
  assert.equal(conferirPedido({ ...F, ano: "6", disciplina: "Matemática", bncc: "EF06MA03" }).length, 0);
  assert.match(conferirPedido({ ...F, ano: "8", disciplina: "Matemática", bncc: "EF06MA03" })[0].motivo, /6º ano, mas o ano escolhido é o 8º/);
  assert.match(conferirPedido({ ...F, ano: "6", disciplina: "Ciências", bncc: "EF06MA03" })[0].motivo, /de Matemática, mas a disciplina escolhida é Ciências/);
  assert.equal(conferirPedido({ ...F, ano: "7", disciplina: "Arte", bncc: "EF69AR01" }).length, 0);
  assert.equal(conferirPedido({ nivel: "Ensino Médio", ano: "EM1", disciplina: "História", bncc: "EM13CHS101" }).length, 0);
  assert.equal(conferirPedido({ ...F, ano: "", disciplina: "Matemática", bncc: "EF06MA03" }).length, 0); // ano não escolhido
});
