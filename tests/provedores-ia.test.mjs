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
