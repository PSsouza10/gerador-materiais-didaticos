// Link de campanha (edugera.app/convite/<CÓDIGO>): dias de Pro grátis — PGlite
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { definirClienteTeste } from "../lib/banco.js";
import { listarMigracoes, lerInstrucoes } from "../lib/migracoes.js";
import * as K from "../lib/campanhas.js";
import { assinaturaAtiva } from "../lib/contas.js";

const db = new PGlite();
before(async () => {
  for (const m of listarMigracoes(new URL("../db/migracoes", import.meta.url).pathname)) for (const i of lerInstrucoes(m.up)) await db.query(i);
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
const futuro = (d = 10) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

test("validação: código, dias, limite e data de fim no futuro", () => {
  assert.equal(K.validarCampanha({ codigo: "insta-60", dias: 60, limite: 10, fim: futuro() }).dados.codigo, "INSTA60");
  assert.equal(K.validarCampanha({ codigo: "AB", dias: 60, limite: 10, fim: futuro() }).ok, false);
  assert.equal(K.validarCampanha({ codigo: "INSTA60", dias: 0, limite: 10, fim: futuro() }).ok, false);
  assert.equal(K.validarCampanha({ codigo: "INSTA60", dias: 60, limite: 10, fim: "2020-01-01" }).ok, false);
});

test("resgate libera o Pro pelos dias da campanha, uma vez por conta, até o limite", async () => {
  assert.equal((await K.criarCampanha({ codigo: "INSTA60", dias: 60, limite: 2, fim: futuro() })).ok, true);
  assert.equal((await K.criarCampanha({ codigo: "INSTA60", dias: 60, limite: 2, fim: futuro() })).ok, false, "código repetido");
  const r = await K.resgatar("a@x.br", "insta60");
  assert.equal(r.ok, true);
  const a = await assinaturaAtiva("a@x.br");
  assert.equal(a.plano, "pro_mensal");
  assert.equal(a.origem, "manual");
  const diasAte = (Date.parse(a.fim) - Date.now()) / 864e5;
  assert.ok(diasAte > 59 && diasAte <= 60, `fim em ~60 dias (${diasAte})`);
  assert.match((await K.resgatar("a@x.br", "INSTA60")).erro, /já ativou/);
  assert.equal((await K.resgatar("b@x.br", "INSTA60")).ok, true);
  assert.match((await K.resgatar("c@x.br", "INSTA60")).erro, /vagas/);
  const [c] = await K.listarCampanhas();
  assert.equal(c.resgates, 2);
});

test("uma campanha por conta; campanha encerrada ou vencida não vale", async () => {
  await K.criarCampanha({ codigo: "HTPC30", dias: 30, limite: 50, fim: futuro() });
  assert.match((await K.resgatar("a@x.br", "HTPC30")).erro, /já usou uma campanha/);
  await K.definirAtiva("HTPC30", false);
  assert.match((await K.resgatar("d@x.br", "HTPC30")).erro, /encerrada/);
  assert.match((await K.resgatar("d@x.br", "NAOEXISTE")).erro, /não existe/);
  await db.query("INSERT INTO campanhas (codigo, dias, limite, fim) VALUES ('VELHA1', 10, 10, now() - interval '1 day')");
  assert.match((await K.resgatar("d@x.br", "VELHA1")).erro, /terminou/);
  // nada de e-mail no banco
  const tudo = JSON.stringify((await db.query("SELECT * FROM resgates_campanha")).rows);
  assert.ok(!/@/.test(tudo));
});
