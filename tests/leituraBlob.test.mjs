// Parte B: leitura do Blob na importação — "não existe" ≠ "falhou ao ler"
import { test } from "node:test";
import assert from "node:assert/strict";
import { lerJsonEstrito, naoExiste } from "../lib/leituraBlob.js";

const naoEncontrado = () => Object.assign(new Error("Vercel Blob: The requested blob does not exist"), { name: "BlobNotFoundError" });
const meta = { url: "https://x.public.blob.vercel-storage.com/historicos/a.json" };
const resp = (status, corpo) => ({ ok: status >= 200 && status < 300, status, json: async () => (typeof corpo === "string" ? JSON.parse(corpo) : corpo) });
const rapido = { tentativas: 3, espera: 1 };

test("arquivo que não existe = null (conta nova)", async () => {
  assert.equal(await lerJsonEstrito("h/a.json", { ...rapido, head: async () => { throw naoEncontrado(); } }), null);
  assert.equal(naoExiste(naoEncontrado()), true);
});

test("existe e lê: devolve o conteúdo, sempre com ?v= (sem cópia da CDN)", async () => {
  const urls = [];
  const r = await lerJsonEstrito("h/a.json", { ...rapido, head: async () => meta, buscar: async (u) => (urls.push(u), resp(200, { itens: [1, 2] })) });
  assert.deepEqual(r, { itens: [1, 2] });
  assert.match(urls[0], /\?v=\d+$/);
});

test("existe mas a CDN ainda devolve 404 por um instante: repete e consegue", async () => {
  let n = 0;
  const r = await lerJsonEstrito("h/a.json", { ...rapido, head: async () => meta, buscar: async () => (++n < 3 ? resp(404) : resp(200, { itens: [1] })) });
  assert.deepEqual(r, { itens: [1] });
  assert.equal(n, 3);
});

test("existe e continua falhando: ERRO, nunca lista vazia", async () => {
  await assert.rejects(lerJsonEstrito("h/a.json", { ...rapido, head: async () => meta, buscar: async () => resp(404) }), /falhou \(404\)/);
  await assert.rejects(lerJsonEstrito("h/a.json", { ...rapido, head: async () => meta, buscar: async () => resp(200, "{quebrado") }));
  await assert.rejects(lerJsonEstrito("h/a.json", { ...rapido, head: async () => meta, buscar: async () => { throw new Error("rede"); } }), /rede/);
});

test("Blob fora do ar na consulta: ERRO (não confunde com 'não existe')", async () => {
  await assert.rejects(lerJsonEstrito("historicos/a.json", { ...rapido, head: async () => { throw new Error("503 Service Unavailable"); } }), /indisponível/);
});
