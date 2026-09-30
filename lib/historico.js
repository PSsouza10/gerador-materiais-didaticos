// Histórico "Minhas Apostilas" sincronizado por conta (computador, celular...).
// Guarda só a lista (título, tema, link, chave de revogação), não o conteúdo:
// o material fica em materiais/<id>.json. O caminho é um HMAC do e-mail com a
// chave do servidor, como em lib/uso.js — o arquivo não tem e-mail nem nome.
import { createHmac } from "crypto";
import { head, put } from "@vercel/blob";
import { SEGREDO } from "./segredo.js";

export const LIMITE_ITENS = 200;
const LIMITE_REMOVIDOS = 1000;

const caminho = (email) =>
  `historicos/${createHmac("sha256", SEGREDO || "sem-segredo").update("historico:" + String(email).toLowerCase()).digest("hex").slice(0, 40)}.json`;

const txt = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
const ID = /^[\w-]{6,40}$/;

// Só campos conhecidos, com tamanho limitado; link precisa ser de material (/m/<id>)
export function limparItem(m) {
  if (!m || typeof m !== "object" || !ID.test(m.id || "")) return null;
  if (typeof m.url !== "string" || !/^https?:\/\/[^\s/]+\/m\/[\w-]+$/.test(m.url)) return null;
  const revogado = m.revogado === true;
  return {
    id: m.id,
    url: m.url.slice(0, 200),
    titulo: txt(m.titulo, 200),
    tema: txt(m.tema, 200),
    disciplina: txt(m.disciplina, 60),
    nivel: txt(m.nivel, 60),
    ano: txt(m.ano, 6),
    dificuldade: txt(m.dificuldade, 20),
    bncc: typeof m.bncc === "string" ? m.bncc.slice(0, 20) : null,
    chave: revogado ? null : txt(m.chave, 64) || null,
    revogado,
    criadoEm: txt(m.criadoEm, 40) || new Date().toISOString(),
  };
}

// União por id; "revogado" nunca volta atrás; removidos não reaparecem
export function mesclar(dados, itens = [], removidos = []) {
  const fora = new Set([...(dados.removidos || []), ...removidos.filter((r) => ID.test(r))]);
  const porId = new Map();
  for (const bruto of [...(dados.itens || []), ...itens]) {
    const m = limparItem(bruto);
    if (!m || fora.has(m.id)) continue;
    const antes = porId.get(m.id);
    if (!antes) porId.set(m.id, m);
    else {
      const revogado = antes.revogado || m.revogado;
      porId.set(m.id, { ...antes, ...m, revogado, chave: revogado ? null : m.chave || antes.chave, criadoEm: antes.criadoEm });
    }
  }
  const lista = [...porId.values()].sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm))).slice(0, LIMITE_ITENS);
  return { versao: 1, itens: lista, removidos: [...fora].slice(-LIMITE_REMOVIDOS) };
}

async function ler(email) {
  try {
    const meta = await head(caminho(email));
    const res = await fetch(meta.url, { cache: "no-store" });
    return { dados: await res.json(), etag: meta.etag };
  } catch {
    return { dados: { versao: 1, itens: [], removidos: [] }, etag: null };
  }
}

export async function lerHistorico(email) {
  return (await ler(email)).dados.itens || [];
}

// Escrita condicional (ETag): dois aparelhos ao mesmo tempo não se sobrescrevem
export async function sincronizarHistorico(email, itens, removidos) {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const { dados, etag } = await ler(email);
    const novo = mesclar(dados, itens, removidos);
    if (etag && JSON.stringify(novo) === JSON.stringify({ versao: 1, itens: dados.itens || [], removidos: dados.removidos || [] })) return novo.itens;
    try {
      await put(caminho(email), JSON.stringify(novo), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60,
        ...(etag ? { ifMatch: etag } : {}),
      });
      return novo.itens;
    } catch (e) {
      if (tentativa === 3) throw e;
    }
  }
}
