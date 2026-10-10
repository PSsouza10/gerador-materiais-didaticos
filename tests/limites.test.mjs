// Limite diário + mensal no banco (PGlite), request_id e assinatura sem cobrança
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { definirClienteTeste } from "../lib/banco.js";
import { listarMigracoes, lerInstrucoes } from "../lib/migracoes.js";
import * as C from "../lib/contas.js";

const db = new PGlite();
const linhas = async (sql, p) => (await db.query(sql, p)).rows;

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

test("limite mensal: 2 gerações passam, a 3ª é bloqueada com motivo 'mes'", async () => {
  const e = "mes@x.br";
  assert.deepEqual(await C.consumir(e, "geracao", 2, { limiteDia: 2, requestId: "req-mes-0001" }), { ok: true });
  assert.deepEqual(await C.consumir(e, "geracao", 2, { limiteDia: 2, requestId: "req-mes-0002" }), { ok: true });
  assert.deepEqual(await C.consumir(e, "geracao", 2, { limiteDia: 2, requestId: "req-mes-0003" }), { ok: false, motivo: "mes" });
  assert.equal((await C.contagens(e)).mes.geracao, 2, "a recusada não conta");
});

test("limite diário: bloqueia no dia mesmo com saldo no mês (motivo 'dia')", async () => {
  const e = "dia@x.br";
  for (let i = 0; i < 3; i++) assert.equal((await C.consumir(e, "geracao", 30, { limiteDia: 3 })).ok, true);
  assert.deepEqual(await C.consumir(e, "geracao", 30, { limiteDia: 3 }), { ok: false, motivo: "dia" });
  // gerações de ontem não contam no dia (mas contam no mês)
  await db.query("UPDATE eventos_uso SET criado_em = criado_em - interval '1 day' WHERE usuario_id = (SELECT id FROM usuarios WHERE conta = $1)", [C.contaDe(e)]);
  const c = await C.contagens(e);
  assert.equal(c.dia.geracao, 0);
  assert.equal((await C.consumir(e, "geracao", 30, { limiteDia: 3 })).ok, true);
});

test("request_id fica gravado e a devolução tira exatamente aquele uso", async () => {
  const e = "rid@x.br";
  await C.consumir(e, "geracao", 30, { requestId: "req-aaaa-0001" });
  await C.consumir(e, "geracao", 30, { requestId: "req-bbbb-0002" });
  await C.devolver(e, "geracao", "req-aaaa-0001");
  const ids = (await linhas("SELECT request_id FROM eventos_uso e JOIN usuarios u ON u.id = e.usuario_id WHERE u.conta = $1", [C.contaDe(e)])).map((l) => l.request_id);
  assert.deepEqual(ids, ["req-bbbb-0002"]);
  const ult = await C.ultimosUsos(e, 5);
  assert.equal(ult[0].requestId, "req-bbbb-0002");
  assert.equal(ult[0].tipo, "geracao");
});

test("duas abas ao mesmo tempo não passam do limite", async () => {
  const e = "abas@x.br";
  const r = await Promise.all(Array.from({ length: 6 }, (_, i) => C.consumir(e, "geracao", 2, { limiteDia: 10, requestId: `req-aba-000${i}` })));
  assert.equal(r.filter((x) => x.ok).length, 2);
  assert.equal((await C.contagens(e)).mes.geracao, 2);
});

test("ilustrações por geração: Grátis 1 (+folga), Pro 2", async () => {
  const e = "img@x.br";
  await C.consumir(e, "geracao", 30);
  assert.equal((await C.consumir(e, "imagem", Infinity, { porGeracao: 1 })).ok, true);
  assert.equal((await C.consumir(e, "imagem", Infinity, { porGeracao: 1 })).ok, true, "folga de 1 (regra antiga)");
  assert.equal((await C.consumir(e, "imagem", Infinity, { porGeracao: 1 })).ok, false);
  assert.equal((await C.consumir(e, "imagem", Infinity, { porGeracao: 2 })).ok, true, "Pro: 2 por geração + folga = 3");
  assert.equal((await C.consumir(e, "imagem", Infinity, { porGeracao: 2 })).ok, false);
});

test("revisões e correções: limite mensal do plano", async () => {
  const e = "rev@x.br";
  assert.equal((await C.consumir(e, "revisao", 1)).ok, true);
  assert.deepEqual(await C.consumir(e, "revisao", 1), { ok: false, motivo: "mes" });
  assert.equal((await C.consumir(e, "correcao", 1)).ok, true, "tipos contam separado");
});

test("assinatura sem cobrança: ativa, troca, cancela; só uma ativa por conta", async () => {
  const e = "ass@x.br";
  assert.equal(await C.assinaturaAtiva(e), null);
  const a = await C.ativarAssinatura(e, "pro_mensal");
  assert.equal(a.plano, "pro_mensal");
  assert.equal(a.origem, "simulada");
  assert.ok(a.fim > a.inicio);
  assert.equal((await C.ativarAssinatura(e, "pro_anual")).plano, "pro_anual");
  const ativas = await linhas("SELECT count(*)::int AS n FROM assinaturas s JOIN usuarios u ON u.id = s.usuario_id WHERE u.conta = $1 AND status = 'ativa'", [C.contaDe(e)]);
  assert.equal(ativas[0].n, 1);
  await C.cancelarAssinatura(e);
  assert.equal(await C.assinaturaAtiva(e), null);
  await assert.rejects(C.ativarAssinatura(e, "escola"), /Plano inválido/);
  await assert.rejects(C.ativarAssinatura(e, "pro_mensal", "pagamento"), /Origem inválida/);
});

test("excluir a conta leva junto as assinaturas", async () => {
  const e = "fim@x.br";
  await C.ativarAssinatura(e, "pro_mensal");
  await C.apagarContaBanco(e);
  assert.equal((await linhas("SELECT count(*)::int AS n FROM assinaturas s LEFT JOIN usuarios u ON u.id = s.usuario_id WHERE u.id IS NULL"))[0].n, 0);
});

test("migração 0004 preserva todo o histórico (sobe e desce sem perder linha)", async () => {
  const banco = new PGlite();
  const ms = listarMigracoes(new URL("../db/migracoes", import.meta.url).pathname);
  const antes = ms.filter((m) => m.nome < "0004");
  const m4 = ms.find((m) => m.nome.startsWith("0004_"));
  for (const m of antes) for (const i of lerInstrucoes(m.up)) await banco.query(i);
  await banco.query("INSERT INTO usuarios (conta) VALUES ('c1'), ('c2')");
  await banco.query("INSERT INTO eventos_uso (usuario_id, tipo, criado_em) SELECT 1, 'geracao', now() - (n || ' days')::interval FROM generate_series(1, 40) AS n");
  await banco.query("INSERT INTO eventos_uso (usuario_id, tipo) VALUES (2, 'imagem'), (2, 'revisao')");
  await banco.query("INSERT INTO materiais (id, usuario_id, titulo) VALUES ('mat-1', 1, 'A'), ('mat-2', 2, 'B')");
  const foto = async () => JSON.stringify((await banco.query("SELECT id, usuario_id, tipo, criado_em FROM eventos_uso ORDER BY id")).rows) + JSON.stringify((await banco.query("SELECT id, titulo FROM materiais ORDER BY id")).rows);
  const original = await foto();
  for (const i of lerInstrucoes(m4.up)) await banco.query(i);
  assert.equal(await foto(), original, "subir a 0004 não mexe no histórico");
  assert.equal((await banco.query("SELECT count(*)::int AS n FROM eventos_uso WHERE request_id IS NOT NULL")).rows[0].n, 0, "usos antigos ficam sem código (não inventa)");
  for (const i of lerInstrucoes(m4.down)) await banco.query(i);
  assert.equal(await foto(), original, "desfazer a 0004 também não perde nada");
  for (const i of lerInstrucoes(m4.up)) await banco.query(i);
  assert.equal(await foto(), original);
});

test("migração 0004 é idempotente: rodar de novo não duplica coluna, índice nem tabela", async () => {
  const banco = new PGlite();
  const ms = listarMigracoes(new URL("../db/migracoes", import.meta.url).pathname);
  for (const m of ms) for (const i of lerInstrucoes(m.up)) await banco.query(i);
  const m4 = ms.find((m) => m.nome.startsWith("0004_"));
  for (let vez = 0; vez < 2; vez++) for (const i of lerInstrucoes(m4.up)) await banco.query(i); // de novo, 2x
  const n = async (sql) => (await banco.query(sql)).rows[0].n;
  assert.equal(await n("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name = 'eventos_uso' AND column_name = 'request_id'"), 1);
  assert.equal(await n("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_name = 'assinaturas'"), 1);
  assert.equal(await n("SELECT count(*)::int AS n FROM pg_indexes WHERE indexname IN ('eventos_uso_request_idx', 'assinaturas_ativa_idx')"), 2);
});
