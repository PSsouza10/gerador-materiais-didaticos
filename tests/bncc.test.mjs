// Testes automatizados da busca/validação BNCC (node --test)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { indexar, resolverCodigo, variantesCodigo, buscarHabilidades, cobreAno, daDisciplina } from "../lib/bncc.js";

const dados = JSON.parse(readFileSync(new URL("../data/bncc-habilidades.json", import.meta.url)));
const lista = dados.habilidades;
const mapa = indexar(lista);

test("códigos com zero à esquerda são reconhecidos como digitados", () => {
  for (const c of ["EF07MA30", "EF06MA07", "EF01LP01", "EF08MA02", "EF09MA19"]) {
    assert.equal(resolverCodigo(mapa, c)?.c, c, c);
  }
});

test("minúsculas, espaços e hífens são aceitos", () => {
  assert.equal(resolverCodigo(mapa, " ef07ma30 ")?.c, "EF07MA30");
  assert.equal(resolverCodigo(mapa, "EF-07-MA-30")?.c, "EF07MA30");
});

test("zero do ano omitido é corrigido (EF7MA30 → EF07MA30)", () => {
  assert.equal(resolverCodigo(mapa, "EF7MA30")?.c, "EF07MA30");
  assert.equal(resolverCodigo(mapa, "ef6ma07")?.c, "EF06MA07");
});

test("letra O no lugar do zero é corrigida", () => {
  assert.equal(resolverCodigo(mapa, "EFO7MA30")?.c, "EF07MA30");
});

test("código incompleto durante a digitação não vira outro código", () => {
  for (const parcial of ["E", "EF", "EF0", "EF07", "EF07M", "EF07MA", "EF07MA3"]) {
    assert.equal(resolverCodigo(mapa, parcial), null, parcial);
  }
  assert.deepEqual(variantesCodigo("EF07MA3"), ["EF07MA3"]);
});

test("códigos do Ensino Médio e da Computação", () => {
  const em = lista.find((h) => h.e === "EM");
  assert.equal(resolverCodigo(mapa, em.c.toLowerCase())?.c, em.c);
  const co = lista.find((h) => h.d === "Computação");
  assert.equal(resolverCodigo(mapa, co.c)?.c, co.c);
});

test("código inexistente retorna null", () => {
  assert.equal(resolverCodigo(mapa, "EF07MA99"), null);
  assert.equal(resolverCodigo(mapa, "SP07MA01"), null);
});

test("busca por palavra prioriza a disciplina e limita outras áreas", () => {
  const r = buscarHabilidades(lista, "volume", { disciplina: "Matemática", nivel: "Ensino Fundamental" });
  assert.ok(r.some((h) => h.c === "EF07MA30"), "EF07MA30 aparece");
  const idxOutra = r.findIndex((h) => !daDisciplina(h, "Matemática"));
  if (idxOutra !== -1) {
    assert.ok(r.slice(idxOutra).every((h) => !daDisciplina(h, "Matemática")), "outras áreas vêm depois");
    assert.ok(r.length - idxOutra <= 5, "no máximo 5 de outras áreas");
  }
});

test("ano selecionado sobe as habilidades daquele ano", () => {
  const r = buscarHabilidades(lista, "volume", { disciplina: "Matemática", nivel: "Ensino Fundamental", ano: "7" });
  assert.equal(r[0].c, "EF07MA30");
  assert.equal(cobreAno(mapa.get("EF07MA30"), "7"), true);
  assert.equal(cobreAno(mapa.get("EF07MA30"), "8"), false);
});

test("busca por prefixo com zero omitido", () => {
  const r = buscarHabilidades(lista, "EF7MA3", { disciplina: "Matemática" });
  assert.ok(r.length === 0 || r.every((h) => h.c.startsWith("EF")));
  const r2 = buscarHabilidades(lista, "EF07MA3", { disciplina: "Matemática" });
  assert.ok(r2.some((h) => h.c === "EF07MA30"));
});
