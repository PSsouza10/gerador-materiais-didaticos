import assert from "node:assert/strict";
import test from "node:test";
import { incrementarContagemAuditorias, lerContagemAuditorias } from "../lib/contadorAuditorias.js";
import { caminhoBlob } from "../lib/ambiente.js";

const PATH_TESTE = caminhoBlob("estatisticas/auditorias.json", { VERCEL_ENV: "preview" });

function criarBlobFalso() {
  let conteudo = null;
  let revisao = 0;
  const caminhos = [];
  const getBlob = async (path, options) => {
    caminhos.push(path);
    assert.equal(options.access, "private");
    assert.equal(options.useCache, false);
    if (conteudo === null) return null;
    await Promise.resolve();
    return { blob: { etag: `e${revisao}` }, stream: new Response(conteudo).body };
  };
  const putBlob = async (_path, body, options) => {
    assert.equal(options.access, "private");
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
  return { getBlob, putBlob, caminhos, valor: () => (conteudo === null ? null : JSON.parse(conteudo)) };
}

const deps = (blob) => ({ ...blob, pathname: PATH_TESTE });

test("separa o caminho de métricas de Preview e produção", () => {
  assert.equal(PATH_TESTE, "teste/estatisticas/auditorias.json");
  assert.equal(caminhoBlob("estatisticas/auditorias.json", { VERCEL_ENV: "production" }), "estatisticas/auditorias.json");
});

test("contador ausente começa em zero e persiste somente o total em Blob privado", async () => {
  const blob = criarBlobFalso();
  assert.equal(await lerContagemAuditorias(deps(blob)), 0);
  assert.equal(await incrementarContagemAuditorias(deps(blob)), 1);
  assert.deepEqual(blob.valor(), { total: 1 });
  assert.equal(Object.keys(blob.valor()).length, 1);
  assert.ok(blob.caminhos.every((p) => p === PATH_TESTE));
});

test("incrementos concorrentes usam controle de versão sem perder contagens", async () => {
  const blob = criarBlobFalso();
  const resultados = await Promise.all(Array.from({ length: 12 }, () => incrementarContagemAuditorias(deps(blob))));
  assert.equal(await lerContagemAuditorias(deps(blob)), 12);
  assert.equal(blob.valor().total, 12);
  assert.equal(new Set(resultados).size, 12);
});
