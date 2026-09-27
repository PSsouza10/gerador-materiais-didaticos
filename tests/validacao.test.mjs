import { test } from "node:test";
import assert from "node:assert/strict";
import { validarPedido, limparTexto, LIMITES } from "../lib/validacao.js";
import { normalizarEstilo } from "../lib/opcoes.js";

const base = { disciplina: "Matemática", nivel: "Ensino Fundamental", tema: "Volume do cubo" };

test("aceita pedido válido e limpa espaços", () => {
  const r = validarPedido({ ...base, tema: "  Volume do cubo  " });
  assert.equal(r.ok, true);
  assert.equal(r.dados.tema, "Volume do cubo");
});

test("exige tema, disciplina e nível", () => {
  assert.equal(validarPedido({ ...base, tema: "   " }).ok, false);
  assert.equal(validarPedido({ ...base, disciplina: "" }).ok, false);
  assert.equal(validarPedido({ ...base, nivel: undefined }).ok, false);
});

test("recusa textos acima do limite", () => {
  assert.equal(validarPedido({ ...base, tema: "a".repeat(LIMITES.tema + 1) }).ok, false);
  assert.equal(validarPedido({ ...base, conteudo: "a".repeat(LIMITES.conteudo + 1) }).ok, false);
});

test("remove caracteres de controle, mantém quebra de linha e Unicode", () => {
  assert.equal(limparTexto("fra\u0000ções\u0007\nárea ²"), "frações\nárea ²");
  assert.equal(limparTexto(42), "");
});

test("HTML no tema passa como texto (o React escapa na tela)", () => {
  const r = validarPedido({ ...base, tema: "<script>alert(1)</script>" });
  assert.equal(r.ok, true);
  assert.equal(r.dados.tema, "<script>alert(1)</script>");
});

test("estilo antigo vira '3D colorido'; desconhecido cai no padrão", () => {
  assert.equal(normalizarEstilo("3D Pixar/Disney"), "3D colorido");
  assert.equal(normalizarEstilo("Realista"), "Realista");
  assert.equal(normalizarEstilo("qualquer"), "3D colorido");
});

test("a maior habilidade oficial da BNCC cabe no limite", async () => {
  const { readFileSync } = await import("node:fs");
  const d = JSON.parse(readFileSync(new URL("../data/bncc-habilidades.json", import.meta.url)));
  const maior = Math.max(...d.habilidades.map((h) => h.t.length));
  assert.ok(maior <= LIMITES.habilidade, `maior=${maior}`);
});
