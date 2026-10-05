import test from "node:test";
import assert from "node:assert/strict";
import { geminiJson, openaiJson, provedorRevisorPadrao } from "../lib/provedoresIA.js";

const guardar = () => ({ ...process.env });
const restaurar = (e) => { for (const k of Object.keys(process.env)) if (!(k in e)) delete process.env[k]; Object.assign(process.env, e); };

test("provedor padrão do revisor: OpenAI, a menos que REVISOR_PROVEDOR=gemini e haja chave", () => {
  const e = guardar();
  process.env.OPENAI_API_KEY = "x"; delete process.env.GEMINI_API_KEY; delete process.env.REVISOR_PROVEDOR;
  assert.equal(provedorRevisorPadrao(), "openai");
  process.env.REVISOR_PROVEDOR = "gemini";
  assert.equal(provedorRevisorPadrao(), "openai"); // sem chave do Gemini
  process.env.GEMINI_API_KEY = "y";
  assert.equal(provedorRevisorPadrao(), "gemini");
  delete process.env.OPENAI_API_KEY; delete process.env.REVISOR_PROVEDOR;
  assert.equal(provedorRevisorPadrao(), "gemini");
  delete process.env.GEMINI_API_KEY;
  assert.equal(provedorRevisorPadrao(), null);
  restaurar(e);
});

test("Gemini: monta o pedido certo e lê o JSON (mesmo com ```json)", async () => {
  const e = guardar();
  process.env.GEMINI_API_KEY = "chave-teste";
  const orig = globalThis.fetch;
  let visto;
  globalThis.fetch = async (url, op) => {
    visto = { url, op };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '```json\n{"apontamentos":[{"onde":"geral","problema":"x"}]}\n```' }] } }] }), { status: 200 });
  };
  const r = await geminiJson({ sistema: "S", prompt: "P", modelo: "gemini-teste" });
  globalThis.fetch = orig;
  restaurar(e);
  assert.equal(r.ok, true);
  assert.equal(r.json.apontamentos[0].problema, "x");
  assert.match(visto.url, /models\/gemini-teste:generateContent$/);
  assert.equal(visto.op.headers["x-goog-api-key"], "chave-teste");
  const corpo = JSON.parse(visto.op.body);
  assert.equal(corpo.generationConfig.responseMimeType, "application/json");
  assert.equal(corpo.contents[0].parts[0].text, "P");
});

test("sem chave: devolve erro em vez de lançar", async () => {
  const e = guardar();
  delete process.env.GEMINI_API_KEY; delete process.env.OPENAI_API_KEY;
  assert.equal((await geminiJson({ sistema: "", prompt: "" })).ok, false);
  assert.match((await openaiJson({ sistema: "", prompt: "" })).erro, /ausente/);
  restaurar(e);
});

import { openaiStream, geminiStream } from "../lib/provedoresIA.js";
const sse = (linhas) => new Response(new ReadableStream({ start(c) { for (const l of linhas) c.enqueue(new TextEncoder().encode(l)); c.close(); } }), { status: 200 });

test("OpenAI sem crédito: não fica esperando, avisa 'semCredito' para o Gemini assumir", async () => {
  const e = { ...process.env };
  process.env.OPENAI_API_KEY = "x";
  const orig = globalThis.fetch;
  let chamadas = 0;
  globalThis.fetch = async () => { chamadas++; return new Response('{"error":{"code":"insufficient_quota"}}', { status: 429 }); };
  const r = await openaiStream({ sistema: "", prompt: "" });
  globalThis.fetch = orig;
  Object.assign(process.env, e);
  assert.equal(r.ok, false);
  assert.equal(r.semCredito, true);
  assert.equal(chamadas, 1);
});

test("stream do Gemini: junta os trechos e ignora o raciocínio interno (thought)", async () => {
  const e = { ...process.env };
  process.env.GEMINI_API_KEY = "y";
  const orig = globalThis.fetch;
  let url;
  globalThis.fetch = async (u) => {
    url = u;
    return sse([
      'data: {"candidates":[{"content":{"parts":[{"text":"pensando...","thought":true}]}}]}\n\n',
      'data: {"candidates":[{"content":{"parts":[{"text":"{\\"a\\":"}]}}]}\n\ndata: {"candidates":[{"content":{"parts":[{"text":"1}"}]}}]}\n\n',
    ]);
  };
  const r = await geminiStream({ sistema: "S", prompt: "P", modelo: "m" });
  let t = "";
  for await (const p of r.partes) t += p;
  globalThis.fetch = orig;
  Object.assign(process.env, e);
  assert.equal(t, '{"a":1}');
  assert.match(url, /m:streamGenerateContent\?alt=sse$/);
});

test("Gemini que não aceita 'thinkingLevel' (400): tenta de novo sem o campo", async () => {
  const e = { ...process.env };
  process.env.GEMINI_API_KEY = "y";
  const orig = globalThis.fetch;
  const corpos = [];
  globalThis.fetch = async (_u, op) => {
    corpos.push(JSON.parse(op.body));
    return corpos.length === 1
      ? new Response('{"error":{"message":"Unknown name \\"thinkingConfig\\""}}', { status: 400 })
      : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }), { status: 200 });
  };
  const { geminiJson } = await import("../lib/provedoresIA.js");
  const r = await geminiJson({ sistema: "", prompt: "" });
  globalThis.fetch = orig;
  Object.assign(process.env, e);
  assert.equal(r.ok, true);
  assert.ok(corpos[0].generationConfig.thinkingConfig);
  assert.equal(corpos[1].generationConfig.thinkingConfig, undefined);
});
