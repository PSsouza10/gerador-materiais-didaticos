// Plano de aula (Currículo Paulista): pedido, normalização e texto
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarPedidoPlano, montarPromptPlano, normalizarPlano, problemasDoPlano, planoParaTexto } from "../lib/planoAula.js";
import { PLANO_SIMULADO, respostaSimulada } from "../lib/iaSimulada.js";

const base = { disciplina: "Matemática", nivel: "Ensino Fundamental", ano: "7", tema: "Volume", aulas: 2, bncc: "EF07MA30" };

test("pedido: obrigatórios, aulas permitidas e BNCC de outra etapa bloqueada", () => {
  assert.equal(validarPedidoPlano({ ...base, tema: "" }).ok, false);
  assert.equal(validarPedidoPlano({ ...base, aulas: 99 }).dados.aulas, 2, "valor fora da lista vira o padrão");
  const r = validarPedidoPlano({ ...base, nivel: "Ensino Médio", bncc: "EF89EF09" });
  assert.equal(r.ok, false);
  assert.match(r.erro, /Ensino Fundamental.*Ensino Médio/);
  assert.equal(validarPedidoPlano(base).ok, true);
});

test("prompt pede o formato do Currículo Paulista e o número exato de aulas", () => {
  const p = montarPromptPlano(validarPedidoPlano({ ...base, aulas: 3 }).dados, "EF07MA30 — texto oficial");
  assert.match(p, /Currículo Paulista/);
  assert.match(p, /exatamente 3 aula/);
  assert.match(p, /"plano_de_aula"/);
  assert.match(p, /Não escreva nomes de alunos/);
  assert.equal(respostaSimulada(p), PLANO_SIMULADO);
});

test("normalização: aulas renumeradas, habilidade oficial no lugar da inventada, no máximo N aulas", () => {
  const d = validarPedidoPlano({ ...base, aulas: 2 }).dados;
  const json = { plano_de_aula: { ...PLANO_SIMULADO.plano_de_aula, habilidades: [{ codigo: "EM13MAT999", descricao: "inventada" }], aulas: [{ numero: 7, desenvolvimento: "a" }, { numero: 9, desenvolvimento: "b" }, { numero: 3, desenvolvimento: "c" }] } };
  const pl = normalizarPlano(json, d, { c: "EF07MA30", t: "Resolver e elaborar problemas de cálculo de volume" });
  assert.deepEqual(pl.aulas.map((a) => a.numero), [1, 2]);
  assert.deepEqual(pl.habilidades, [{ codigo: "EF07MA30", descricao: "Resolver e elaborar problemas de cálculo de volume" }]);
  assert.deepEqual(problemasDoPlano(pl, d), []);
});

test("sem habilidade informada: código da IA de outra etapa é descartado", () => {
  const d = validarPedidoPlano({ ...base, bncc: "" }).dados;
  const pl = normalizarPlano({ plano_de_aula: { habilidades: [{ codigo: "EM13MAT101", descricao: "x" }, { codigo: "EF07MA30", descricao: "y" }], aulas: [], objetivos: [] } }, d);
  assert.deepEqual(pl.habilidades.map((h) => h.codigo), ["EF07MA30"]);
  assert.ok(problemasDoPlano(pl, d).length > 0, "plano vazio é apontado");
});

test("texto para copiar tem todas as seções", () => {
  const d = validarPedidoPlano({ ...base, professor: "Prof. Teste", turma: "7º B" }).dados;
  const t = planoParaTexto(normalizarPlano(PLANO_SIMULADO, d));
  for (const s of ["PLANO DE AULA", "Professor(a): Prof. Teste", "UNIDADE TEMÁTICA", "HABILIDADE", "OBJETIVOS", "Aula 1", "Aula 2", "RECURSOS", "AVALIAÇÃO", "RECUPERAÇÃO CONTÍNUA"]) assert.ok(t.includes(s), s);
});
