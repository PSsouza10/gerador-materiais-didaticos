// Fase 0 · migrações reversíveis e só no banco de teste
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { listarMigracoes, instrucoes, podeMigrar, planejar } from "../lib/migracoes.js";
import { APOSTILA_SIMULADA, respostaSimulada } from "../lib/iaSimulada.js";
import { normalizarMaterial } from "../lib/material.js";
import { auditarMaterial } from "../lib/auditoria.js";

const PASTA = new URL("../db/migracoes", import.meta.url).pathname;
const URL_TESTE = "postgresql://u:s@ep-teste.neon.tech/edugera_teste";

test("toda migração tem o arquivo .down que desfaz o que o .up cria", () => {
  const ms = listarMigracoes(PASTA);
  assert.ok(ms.length >= 1);
  for (const m of ms) {
    assert.ok(m.down, `${m.nome} sem .down.sql`);
    const up = readFileSync(m.up, "utf8");
    const down = readFileSync(m.down, "utf8");
    const criadas = [...up.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map((x) => x[1]);
    for (const t of criadas) assert.match(down, new RegExp(`DROP TABLE IF EXISTS ${t}\\b`), `${m.nome}: o down não remove ${t}`);
  }
});

test("migrações não apagam nem alteram dados existentes (só criam)", () => {
  for (const m of listarMigracoes(PASTA)) {
    const up = readFileSync(m.up, "utf8").replace(/^\s*--.*$/gm, "");
    assert.doesNotMatch(up, /\b(DROP|DELETE|TRUNCATE|UPDATE|ALTER\s+TABLE\s+\w+\s+DROP)\b/i, m.nome);
  }
});

test("divide o SQL em instruções e ignora comentários", () => {
  assert.deepEqual(instrucoes("-- oi\nCREATE TABLE a (x int);\nINSERT INTO a VALUES (1);\n"), ["CREATE TABLE a (x int)", "INSERT INTO a VALUES (1)"]);
});

test("migrar: recusado em produção e sem banco de teste; liberado só no teste", () => {
  assert.equal(podeMigrar({ VERCEL_ENV: "production", DATABASE_URL_TESTE: URL_TESTE }).ok, false);
  assert.equal(podeMigrar({ VERCEL_ENV: "preview" }).ok, false);
  assert.equal(podeMigrar({ VERCEL_ENV: "preview", DATABASE_URL_TESTE: URL_TESTE }).ok, true);
});

test("down desfaz só a última aplicada; up aplica só as que faltam", () => {
  const todas = [{ nome: "0001_a" }, { nome: "0002_b" }];
  assert.deepEqual(planejar(todas, ["0001_a"], "up").map((m) => m.nome), ["0002_b"]);
  assert.deepEqual(planejar(todas, ["0001_a", "0002_b"], "down").map((m) => m.nome), ["0002_b"]);
  assert.deepEqual(planejar(todas, [], "down"), []);
});

test("apostila simulada é válida, marcada como [TESTE] e sem erro nas conferências", () => {
  const m = normalizarMaterial(APOSTILA_SIMULADA, "teste");
  assert.match(m.tituloDidatico, /^\[TESTE\]/);
  assert.equal(m.exercicios.length, 5);
  assert.equal(auditarMaterial({ disciplina: "Matemática", nivel: "Ensino Fundamental", ano: "3", questoes: 5 }, m).erros, 0);
  assert.deepEqual(respostaSimulada('{ "apontamentos": [] }'), { apontamentos: [] });
  assert.match(respostaSimulada("Reescreva UM exercício").enunciado, /lápis/);
});
