import { createHmac } from "crypto";
import { SEGREDO } from "@/lib/segredo";
import { head, put } from "@vercel/blob";

// Controle de gerações por conta. O registro NÃO guarda e-mail nem nome:
// o caminho é um HMAC do e-mail com a chave secreta do servidor (impossível
// de adivinhar sem ela) e o conteúdo tem só as datas das gerações.
//   LIMITE_GERACOES_MES  — gerações por mês no plano grátis (padrão 5)
//   ADMIN_EMAILS         — e-mails sem limite, separados por vírgula

const mesAtual = () => new Date().toISOString().slice(0, 7); // "2026-09"

export function ehAdmin(email) {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(String(email).toLowerCase());
}

export function limiteDe(email) {
  if (ehAdmin(email)) return Infinity;
  const n = parseInt(process.env.LIMITE_GERACOES_MES || "5", 10);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}

const caminho = (email) =>
  `usuarios/${createHmac("sha256", SEGREDO || "sem-segredo").update(String(email).toLowerCase()).digest("hex").slice(0, 40)}.json`;

async function ler(email) {
  try {
    const meta = await head(caminho(email));
    const res = await fetch(meta.url, { cache: "no-store" });
    return { dados: await res.json(), etag: meta.etag };
  } catch {
    return { dados: { versao: 1, plano: "gratis", geracoes: [] }, etag: null };
  }
}

function resumo(dados, email) {
  const limite = limiteDe(email);
  const usados = (dados.geracoes || []).filter((g) => g.startsWith(mesAtual())).length;
  return { usados, limite: Number.isFinite(limite) ? limite : null, restantes: Number.isFinite(limite) ? Math.max(0, limite - usados) : null, admin: ehAdmin(email) };
}

export async function consultarUso(email) {
  const { dados } = await ler(email);
  return resumo(dados, email);
}

// Reserva uma geração antes de chamar a IA. Escrita condicional (ETag) evita
// que duas abas ao mesmo tempo ultrapassem o limite.
export async function consumirGeracao(email) {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const { dados, etag } = await ler(email);
    const r = resumo(dados, email);
    if (r.restantes === 0) return { ok: false, ...r };
    const novo = { ...dados, geracoes: [...(dados.geracoes || []).slice(-300), new Date().toISOString()] };
    try {
      await put(caminho(email), JSON.stringify(novo), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60,
        ...(etag ? { ifMatch: etag } : {}),
      });
      return { ok: true, ...resumo(novo, email) };
    } catch (e) {
      if (tentativa === 3) throw e; // conflito persistente: deixa a rota responder erro
    }
  }
}

// Ilustração: no máximo uma por geração de texto feita no mês
export async function consumirImagem(email) {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const { dados, etag } = await ler(email);
    const mes = mesAtual();
    const ger = (dados.geracoes || []).filter((g) => g.startsWith(mes)).length;
    const img = (dados.imagens || []).filter((g) => g.startsWith(mes)).length;
    if (img >= ger) return { ok: false };
    const novo = { ...dados, imagens: [...(dados.imagens || []).slice(-300), new Date().toISOString()] };
    try {
      await put(caminho(email), JSON.stringify(novo), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60,
        ...(etag ? { ifMatch: etag } : {}),
      });
      return { ok: true };
    } catch (e) {
      if (tentativa === 3) throw e;
    }
  }
}

// Devolve a geração se a IA falhou (o professor não perde crédito por erro nosso)
export async function devolverGeracao(email) {
  try {
    const { dados, etag } = await ler(email);
    const g = [...(dados.geracoes || [])];
    g.pop();
    await put(caminho(email), JSON.stringify({ ...dados, geracoes: g }), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      ...(etag ? { ifMatch: etag } : {}),
    });
  } catch (e) {
    console.error("Não foi possível devolver a geração:", e);
  }
}
