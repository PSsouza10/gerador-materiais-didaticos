// Fase 1 · contas no banco — roda num Postgres de verdade, em memória (PGlite)
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { definirClienteTeste } from "../lib/banco.js";
import { listarMigracoes, lerInstrucoes } from "../lib/migracoes.js";
import { hashChave } from "../lib/chave.js";
import * as C from "../lib/contas.js";

const db = new PGlite();
const conta = (email) => C.contaDe(email);

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

const registro = (titulo) => ({ versao: 1, criadoEm: new Date().toISOString(), form: { tema: titulo, disciplina: "Matemática", ano: "5" }, material: { tituloDidatico: titulo } });
const linhas = async (sql, p) => (await db.query(sql, p)).rows;

test("conta é criada no 1º acesso e o e-mail não vai para o banco", async () => {
  const id1 = await C.usuarioId("Ana@Escola.br");
  const id2 = await C.usuarioId("ana@escola.br");
  assert.equal(id1, id2);
  const tudo = JSON.stringify(await linhas("SELECT * FROM usuarios"));
  assert.ok(!tudo.includes("ana@escola.br"), "e-mail não pode ficar no banco");
});

test("professor A não lê nem altera material de B", async () => {
  await C.gravarMaterial("a@x.br", { id: "mat-AAAA01", url: "https://e.app/m/mat-AAAA01", chave: "ka", chaveHash: hashChave("ka"), registro: registro("Frações A") });
  assert.equal((await C.listarMateriais("a@x.br")).length, 1);
  assert.equal((await C.listarMateriais("b@x.br")).length, 0);
  // B tenta "puxar" o id de A pela sincronização
  const listaB = await C.sincronizarMateriais("b@x.br", [{ id: "mat-AAAA01", url: "https://e.app/m/mat-AAAA01", titulo: "roubado", revogado: true }]);
  assert.equal(listaB.length, 0);
  const [a] = await C.listarMateriais("a@x.br");
  assert.equal(a.titulo, "Frações A");
  assert.equal(a.revogado, false);
  // B também não consegue remover nem revogar sem a chave
  await C.sincronizarMateriais("b@x.br", [], ["mat-AAAA01"]);
  assert.equal((await C.listarMateriais("a@x.br")).length, 1);
  assert.deepEqual(await C.revogarMaterial("mat-AAAA01", "errada"), { ok: false });
});

test("link público mostra o conteúdo; revogar com a chave apaga", async () => {
  assert.equal((await C.materialPublico("mat-AAAA01")).material.tituloDidatico, "Frações A");
  assert.deepEqual(await C.revogarMaterial("mat-AAAA01", "ka"), { ok: true });
  assert.equal(await C.materialPublico("mat-AAAA01"), null);
  const [a] = await C.listarMateriais("a@x.br");
  assert.equal(a.revogado, true);
  assert.equal(a.chave, null);
  assert.equal(await C.revogarMaterial("nao-existe-1", "x"), null);
});

test("lista: revogado não volta atrás e removido não reaparece", async () => {
  const item = { id: "loc-000001", url: "https://e.app/m/loc-000001", titulo: "Local", chave: "kk", revogado: false, criadoEm: "2026-09-01T10:00:00.000Z" };
  await C.sincronizarMateriais("c@x.br", [{ ...item, revogado: true }]);
  let [c] = await C.sincronizarMateriais("c@x.br", [item]);
  assert.equal(c.revogado, true);
  await C.sincronizarMateriais("c@x.br", [], ["loc-000001"]);
  assert.equal((await C.sincronizarMateriais("c@x.br", [item])).length, 0);
});

test("limite de uso: bloqueia na geração N+1 e a devolução libera", async () => {
  assert.equal((await C.consumir("d@x.br", "geracao", 2)).ok, true);
  assert.equal((await C.consumir("d@x.br", "geracao", 2)).ok, true);
  assert.equal((await C.consumir("d@x.br", "geracao", 2)).ok, false);
  await C.devolver("d@x.br", "geracao");
  assert.equal((await C.consumir("d@x.br", "geracao", 2)).ok, true);
  assert.equal((await C.contagensDoMes("d@x.br")).geracao, 2);
  assert.equal((await C.consumir("d@x.br", "geracao", Infinity)).ok, true);
  // ilustração: no máximo uma por geração (com a mesma folga de antes)
  const e = "e@x.br";
  assert.equal((await C.consumir(e, "imagem")).ok, true); // 0 <= 0
  assert.equal((await C.consumir(e, "imagem")).ok, false); // 1 > 0
  await C.consumir(e, "geracao", 5);
  assert.equal((await C.consumir(e, "imagem")).ok, true);
});

test("duas abas ao mesmo tempo não passam do limite", async () => {
  const r = await Promise.all(Array.from({ length: 6 }, () => C.consumir("f@x.br", "geracao", 3)));
  assert.equal(r.filter((x) => x.ok).length, 3);
});

test("perfil: grava só campos conhecidos e com tamanho limitado", async () => {
  const p = await C.salvarPerfil("a@x.br", { nomeExibicao: "  Prof. Ana ", escola: "EMEF X", disciplinas: ["Matemática", "", "x".repeat(99)], admin: true });
  assert.equal(p.nomeExibicao, "Prof. Ana");
  assert.deepEqual(p.disciplinas, ["Matemática", "x".repeat(60)]);
  assert.equal((await C.lerPerfil("b@x.br")).nomeExibicao, "");
});

test("importação do Blob: nada se perde e só roda uma vez", async () => {
  const email = "g@x.br";
  const itens = [
    { id: "imp-000001", url: "https://e.app/m/imp-000001", titulo: "Um", chave: "c1", criadoEm: "2026-08-01T10:00:00.000Z" },
    { id: "imp-000002", url: "https://e.app/m/imp-000002", titulo: "Dois", chave: "c2", criadoEm: "2026-08-02T10:00:00.000Z" },
    { id: "imp-000003", url: "https://e.app/m/imp-000003", titulo: "Três (revogado)", revogado: true, criadoEm: "2026-08-03T10:00:00.000Z" },
  ];
  const blob = {
    "imp-000001": { ...registro("Um"), chaveHash: hashChave("c1") },
    "imp-000002": { ...registro("Dois"), chaveHash: hashChave("c2") },
  };
  const agora = new Date().toISOString();
  const fontes = {
    historico: async () => ({ itens, removidos: ["imp-000009"] }),
    uso: async () => ({ geracoes: [agora, agora, "2026-01-05T00:00:00.000Z"], correcoes: [agora], imagens: [] }),
    material: async (id) => blob[id] || null,
  };
  // antes de importar, outra conta colou o link "imp-000001" na lista dela
  await C.sincronizarMateriais("intruso@x.br", [itens[0]]);

  const r = await C.importarDoBlob(email, fontes);
  assert.deepEqual(r, { importado: true, materiais: 3, comConteudo: 2, removidos: 1, eventos: 4 });
  const lista = await C.listarMateriais(email);
  assert.deepEqual(lista.map((m) => m.id).sort(), ["imp-000001", "imp-000002", "imp-000003"]);
  assert.equal((await C.materialPublico("imp-000002")).material.tituloDidatico, "Dois");
  assert.equal((await C.listarMateriais("intruso@x.br")).length, 0, "quem prova a chave fica com o material");
  const c = await C.contagensDoMes(email);
  assert.equal(c.geracao, 2); // a de janeiro não conta no mês
  assert.equal(c.correcao, 1);
  assert.deepEqual(await C.importarDoBlob(email, fontes), { importado: false, status: "concluida" });
  assert.equal((await C.sincronizarMateriais(email, [{ id: "imp-000009", url: "https://e.app/m/imp-000009" }])).length, 3, "removido continua fora");
});

test("importação que falha não deixa nada pela metade e pode repetir", async () => {
  const email = "h@x.br";
  const ruim = { historico: async () => ({ itens: [{ id: "err-000001", url: "https://e.app/m/err-000001" }] }), uso: async () => ({ geracoes: ["data-invalida-mas-passa"] }), material: async () => null };
  ruim.uso = async () => { throw new Error("Blob fora do ar"); };
  await assert.rejects(C.importarDoBlob(email, ruim));
  assert.equal((await C.listarMateriais(email)).length, 0);
  const bom = { ...ruim, uso: async () => ({}) };
  assert.equal((await C.importarDoBlob(email, bom)).importado, true);
});

test("revogação é lógica: o link some, o conteúdo fica guardado", async () => {
  await C.gravarMaterial("r@x.br", { id: "rev-000001", url: "https://e.app/m/rev-000001", chave: "kr", chaveHash: hashChave("kr"), registro: registro("Rev") });
  assert.equal(await C.situacaoMaterial("rev-000001"), "conteudo");
  assert.deepEqual(await C.revogarMaterial("rev-000001", "kr"), { ok: true });
  assert.equal(await C.situacaoMaterial("rev-000001"), "revogado");
  assert.equal(await C.materialPublico("rev-000001"), null);
  const [l] = await linhas("SELECT conteudo IS NOT NULL AS tem FROM materiais WHERE id = 'rev-000001'");
  assert.equal(l.tem, true, "conteúdo retido");
  assert.equal(await C.situacaoMaterial("nao-existe-9"), null);
});

test("importações simultâneas da mesma conta: só uma executa, nada duplica", async () => {
  const email = "sim@x.br";
  const itens = Array.from({ length: 5 }, (_, i) => ({ id: `sim-00000${i}`, url: `https://e.app/m/sim-00000${i}`, titulo: `S${i}`, chave: `c${i}` }));
  const blob = Object.fromEntries(itens.map((m) => [m.id, { ...registro(m.titulo), chaveHash: hashChave(m.chave) }]));
  const fontes = { historico: async () => ({ itens }), uso: async () => ({ geracoes: [new Date().toISOString()] }), material: async (id) => blob[id] };
  const r = await Promise.all(Array.from({ length: 6 }, () => C.importarDoBlob(email, fontes)));
  assert.equal(r.filter((x) => x.importado).length, 1);
  assert.equal((await C.listarMateriais(email)).length, 5);
  assert.equal((await linhas("SELECT count(*)::int n FROM materiais WHERE id LIKE 'sim-%'"))[0].n, 5);
  assert.equal((await C.contagensDoMes(email)).geracao, 1, "uso não duplicado");
});

test("importação cortada por tempo: nada entra, fica 'falhou' e repete depois", async () => {
  const email = "lento@x.br";
  const itens = [{ id: "len-000001", url: "https://e.app/m/len-000001", titulo: "L", chave: "kl" }];
  const lento = { historico: async () => ({ itens }), uso: async () => ({}), material: () => new Promise((ok) => setTimeout(() => ok(null), 300)) };
  await assert.rejects(C.importarDoBlob(email, lento, { orcamentoMs: 50 }), /tempo/);
  assert.equal((await C.listarMateriais(email)).length, 0);
  assert.equal((await linhas("SELECT importacao_status s FROM usuarios WHERE conta = $1", [conta(email)]))[0].s, "falhou");
  assert.equal((await C.importarDoBlob(email, { ...lento, material: async () => null })).importado, true);
});

test("importação travada há mais de 5 min pode ser retomada; recente não", async () => {
  const email = "trav@x.br";
  await C.usuarioId(email);
  await db.query("UPDATE usuarios SET importacao_status = 'em_andamento', importacao_inicio = now() WHERE conta = $1", [conta(email)]);
  const f = { historico: async () => ({ itens: [] }), uso: async () => ({}), material: async () => null };
  assert.deepEqual(await C.importarDoBlob(email, f), { importado: false, status: "em_andamento" });
  await db.query("UPDATE usuarios SET importacao_inicio = now() - interval '6 minutes' WHERE conta = $1", [conta(email)]);
  assert.equal((await C.importarDoBlob(email, f)).importado, true);
});

test("reabrir a importação (religar depois de rollback) não duplica e traz o novo", async () => {
  const email = "reab@x.br";
  const base = [{ id: "rea-000001", url: "https://e.app/m/rea-000001", titulo: "A", chave: "ka" }];
  const blob = { "rea-000001": { ...registro("A"), chaveHash: hashChave("ka") }, "rea-000002": { ...registro("B"), chaveHash: hashChave("kb") } };
  const f = (itens) => ({ historico: async () => ({ itens }), uso: async () => ({}), material: async (id) => blob[id] });
  await C.importarDoBlob(email, f(base));
  await C.reabrirImportacao(email);
  await C.importarDoBlob(email, f([...base, { id: "rea-000002", url: "https://e.app/m/rea-000002", titulo: "B", chave: "kb" }]));
  assert.deepEqual((await C.listarMateriais(email)).map((m) => m.id).sort(), ["rea-000001", "rea-000002"]);
  assert.equal((await linhas("SELECT count(*)::int n FROM materiais WHERE id LIKE 'rea-%'"))[0].n, 2);
});

test("reabrir a importação não duplica o uso (68 não vira 136)", async () => {
  const email = "uso-reab@x.br";
  const horas = (h) => new Date(Date.now() - h * 3600_000).toISOString();
  let blobUso = { geracoes: [horas(5), horas(4), horas(3)], correcoes: [horas(2)], imagens: [] };
  const f = { historico: async () => ({ itens: [] }), uso: async () => blobUso, material: async () => null };
  await C.importarDoBlob(email, f);
  assert.equal((await C.contagensDoMes(email)).geracao, 3);
  // espelho duplo: o banco grava com now() e o Blob com o próprio relógio (milésimos diferentes)
  assert.equal((await C.consumir(email, "geracao", 100)).ok, true);
  blobUso = { ...blobUso, geracoes: [...blobUso.geracoes, new Date(Date.now() + 7).toISOString()] };
  assert.equal((await C.contagensDoMes(email)).geracao, 4);
  // rollback: o site antigo (sem banco) registra 2 usos só no Blob
  blobUso = { ...blobUso, geracoes: [...blobUso.geracoes, horas(0.1), horas(0.05)] };
  await C.reabrirImportacao(email);
  await C.importarDoBlob(email, f);
  const c = await C.contagensDoMes(email);
  assert.equal(c.geracao, 6, "banco = Blob (4 + 2 do rollback), sem somar de novo");
  assert.equal(c.correcao, 1);
  // repetir não muda nada
  await C.reabrirImportacao(email);
  await C.importarDoBlob(email, f);
  assert.equal((await C.contagensDoMes(email)).geracao, 6);
  // outra conta não é afetada
  assert.equal((await C.contagensDoMes("g@x.br")).geracao, 2);
});

test("exclusão da conta apaga tudo dela e nada das outras", async () => {
  const antesB = await C.lerPerfil("b@x.br");
  const apagados = await C.apagarContaBanco("a@x.br");
  assert.ok(Array.isArray(apagados));
  assert.equal((await linhas("SELECT count(*)::int n FROM usuarios WHERE conta = $1", [conta("a@x.br")]))[0].n, 0);
  assert.equal((await linhas("SELECT count(*)::int n FROM materiais WHERE id = 'mat-AAAA01'"))[0].n, 0);
  const g = await C.apagarContaBanco("g@x.br");
  assert.deepEqual(g.map((m) => m.id).sort(), ["imp-000001", "imp-000002"], "devolve o que tem cópia no Blob");
  assert.equal((await linhas("SELECT count(*)::int n FROM eventos_uso e JOIN usuarios u ON u.id = e.usuario_id WHERE u.conta = $1", [conta("g@x.br")]))[0].n, 0);
  assert.equal((await linhas("SELECT count(*)::int n FROM materiais WHERE id LIKE 'imp-%'"))[0].n, 0);
  assert.deepEqual(await C.lerPerfil("b@x.br"), antesB);
  assert.equal((await C.contagensDoMes("d@x.br")).geracao, 3);
});
