// Parte B · conferências: JSON canônico, inventário e comparação Blob × banco
import test from "node:test";
import assert from "node:assert/strict";
import { canonico, hashConteudo, inventariar, compararConta } from "../lib/inventario.js";
import { hashChave } from "../lib/chave.js";
import { podeMigrar } from "../lib/migracoes.js";

test("JSON canônico ignora a ordem dos campos (o banco reordena)", () => {
  assert.equal(canonico({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: "z" } }), canonico({ a: { c: "z", d: [1, { x: 1, y: 2 }] }, b: 1 }));
  assert.notEqual(hashConteudo({ a: 1 }), hashConteudo({ a: 2 }));
});

test("inventário conta ativos, revogados, órfãos, quebrados e duplicados", () => {
  const r = inventariar({
    historicos: [
      { itens: [{ id: "a", chave: "k" }, { id: "b", revogado: true }, { id: "c", chave: "k" }], removidos: ["z"] },
      { itens: [{ id: "a", chave: "k2" }, { id: "d", chave: "k" }] },
    ],
    materiais: new Set(["a", "d", "o"]),
    lapides: new Set(["d"]),
  });
  assert.deepEqual(r, { listas: 2, itens: 5, ativos: 3, revogados: 2, removidos: 1, quebrados: 1, materiais: 3, orfaos: 1, emMaisDeUmaLista: 1, lapides: 1 });
});

test("comparação Blob × banco aponta faltas, sobras, duplicados e divergências", () => {
  const reg = (t) => ({ versao: 1, material: { tituloDidatico: t }, chaveHash: hashChave("k") });
  const blob = { itens: [{ id: "m1", chave: "k" }, { id: "m2", chave: "k" }, { id: "m3", revogado: true }] };
  const conteudos = new Map([["m1", { registro: reg("A"), meu: true }], ["m2", { registro: reg("B"), meu: true }]]);
  const ok = [
    { id: "m1", tem_chave: true, revogado: false, removido: false, conteudo: { material: { tituloDidatico: "A" }, versao: 1 } },
    { id: "m2", tem_chave: true, revogado: false, removido: false, conteudo: JSON.stringify({ versao: 1, material: { tituloDidatico: "B" } }) },
    { id: "m3", tem_chave: false, revogado: true, removido: false, conteudo: null },
  ];
  const r = compararConta({ blob, conteudos, banco: ok });
  assert.equal(r.idsIguais, true);
  assert.equal(r.conteudosIguais, 2);
  assert.deepEqual([r.ativosBlob, r.ativosBanco, r.revogadosBlob, r.revogadosBanco, r.duplicados], [2, 2, 1, 1, 0]);
  const ruim = compararConta({ blob, conteudos, banco: [{ ...ok[0], conteudo: { versao: 2 } }, ok[2], { id: "x9", tem_chave: true, revogado: false, removido: false }] });
  assert.deepEqual(ruim.faltandoNoBanco, ["m2"]);
  assert.deepEqual(ruim.sobrandoNoBanco, ["x9"]);
  assert.deepEqual(ruim.divergentes, ["m1"]);
});

test("migração em produção só com o interruptor", () => {
  const u = "postgresql://u:p@h/db";
  assert.equal(podeMigrar({ VERCEL_ENV: "production", DATABASE_URL_PRODUCAO: u }).ok, false);
  assert.equal(podeMigrar({ VERCEL_ENV: "production", BANCO_PRODUCAO: "1", DATABASE_URL_PRODUCAO: u }).ok, true);
  assert.equal(podeMigrar({ VERCEL_ENV: "preview", DATABASE_URL_TESTE: u }).ok, true);
});

test("repetição com espera: aguenta o atraso do Blob e desiste depois do limite", async () => {
  const { comTentativas } = await import("../lib/tentativas.js");
  let n = 0;
  const instavel = async () => {
    if (++n < 3) throw new Error("ainda não aparece");
    return "ok";
  };
  assert.equal(await comTentativas(instavel, { espera: 1 }), "ok");
  assert.equal(n, 3);
  await assert.rejects(comTentativas(async () => { throw new Error("sempre"); }, { tentativas: 3, espera: 1 }), /sempre/);
});

test("lista do Blob × banco: detecta revogação que não chegou ao espelho", async () => {
  const { listaConfere } = await import("../lib/tentativas.js");
  const banco = [{ id: "a", chave: "k" }, { id: "b", revogado: true }];
  assert.equal(listaConfere([{ id: "a", chave: "k" }, { id: "b", revogado: true }], banco).ok, true);
  const atrasado = listaConfere([{ id: "a", chave: "k" }, { id: "b", chave: "k2" }], banco);
  assert.equal(atrasado.ok, false);
  assert.equal(atrasado.divergencias, 2);
});
