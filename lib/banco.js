// Banco Postgres (Neon). Regras de isolamento:
//   - teste: só DATABASE_URL_TESTE; produção: só DATABASE_URL_PRODUCAO + BANCO_PRODUCAO=1;
//   - nunca lê DATABASE_URL (uma integração poderia criá-la sozinha);
//   - confere o marcador: a tabela "ambiente" tem de dizer "teste" ou "producao", conforme o ambiente.
import { ehProducao, bancoProducaoLigado, marcadorEsperado } from "./ambiente.js";

// Aceita a string colada com espaços, aspas ou o comando "psql '...'" que o Neon mostra
const extrair = (v) => (String(v || "").match(/postgres(?:ql)?:\/\/[^\s'"]+/) || [null])[0];

// Produção: SÓ DATABASE_URL_PRODUCAO e SÓ com BANCO_PRODUCAO=1 (interruptor da Parte B).
// Fora da produção: SÓ DATABASE_URL_TESTE. Nunca lê DATABASE_URL.
export function urlBanco(env = process.env) {
  if (ehProducao(env)) return bancoProducaoLigado(env) ? extrair(env.DATABASE_URL_PRODUCAO) : null;
  return extrair(env.DATABASE_URL_TESTE);
}

// Cliente injetado só pelos testes automáticos (Postgres em memória, PGlite)
let clienteTeste = null;
export function definirClienteTeste(c) {
  clienteTeste = c;
}

export const bancoLigado = (env = process.env) => !!clienteTeste || !!urlBanco(env);

// Interface única: { consultar(texto, params) → linhas, transacao([[texto, params]]) → [linhas] }
let cliente = null;
async function sql() {
  if (clienteTeste) return clienteTeste;
  const url = urlBanco();
  if (!url) throw new Error("Banco desligado neste ambiente.");
  if (!cliente) {
    const { neon } = await import("@neondatabase/serverless");
    const q = neon(url);
    const c = {
      consultar: (texto, parametros) => q.query(texto, parametros),
      transacao: (lista) => q.transaction(lista.map(([texto, parametros = []]) => q.query(texto, parametros))),
    };
    // Marcador: o banco tem de dizer que é deste ambiente ("teste" ou "producao").
    // Banco ainda sem tabelas (antes da 1ª migração) passa: só o script de migração usa.
    const esperado = marcadorEsperado();
    const linhas = await c.consultar("SELECT nome FROM ambiente LIMIT 1").catch(() => null);
    const marcador = linhas?.[0]?.nome || null;
    if (linhas && marcador !== esperado) throw new Error(`Banco recusado: marcador "${marcador}", esperado "${esperado}".`);
    cliente = c;
  }
  return cliente;
}

export async function consultar(texto, parametros = []) {
  return (await sql()).consultar(texto, parametros);
}

// Várias instruções numa transação só: se uma falhar, nenhuma fica
export async function emTransacao(instrucoes) {
  return (await sql()).transacao(instrucoes);
}

// Qual banco é este? Deve responder "teste"; qualquer outra coisa = não usar.
export async function marcadorDoBanco() {
  try {
    const linhas = await consultar("SELECT nome FROM ambiente LIMIT 1");
    return linhas?.[0]?.nome || null;
  } catch {
    return null;
  }
}

// Registro mínimo de cada pedido (request_id, rota, status, duração) — só no banco de teste.
// Nunca derruba a rota: se o banco estiver fora, segue sem registrar.
export async function registrarEvento({ request_id, rota, metodo, status, ms }) {
  if (!bancoLigado()) return false;
  try {
    await Promise.race([
      consultar("INSERT INTO eventos_requisicao (request_id, rota, metodo, status, duracao_ms) VALUES ($1, $2, $3, $4, $5)", [
        String(request_id).slice(0, 100),
        String(rota).slice(0, 100),
        String(metodo || "").slice(0, 10),
        Number(status) || 0,
        Math.round(Number(ms) || 0),
      ]),
      new Promise((_, falha) => setTimeout(() => falha(new Error("tempo")), 1500)),
    ]);
    return true;
  } catch {
    return false;
  }
}
