import { test } from "node:test";
import assert from "node:assert/strict";
import { DISCIPLINAS } from "../lib/opcoes.js";
import { DISCIPLINA_PARA_COMPONENTE } from "../lib/bncc.js";
import { regraLinguaEstrangeira, ehEspanhol } from "../lib/linguas.js";
import { blocoEspecialista } from "../lib/avaliacao.js";
import { temaDaDisciplina } from "../lib/capaHistoria.js";
import { figurasObrigatorias } from "../lib/figuras.js";

test("Língua Espanhola aparece no formulário e tem componente na BNCC", () => {
  assert.ok(DISCIPLINAS.includes("Língua Espanhola"));
  assert.deepEqual(DISCIPLINA_PARA_COMPONENTE["Língua Espanhola"], ["Linguagens e suas Tecnologias"]);
});

test("pedido da apostila ganha regra de espanhol só para Espanhol", () => {
  assert.ok(ehEspanhol("Língua Espanhola"));
  assert.match(regraLinguaEstrangeira("Língua Espanhola"), /LÍNGUA ESPANHOLA/);
  assert.equal(regraLinguaEstrangeira("Língua Inglesa"), "");
  assert.equal(regraLinguaEstrangeira("Matemática"), "");
});

test("avaliação de espanhol tem regras de especialista próprias", () => {
  assert.match(blocoEspecialista("Língua Espanhola"), /ESPECIALISTA EM LÍNGUA ESPANHOLA/);
  assert.doesNotMatch(blocoEspecialista("Língua Espanhola"), /INGLESA/);
});

test("capa e figuras tratam espanhol como Linguagens", () => {
  assert.equal(temaDaDisciplina("Língua Espanhola").desenho, "espanhol");
  assert.equal(figurasObrigatorias("Língua Espanhola"), false);
});
