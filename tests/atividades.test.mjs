import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { montarAtividades, slugDisciplina, perguntasDoCombo, ANOS } from "../lib/atividades.js";

const dados = JSON.parse(readFileSync(new URL("../data/bncc-habilidades.json", import.meta.url)));
const A = montarAtividades(dados.habilidades);

test("slugs sem acento e sem espaço", () => {
  assert.equal(slugDisciplina("Matemática"), "matematica");
  assert.equal(slugDisciplina("Educação Física"), "educacao-fisica");
  assert.equal(slugDisciplina("Língua Inglesa"), "lingua-inglesa");
});

test("só Ensino Fundamental, 1º ao 9º ano", () => {
  assert.deepEqual(ANOS.map((a) => a.slug), ["1-ano", "2-ano", "3-ano", "4-ano", "5-ano", "6-ano", "7-ano", "8-ano", "9-ano"]);
});

test("toda página tem habilidades reais do componente e do ano", () => {
  assert.ok(A.combos.length >= 50);
  for (const c of A.combos) {
    assert.ok(c.habilidades.length > 0);
    for (const h of c.habilidades) assert.ok(h.a.split(/\s*,\s*/).includes(c.ano.valor), `${h.c} no ${c.ano.rotulo}`);
  }
  const mat7 = A.resolverCombo("matematica", "7-ano");
  assert.ok(mat7.habilidades.length > 0 && mat7.habilidades.every((h) => /^EF\d+MA/.test(h.c)), "só Matemática");
});

test("combinação inexistente não vira página", () => {
  assert.equal(A.resolverCombo("matematica", "99-ano"), null);
  assert.equal(A.resolverCombo("lingua-inglesa", "1-ano"), null); // inglês só a partir do 6º ano na BNCC
  assert.equal(A.resolverDisciplina("fisica"), null);
});

test("caminhos: hub, uma por disciplina e uma por combinação, sem repetição", () => {
  const c = A.caminhos();
  assert.equal(new Set(c).size, c.length);
  assert.equal(c.length, 1 + A.disciplinas.length + A.combos.length);
  for (const d of A.disciplinas) assert.ok(c.includes(`/atividades/${d.slug}`), d.slug);
});

test("perguntas frequentes: não prometem o que o site não faz", () => {
  const txt = perguntasDoCombo("Matemática", ANOS[6]).map((f) => f.q + " " + f.a).join(" ");
  assert.match(txt, /7º ano/);
  assert.match(txt, /nenhuma cobrança/);
  assert.doesNotMatch(txt, /ilimitad|garant|100%/i);
});
