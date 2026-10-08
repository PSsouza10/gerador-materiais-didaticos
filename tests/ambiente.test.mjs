// Fase 0 · isolamento entre TESTE e PRODUÇÃO
import test from "node:test";
import assert from "node:assert/strict";
import { ambiente, ehProducao, caminhoBlob, iaSimulada, PREFIXO_TESTE } from "../lib/ambiente.js";
import { urlBanco, bancoLigado } from "../lib/banco.js";

const PROD = { VERCEL_ENV: "production" };
const TESTE = { VERCEL_ENV: "preview", APP_ENV: "teste" };
const URL_TESTE = "postgresql://usuario:senha@ep-teste.neon.tech/edugera_teste";

test("detecta produção, teste e local", () => {
  assert.equal(ambiente(PROD), "producao");
  assert.equal(ambiente({ ...PROD, APP_ENV: "teste" }), "producao"); // APP_ENV não rebaixa a produção
  assert.equal(ambiente({ VERCEL_ENV: "preview" }), "teste");
  assert.equal(ambiente({ APP_ENV: "teste" }), "teste");
  assert.equal(ambiente({}), "local");
});

test("produção NUNCA liga o banco de teste, mesmo com a variável", () => {
  assert.equal(urlBanco({ ...PROD, DATABASE_URL_TESTE: URL_TESTE }), null);
  assert.equal(bancoLigado({ ...PROD, DATABASE_URL_TESTE: URL_TESTE }), false);
});

test("o banco só usa DATABASE_URL_TESTE, nunca DATABASE_URL", () => {
  assert.equal(urlBanco({ ...TESTE, DATABASE_URL: URL_TESTE }), null);
  assert.equal(urlBanco({ ...TESTE, DATABASE_URL_TESTE: URL_TESTE }), URL_TESTE);
  assert.equal(urlBanco({ ...TESTE, DATABASE_URL_TESTE: "texto qualquer" }), null);
});

test("caminhos do Blob: iguais em produção, dentro de teste/ fora dela", () => {
  const p = "historicos/abc.json";
  assert.equal(caminhoBlob(p, PROD), p);
  assert.equal(caminhoBlob(p, TESTE), PREFIXO_TESTE + p);
  assert.equal(caminhoBlob(p, {}), PREFIXO_TESTE + p);
  assert.equal(caminhoBlob(PREFIXO_TESTE + p, TESTE), PREFIXO_TESTE + p); // sem prefixo duplo
});

test("IA simulada nunca liga em produção", () => {
  assert.equal(iaSimulada({ ...PROD, IA_SIMULADA: "1" }), false);
  assert.equal(iaSimulada({ ...TESTE, IA_SIMULADA: "1" }), true);
  assert.equal(iaSimulada(TESTE), false);
});

test("ehProducao só com VERCEL_ENV=production", () => {
  assert.equal(ehProducao(PROD), true);
  assert.equal(ehProducao(TESTE), false);
  assert.equal(ehProducao({ NODE_ENV: "production" }), false);
});

test("login do Preview volta ao endereço do teste; produção não muda", async () => {
  const { urlLoginPreview } = await import("../lib/ambiente.js");
  assert.equal(urlLoginPreview({ VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "edugera-git-fase-0-x.vercel.app" }), "https://edugera-git-fase-0-x.vercel.app");
  assert.equal(urlLoginPreview({ VERCEL_ENV: "production", VERCEL_BRANCH_URL: "edugera-git-main-x.vercel.app" }), null);
  assert.equal(urlLoginPreview({}), null);
});

test("DATABASE_URL_TESTE colada com aspas, espaços ou psql ainda funciona (só fora da produção)", () => {
  const u = "postgresql://u:p@ep-x.us-east-1.aws.neon.tech/neondb?sslmode=require";
  assert.equal(urlBanco({ VERCEL_ENV: "preview", DATABASE_URL_TESTE: ` "${u}" ` }), u);
  assert.equal(urlBanco({ VERCEL_ENV: "preview", DATABASE_URL_TESTE: `psql '${u}'` }), u);
  assert.equal(urlBanco({ VERCEL_ENV: "production", DATABASE_URL_TESTE: u }), null);
  assert.equal(urlBanco({ VERCEL_ENV: "preview", DATABASE_URL_TESTE: "mysql://x" }), null);
});
