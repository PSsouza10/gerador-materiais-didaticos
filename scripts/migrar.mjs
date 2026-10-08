#!/usr/bin/env node
// Migrações do banco de TESTE (Neon).
//   node scripts/migrar.mjs status
//   node scripts/migrar.mjs up                 aplica as que faltam (em transação)
//   node scripts/migrar.mjs down --confirmar   desfaz SÓ a última aplicada
//   --somente-teste: fora do teste, sai sem erro (usado no build da Vercel)
// Recusa produção. Na primeira vez, só aceita um banco VAZIO; depois, só um banco
// cujo marcador (tabela "ambiente") diga "teste".
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { listarMigracoes, lerInstrucoes, podeMigrar, planejar } from "../lib/migracoes.js";
import { consultar, emTransacao, marcadorDoBanco } from "../lib/banco.js";

const [comando = "status", ...flags] = process.argv.slice(2);
const somenteTeste = flags.includes("--somente-teste");
const pasta = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "migracoes");
const sair = (msg, codigo = 1) => {
  console.log(`[migrar] ${msg}`);
  process.exit(codigo);
};

const permissao = podeMigrar();
if (!permissao.ok) sair(`nada feito — ${permissao.motivo}.`, somenteTeste ? 0 : 1);
if (!["status", "up", "down"].includes(comando)) sair(`comando desconhecido: ${comando}`);

await consultar(
  "CREATE TABLE IF NOT EXISTS schema_migrations (nome TEXT PRIMARY KEY, aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now())"
);
const aplicadas = (await consultar("SELECT nome FROM schema_migrations ORDER BY nome")).map((l) => l.nome);
const marcador = await marcadorDoBanco();

// Segurança: banco desconhecido não é tocado
if (aplicadas.length === 0) {
  const outras = await consultar(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> 'schema_migrations'"
  );
  if (outras[0].n > 0) sair("o banco não está vazio e não tem migrações do EduGera: não vou mexer.");
} else if (marcador !== "teste") {
  sair(`o marcador do banco é "${marcador}", não "teste": não vou mexer.`);
}

const todas = listarMigracoes(pasta);
if (comando === "status") {
  for (const m of todas) console.log(`${aplicadas.includes(m.nome) ? "[x]" : "[ ]"} ${m.nome}`);
  sair(`marcador: ${marcador || "(ainda não criado)"}`, 0);
}

if (comando === "down" && !flags.includes("--confirmar")) sair("para desfazer, rode de novo com --confirmar.");

for (const m of planejar(todas, aplicadas, comando)) {
  if (comando === "down" && !m.down) sair(`${m.nome} não tem arquivo .down.sql: não dá para desfazer.`);
  const passos = lerInstrucoes(comando === "up" ? m.up : m.down).map((s) => [s]);
  passos.push(
    comando === "up"
      ? ["INSERT INTO schema_migrations (nome) VALUES ($1)", [m.nome]]
      : ["DELETE FROM schema_migrations WHERE nome = $1", [m.nome]]
  );
  await emTransacao(passos); // tudo ou nada
  console.log(`[migrar] ${comando === "up" ? "aplicada" : "desfeita"}: ${m.nome}`);
}
sair("pronto.", 0);
