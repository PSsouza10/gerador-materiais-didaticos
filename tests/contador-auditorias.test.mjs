import assert from "node:assert/strict";
import test from "node:test";
import { incrementarContagemAuditorias, lerContagemAuditorias } from "../lib/contadorAuditorias.js";
import { caminhoBlob } from "../lib/ambiente.js";

const PATH_TESTE = caminhoBlob("estatisticas/auditorias.json", { VERCEL_ENV: "preview" });
const STORE_ID_TESTE = "store-auditorias-teste";
const OIDC_TESTE = "oidc-auditorias-teste";
const TOKEN_TESTE = "token-auditorias-teste";

function criarBlobFalso() {
  let conteudo = null;
  let revisao = 0;
  const caminhos = [];
  const credenciaisUsadas = [];
  const capturarCredencial = (options) => {
    assert.equal(options.access, "private");
    assert.equal(options.storeId, STORE_ID_TESTE);
    credenciaisUsadas.push({ storeId: options.storeId, oidcToken: options.oidcToken, token: options.token });
  };
  const getBlob = async (path, options) => {
    caminhos.push(path);
    capturarCredencial(options);
    assert.equal(options.useCache, false);
    if (conteudo === null) return null;
    await Promise.resolve();
    return { blob: { etag: `e${revisao}` }, stream: new Response(conteudo).body };
  };
  const putBlob = async (_path, body, options) => {
    capturarCredencial(options);
    if (conteudo === null) {
      if (options.allowOverwrite || options.ifMatch) {
        throw Object.assign(new Error("Precondition failed"), { name: "BlobPreconditionFailedError", status: 412 });
      }
    } else if (!options.allowOverwrite || options.ifMatch !== `e${revisao}`) {
      throw Object.assign(new Error("Precondition failed"), { name: "BlobPreconditionFailedError", status: 412 });
    }
    conteudo = body;
    revisao += 1;
  };
  return {
    getBlob,
    putBlob,
    caminhos,
    credenciaisUsadas,
    valor: () => (conteudo === null ? null : JSON.parse(conteudo)),
  };
}

const deps = (blob, credenciais = {}) => ({
  ...blob,
  pathname: PATH_TESTE,
  storeId: STORE_ID_TESTE,
  oidcToken: OIDC_TESTE,
  token: TOKEN_TESTE,
  ...credenciais,
});

const assertOidcPreferido = (blob) => {
  assert.ok(blob.credenciaisUsadas.length > 0);
  assert.ok(blob.credenciaisUsadas.every((c) => c.storeId === STORE_ID_TESTE));
  assert.ok(blob.credenciaisUsadas.every((c) => c.oidcToken === OIDC_TESTE && c.token === undefined));
};

test("separa o caminho de métricas de Preview e produção", () => {
  assert.equal(PATH_TESTE, "teste/estatisticas/auditorias.json");
  assert.equal(caminhoBlob("estatisticas/auditorias.json", { VERCEL_ENV: "production" }), "estatisticas/auditorias.json");
});

test("contador ausente começa em zero e persiste somente o total em Blob privado via OIDC", async () => {
  const blob = criarBlobFalso();
  assert.equal(await lerContagemAuditorias(deps(blob)), 0);
  assert.equal(await incrementarContagemAuditorias(deps(blob)), 1);
  assert.deepEqual(blob.valor(), { total: 1 });
  assert.equal(Object.keys(blob.valor()).length, 1);
  assert.ok(blob.caminhos.every((p) => p === PATH_TESTE));
  assertOidcPreferido(blob);
});

test("incrementos concorrentes usam controle de versão sem perder contagens", async () => {
  const blob = criarBlobFalso();
  const resultados = await Promise.all(Array.from({ length: 12 }, () => incrementarContagemAuditorias(deps(blob))));
  assert.equal(await lerContagemAuditorias(deps(blob)), 12);
  assert.equal(blob.valor().total, 12);
  assert.equal(new Set(resultados).size, 12);
  assertOidcPreferido(blob);
});

test("usa somente o token escopado AUDITORIAS quando OIDC não está disponível", async () => {
  const blob = criarBlobFalso();
  assert.equal(await incrementarContagemAuditorias(deps(blob, { oidcToken: "", token: TOKEN_TESTE })), 1);
  assert.ok(blob.credenciaisUsadas.every((c) => c.storeId === STORE_ID_TESTE));
  assert.ok(blob.credenciaisUsadas.every((c) => c.oidcToken === undefined && c.token === TOKEN_TESTE));
});

test("não recorre ao token público legado nem grava quando faltam credenciais do store privado", async () => {
  const original = process.env.BLOB_READ_WRITE_TOKEN;
  process.env.BLOB_READ_WRITE_TOKEN = "token-publico-legado-de-teste";
  try {
    await assert.rejects(
      lerContagemAuditorias({
        getBlob: async () => assert.fail("não deve chamar Blob sem credenciais do store privado"),
        pathname: PATH_TESTE,
        storeId: STORE_ID_TESTE,
        oidcToken: "",
        token: "",
      }),
      /AUDITORIAS_READ_WRITE_TOKEN/,
    );
  } finally {
    if (original === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = original;
  }
});

test("recusa operar sem o ID explícito do store privado", async () => {
  await assert.rejects(
    lerContagemAuditorias({
      getBlob: async () => assert.fail("não deve chamar Blob sem storeId"),
      pathname: PATH_TESTE,
      storeId: "",
      oidcToken: OIDC_TESTE,
      token: TOKEN_TESTE,
    }),
    /AUDITORIAS_STORE_ID/,
  );
});
