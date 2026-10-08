// Fase 0 · request_id no cabeçalho e no registro, sem mudar a resposta
import test from "node:test";
import assert from "node:assert/strict";
import { obterRequestId, comRequestId } from "../lib/requestId.js";

const pedido = (h = {}) => new Request("https://edugera.test/api/x", { method: "POST", headers: h });

function capturarLog(fn) {
  const linhas = [];
  const orig = console.log;
  console.log = (l) => linhas.push(l);
  return Promise.resolve(fn()).finally(() => (console.log = orig)).then((r) => [r, linhas]);
}

test("reaproveita x-request-id seguro e cria um novo quando falta ou é inválido", () => {
  assert.equal(obterRequestId(pedido({ "x-request-id": "abc-12345678" })), "abc-12345678");
  assert.match(obterRequestId(pedido()), /^[0-9a-f-]{36}$/);
  assert.match(obterRequestId(pedido({ "x-request-id": "<script>" })), /^[0-9a-f-]{36}$/);
});

test("a rota responde igual, com x-request-id, e o log tem o id mas nenhum dado pessoal", async () => {
  const rota = comRequestId("/api/x", async (_r, _c, id) => new Response(JSON.stringify({ ok: true, id }), { status: 201 }));
  const [res, linhas] = await capturarLog(() => rota(pedido({ "x-request-id": "teste-123456" })));
  assert.equal(res.status, 201);
  assert.equal((await res.json()).ok, true);
  assert.equal(res.headers.get("x-request-id"), "teste-123456");
  const log = JSON.parse(linhas.at(-1));
  assert.equal(log.request_id, "teste-123456");
  assert.equal(log.rota, "/api/x");
  assert.equal(log.status, 201);
  assert.ok(typeof log.ms === "number");
  assert.deepEqual(Object.keys(log).sort(), ["app", "metodo", "ms", "request_id", "rota", "status"]);
});

test("erro inesperado vira 500 com request_id (sem detalhes internos na resposta)", async () => {
  const rota = comRequestId("/api/x", async () => {
    throw new Error("falha interna com segredo");
  });
  const [res] = await capturarLog(() => rota(pedido({ "x-request-id": "teste-999999" })));
  assert.equal(res.status, 500);
  const corpo = await res.json();
  assert.equal(corpo.request_id, "teste-999999");
  assert.doesNotMatch(JSON.stringify(corpo), /segredo/);
});
