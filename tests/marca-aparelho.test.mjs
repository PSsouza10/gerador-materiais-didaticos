// Grátis: contas novas no mesmo aparelho/rede (Postgres em memória, PGlite)
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { definirClienteTeste } from "../lib/banco.js";
import { listarMigracoes, lerInstrucoes } from "../lib/migracoes.js";
import * as C from "../lib/contas.js";
import { ipDoPedido } from "../lib/dispositivo.js";

const db = new PGlite();
before(async () => {
  for (const m of listarMigracoes(new URL("../db/migracoes", import.meta.url).pathname))
    for (const i of lerInstrucoes(m.up)) await db.query(i);
  definirClienteTeste({
    consultar: async (t, p = []) => (await db.query(t, p)).rows,
    transacao: (lista) => db.transaction(async (tx) => {
      const r = [];
      for (const [t, p = []] of lista) r.push((await tx.query(t, p)).rows);
      return r;
    }),
  });
});

const marca = (dispositivo, rede = null) => ({ dispositivo, rede, limiteAparelho: 2, limiteRede: 3 });

test("aparelho: 2 contas Grátis passam, a 3ª é barrada; as que já usaram seguem", async () => {
  assert.equal((await C.consumir("a1@x.br", "geracao", 5, { marca: marca("aparelhoA") })).ok, true);
  assert.equal((await C.consumir("a2@x.br", "cruzadinha", 1, { marca: marca("aparelhoA") })).ok, true);
  const r = await C.consumir("a3@x.br", "geracao", 5, { marca: marca("aparelhoA") });
  assert.deepEqual(r, { ok: false, motivo: "aparelho" });
  assert.equal((await C.consumir("a1@x.br", "geracao", 5, { marca: marca("aparelhoA") })).ok, true, "conta que já usou ali continua");
  assert.equal((await C.consumir("a3@x.br", "geracao", 5, { marca: marca("aparelhoB") })).ok, true, "outro aparelho passa");
});

test("rede: teto maior de contas por internet; sem marca nada muda", async () => {
  for (const e of ["r1@x.br", "r2@x.br", "r3@x.br"]) assert.equal((await C.consumir(e, "geracao", 5, { marca: marca(`ap-${e}`, "escola") })).ok, true);
  assert.equal((await C.consumir("r4@x.br", "geracao", 5, { marca: marca("ap-r4", "escola") })).motivo, "aparelho");
  assert.equal((await C.consumir("r4@x.br", "geracao", 5)).ok, true, "Pro/sem marca: sem limite de aparelho");
});

test("limite do mês continua valendo junto com a marca", async () => {
  assert.equal((await C.consumir("m1@x.br", "cruzadinha", 1, { marca: marca("apM") })).ok, true);
  assert.deepEqual(await C.consumir("m1@x.br", "cruzadinha", 1, { marca: marca("apM") }), { ok: false, motivo: "mes" });
});

test("IP do pedido: primeiro da lista do proxy", () => {
  const h = new Map([["x-forwarded-for", "200.1.2.3, 10.0.0.1"]]);
  assert.equal(ipDoPedido(h), "200.1.2.3");
  assert.equal(ipDoPedido(new Map([["x-real-ip", "1.1.1.1"]])), "1.1.1.1");
});
