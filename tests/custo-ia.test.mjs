// Custo de IA por pedido (lib/custoIA.js) — Postgres em memória (PGlite)
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { definirClienteTeste } from "../lib/banco.js";
import { listarMigracoes, lerInstrucoes } from "../lib/migracoes.js";
import { custoUsd, precoDoModelo, usoGemini, usoOpenAI, comMedicao, anotarUso, resumoDeCustos, tabelaDePrecos } from "../lib/custoIA.js";
import { comRequestId } from "../lib/requestId.js";

const db = new PGlite();

before(async () => {
  for (const m of listarMigracoes(new URL("../db/migracoes", import.meta.url).pathname))
    for (const i of lerInstrucoes(m.up)) await db.query(i);
  definirClienteTeste({
    consultar: async (t, p = []) => (await db.query(t, p)).rows,
    transacao: (lista) =>
      db.transaction(async (tx) => {
        const r = [];
        for (const [t, p = []] of lista) r.push((await tx.query(t, p)).rows);
        return r;
      }),
  });
});

test("preço casa pelo começo do nome do modelo, o mais específico primeiro", () => {
  assert.deepEqual(precoDoModelo("gpt-4o-mini-2024-07-18"), [0.15, 0.6]);
  assert.deepEqual(precoDoModelo("gpt-4o-2024-08-06"), [2.5, 10]);
  assert.deepEqual(precoDoModelo("gemini-3.1-flash-lite"), [0.25, 1.5]);
  assert.equal(precoDoModelo("modelo-desconhecido"), null);
  assert.equal(custoUsd({ modelo: "modelo-desconhecido", entrada: 10 }), null);
  // 10 mil de entrada + 2 mil de saída no Flash-Lite = 0,0025 + 0,003
  assert.ok(Math.abs(custoUsd({ modelo: "gemini-3.1-flash-lite", entrada: 10000, saida: 2000 }) - 0.0055) < 1e-9);
});

test("PRECOS_IA na Vercel substitui a tabela; JSON inválido é ignorado", () => {
  assert.deepEqual(tabelaDePrecos({ PRECOS_IA: '{"gpt-4o":[1,2]}' })["gpt-4o"], [1, 2]);
  assert.deepEqual(tabelaDePrecos({ PRECOS_IA: "{quebrado" })["gpt-4o"], [2.5, 10]);
});

test("tokens: OpenAI e Gemini (pensamento conta como saída)", () => {
  assert.deepEqual(usoOpenAI({ usage: { prompt_tokens: 100, completion_tokens: 40 } }), { entrada: 100, saida: 40 });
  assert.deepEqual(usoGemini({ usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 30, thoughtsTokenCount: 5 } }), { entrada: 100, saida: 35 });
  assert.equal(usoOpenAI({}), null);
  assert.equal(usoGemini({}), null);
});

test("fora de um pedido nada é gravado", async () => {
  await anotarUso({ provedor: "openai", modelo: "gpt-4o", entrada: 1, saida: 1 });
  const [{ n }] = (await db.query("SELECT count(*)::int AS n FROM custos_ia")).rows;
  assert.equal(n, 0);
});

test("resumo soma as chamadas de cada pedido e tira a média por rota", async () => {
  await comMedicao({ request_id: "pedido-aaaa1", rota: "/api/gerar-avaliacao" }, async () => {
    await anotarUso({ provedor: "openai", modelo: "gpt-4o", entrada: 1000, saida: 1000 }); // 0,0125
    await anotarUso({ provedor: "gemini", modelo: "gemini-3.1-flash-lite", entrada: 10000, saida: 2000 }); // 0,0055
  });
  await comMedicao({ request_id: "pedido-bbbb2", rota: "/api/gerar-avaliacao" }, async () => {
    await anotarUso({ provedor: "gemini", modelo: "gemini-3.1-flash-lite", entrada: 10000, saida: 2000 }); // 0,0055
  });
  const [l] = (await resumoDeCustos(30)).filter((x) => x.rota === "/api/gerar-avaliacao");
  assert.equal(l.pedidos, 2);
  assert.equal(l.chamadas_media, 1.5);
  assert.ok(Math.abs(l.custo_medio - (0.018 + 0.0055) / 2) < 1e-6);
  const tudo = JSON.stringify((await db.query("SELECT * FROM custos_ia")).rows);
  assert.ok(!/@/.test(tudo), "nenhum e-mail no registro de custo");
});

test("comRequestId liga as chamadas da rota ao request_id dela", async () => {
  const rota = comRequestId("/api/ler-cartao", async () => {
    await anotarUso({ provedor: "gemini", modelo: "gemini-3.1-flash-lite", entrada: 2000, saida: 200 });
    return new Response("{}", { status: 200 });
  });
  const r = await rota(new Request("http://x/api/ler-cartao", { method: "POST", headers: { "x-request-id": "pedido-cccc3" } }));
  assert.equal(r.headers.get("x-request-id"), "pedido-cccc3");
  const linhas = (await db.query("SELECT rota FROM custos_ia WHERE request_id = 'pedido-cccc3'")).rows;
  assert.deepEqual(linhas, [{ rota: "/api/ler-cartao" }]);
});
