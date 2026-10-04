// Problemas da apostila real "Desvendando os Verbos" (Português, 6º ano, EF06LP04)
import test from "node:test";
import assert from "node:assert/strict";
import { falaEntregaResposta, conferirQualidade } from "../lib/qualidade.js";
import { normalizarMaterial } from "../lib/material.js";
import { figurasObrigatorias } from "../lib/figuras.js";
import { auditarMaterial } from "../lib/auditoria.js";

test("fala que já mostra a forma pedida no completar é apontada", () => {
  const e = { fala: { quem: "edu", texto: "Se você estudar, talvez entenda melhor." }, enunciado: "Complete: 'Se você ____ (estuda/estudar), talvez entenda melhor.'", resposta: "estudar" };
  assert.equal(falaEntregaResposta(e), true);
  const avisos = conferirQualidade({ exercicios: [e] });
  assert.ok(avisos.some((a) => a.onde === "Exercício 1" && /mostra a resposta/.test(a.motivo)));
});

test("fala que confirma a alternativa certa é apontada; fala neutra não", () => {
  assert.equal(falaEntregaResposta({ fala: { quem: "theo", texto: "O verbo 'olhar' está no Indicativo?" }, resposta: "b) Indicativo" }), true);
  assert.equal(falaEntregaResposta({ fala: { quem: "vo", texto: "Ao cozinhar, sempre digo: 'Lave as mãos!'." }, resposta: "c) Imperativo" }), false);
});

test("Matemática: personagem com a conta errada não conta como resposta entregue", () => {
  assert.equal(falaEntregaResposta({ fala: { quem: "theo", texto: "Comprei 3 pacotes com 12 figurinhas. Acho que tenho 15!" }, resposta: "36 figurinhas. Portanto, o Théo errou." }), false);
  assert.equal(falaEntregaResposta({ fala: { quem: "lia", texto: "Sim, eu acho que sim." }, resposta: "Sim" }), false);
});

test("nome do personagem fica igual em toda a apostila (Théo)", () => {
  const m = normalizarMaterial({ resumoPedagogico: "Theo e Lia na feira.", exercicios: [{ enunciado: "Ajude o Theo: ...", fala: { quem: "theo", texto: "Theo aqui" } }] });
  assert.equal(m.resumoPedagogico, "Théo e Lia na feira.");
  assert.equal(m.exercicios[0].enunciado, "Ajude o Théo: ...");
  assert.equal(m.exercicios[0].fala.quem, "theo");
});

test("figura obrigatória em 2 exercícios só fora de Linguagens", () => {
  assert.equal(figurasObrigatorias("Matemática"), true);
  assert.equal(figurasObrigatorias("História"), true);
  assert.equal(figurasObrigatorias("Português"), false);
  assert.equal(figurasObrigatorias("Língua Inglesa"), false);
  assert.equal(figurasObrigatorias("Arte"), false);
  const ex = Array.from({ length: 5 }, (_, i) => ({ enunciado: `Questão ${i + 1}`, resposta: "ok" }));
  const material = { tituloDidatico: "T", resumoPedagogico: "R", conceitos: [{ termo: "a", definicao: "b" }], exercicios: ex };
  const pt = auditarMaterial({ disciplina: "Português", questoes: 5 }, material);
  const ma = auditarMaterial({ disciplina: "Matemática", questoes: 5 }, material);
  assert.ok(!pt.problemas.some((p) => p.onde === "Figuras"));
  assert.ok(ma.problemas.some((p) => p.onde === "Figuras"));
});
