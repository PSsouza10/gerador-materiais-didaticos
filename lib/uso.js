import { createHmac } from "crypto";
import { SEGREDO } from "@/lib/segredo";
import { head, put } from "@vercel/blob";

// Controle de gerações por conta. O registro NÃO guarda e-mail nem nome:
// o caminho é um HMAC do e-mail com a chave secreta do servidor (impossível
// de adivinhar sem ela) e o conteúdo tem só as datas das gerações.
//   LIMITE_GERACOES_MES  — gerações por mês no plano grátis (padrão 5)
//   ADMIN_EMAILS         — e-mails sem limite, separados por vírgula (também têm o Premium)
//   PREMIUM_EMAILS       — e-mails com o visual Premium (capa pôster 3D + páginas no mesmo estilo)

const mesAtual = () => new Date().toISOString().slice(0, 7); // "2026-09"

export function ehAdmin(email) {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(String(email).toLowerCase());
}

// Premium: visual pôster 3D. Enquanto não há cobrança, vale para quem está na lista.
export function ehPremium(email) {
  if (ehAdmin(email)) return true;
  return (process.env.PREMIUM_EMAILS || "")
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
    // ?v= evita a cópia de até 60 s guardada na CDN do Blob (contagem desatualizada)
    const res = await fetch(`${meta.url}?v=${Date.now()}`, { cache: "no-store" });
    return { dados: await res.json(), etag: meta.etag };
  } catch {
    return { dados: { versao: 1, plano: "gratis", geracoes: [] }, etag: null };
  }
}

function resumo(dados, email) {
  const limite = limiteDe(email);
  const usados = (dados.geracoes || []).filter((g) => g.startsWith(mesAtual())).length;
  return { usados, limite: Number.isFinite(limite) ? limite : null, restantes: Number.isFinite(limite) ? Math.max(0, limite - usados) : null, admin: ehAdmin(email), premium: ehPremium(email) };
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
// Correção de um exercício só (bem barata): até LIMITE_CORRECOES_MES por mês (padrão 60); admin sem limite
export async function consumirCorrecao(email) {
  const limite = ehAdmin(email) ? Infinity : parseInt(process.env.LIMITE_CORRECOES_MES || "60", 10) || 60;
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const { dados, etag } = await ler(email);
    const usadas = (dados.correcoes || []).filter((g) => g.startsWith(mesAtual())).length;
    if (usadas >= limite) return { ok: false, limite };
    const novo = { ...dados, correcoes: [...(dados.correcoes || []).slice(-300), new Date().toISOString()] };
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

export async function consumirImagem(email) {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const { dados, etag } = await ler(email);
    const mes = mesAtual();
    const ger = (dados.geracoes || []).filter((g) => g.startsWith(mes)).length;
    const img = (dados.imagens || []).filter((g) => g.startsWith(mes)).length;
    // folga de 1: se a leitura ainda não enxergar a geração que acabou de ser registrada,
    // a ilustração não é recusada (antes, isso fazia o material sair sem imagem)
    if (img > ger) return { ok: false };
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
export const devolverGeracao = (email) => devolver(email, "geracoes");
// Idem para a ilustração: se ela falhar, o professor pode tentar de novo
export const devolverImagem = (email) => devolver(email, "imagens");

async function devolver(email, campo) {
  try {
    const { dados, etag } = await ler(email);
    const g = [...(dados[campo] || [])];
    g.pop();
    await put(caminho(email), JSON.stringify({ ...dados, [campo]: g }), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      ...(etag ? { ifMatch: etag } : {}),
    });
  } catch (e) {
    console.error(`Não foi possível devolver (${campo}):`, e);
  }
}
