// Rotas de administrador (Parte B): só e-mails em ADMIN_EMAILS, conferidos NO SERVIDOR pela sessão.
// Nunca aceitam e-mail ou conta por parâmetro: vale sempre a conta da sessão.
import { list } from "@vercel/blob";
import { NextResponse } from "next/server";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { ehAdmin } from "@/lib/uso";
import { PREFIXO_TESTE } from "@/lib/ambiente";

export async function exigirAdmin() {
  const u = authConfigurado ? await usuarioAtual() : null;
  if (!u) return { erro: NextResponse.json({ error: "Entre com sua conta." }, { status: 401, headers: { "Cache-Control": "no-store" } }) };
  if (!ehAdmin(u.email)) return { erro: NextResponse.json({ error: "Somente administrador." }, { status: 403, headers: { "Cache-Control": "no-store" } }) };
  return { u };
}

export const PASTAS_REAIS = ["usuarios/", "historicos/", "materiais/", "apostilas/", "revogados/"];

// Lista arquivos do Blob. escopo "real": tudo fora de teste/ e backup/; "teste": só teste/
export async function listarArquivos(escopo = "real") {
  const prefixos = escopo === "teste" ? PASTAS_REAIS.map((p) => PREFIXO_TESTE + p) : PASTAS_REAIS;
  const todos = [];
  for (const prefix of prefixos) {
    let cursor;
    do {
      const r = await list({ prefix, cursor, limit: 1000 });
      todos.push(...r.blobs);
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
  }
  return todos;
}

export async function baixar(url) {
  const res = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`arquivo indisponível (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

export const semCache = { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex" };
