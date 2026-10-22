import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { montarProvaPaulista, exemploDaHabilidade, slugCodigo, linkGerador, rotuloAnosDaHabilidade, perguntasProvaPaulista } from "../lib/provaPaulistaSeo.js";
import { conferirItem } from "../lib/avaliacao.js";

const bncc = JSON.parse(readFileSync(new URL("../data/bncc-habilidades.json", import.meta.url)));
const P = montarProvaPaulista(bncc.habilidades);

test("uma página por habilidade da BNCC e uma por componente × ano", () => {
  const caminhos = P.caminhos();
  assert.equal(new Set(caminhos).size, caminhos.length, "sem endereço repetido");
  assert.equal(caminhos.filter((c) => c.startsWith("/bncc/")).length, bncc.habilidades.length);
  assert.ok(P.combos.length >= 80);
  assert.ok(caminhos.includes("/prova-paulista/matematica/7-ano"));
  assert.equal(P.resolverHabilidade("EF07MA32").c, "EF07MA32");
  assert.equal(P.resolverHabilidade("ef07ma32").c, "EF07MA32");
  assert.equal(P.resolverHabilidade("xx"), null);
  assert.equal(slugCodigo("EF67LP01"), "ef67lp01");
});

test("questão de exemplo só quando a habilidade fala do assunto, e sempre conferida", () => {
  assert.equal(exemploDaHabilidade(P.resolverHabilidade("EF01MA02")), null, "contagem do 1º ano não ganha questão de volume");
  assert.equal(exemploDaHabilidade(P.resolverHabilidade("EF01LP01")), null, "Português não ganha questão de Matemática");
  const q = exemploDaHabilidade(P.resolverHabilidade("EF07MA32"));
  assert.ok(q, "área do 7º ano tem exemplo");
  const todos = bncc.habilidades.map((h) => [h, exemploDaHabilidade(h)]).filter(([, q]) => q);
  assert.ok(todos.length > 30);
  for (const [h, q] of todos) {
    const c = conferirItem(q, 1).item;
    assert.deepEqual(c.problemas, [], `${h.c}: ${c.problemas}`);
    assert.equal(c.correta, q.correta, h.c);
  }
});

test("link para o gerador e textos", () => {
  assert.equal(linkGerador({ aba: "prova", codigo: "EF07MA32", disciplina: "Matemática", ano: "7" }), "/criar?aba=prova&bncc=EF07MA32&disciplina=Matem%C3%A1tica&ano=7");
  assert.equal(rotuloAnosDaHabilidade({ e: "EF", a: "8, 9" }), "8º e 9º ano do Ensino Fundamental");
  assert.equal(rotuloAnosDaHabilidade({ e: "EM", a: "" }), "Ensino Médio");
  const faq = perguntasProvaPaulista("Português", { rotulo: "5º ano" });
  assert.match(faq[0].q, /Língua Portuguesa do 5º ano/);
  assert.ok(!faq.some((f) => /não estão à venda/.test(f.a)));
});
