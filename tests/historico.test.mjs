import { test } from "node:test";
import assert from "node:assert/strict";
import { mesclar, limparItem } from "../lib/historico.js";

const item = (id, extra = {}) => ({ id, url: `https://edugera.vercel.app/m/${id}`, titulo: "T " + id, tema: "x", criadoEm: `2026-09-${id.slice(-2)}T10:00:00Z`, chave: "k" + id, ...extra });

test("junta computador e celular sem duplicar, mais recente primeiro", () => {
  const conta = mesclar({ itens: [item("abcdef10"), item("abcdef12")] }, [item("abcdef12"), item("abcdef15")]);
  assert.deepEqual(conta.itens.map((i) => i.id), ["abcdef15", "abcdef12", "abcdef10"]);
});

test("removido em um aparelho não volta pela lista do outro", () => {
  const d = mesclar({ itens: [item("abcdef10")] }, [], ["abcdef10"]);
  const depois = mesclar(d, [item("abcdef10")]);
  assert.equal(depois.itens.length, 0);
});

test("revogado nunca volta atrás e perde a chave", () => {
  const d = mesclar({ itens: [item("abcdef10", { revogado: true })] }, [item("abcdef10")]);
  assert.equal(d.itens[0].revogado, true);
  assert.equal(d.itens[0].chave, null);
});

test("só aceita campos conhecidos e links de material", () => {
  assert.equal(limparItem({ id: "abcdef10", url: "javascript:alert(1)" }), null);
  assert.equal(limparItem({ id: "../x", url: "https://a.b/m/x" }), null);
  const l = limparItem({ ...item("abcdef10"), extra: "x", titulo: "a".repeat(999) });
  assert.equal(l.extra, undefined);
  assert.equal(l.titulo.length, 200);
});
