import { NextResponse } from "next/server";
import { head, del } from "@vercel/blob";
import { comRequestId } from "@/lib/requestId";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { bancoLigado } from "@/lib/banco";
import { lerPerfil, salvarPerfil, apagarContaBanco } from "@/lib/contas";
import { lerHistoricoBlob, caminhoHistorico } from "@/lib/historico";
import { caminhoUso } from "@/lib/uso";
import { caminhoBlob } from "@/lib/ambiente";
import { chaveConfere } from "@/lib/chave";

// Fase 1 — perfil e exclusão da conta.
//   GET    → { banco, perfil }      (perfil só existe com banco)
//   PUT    → salva o perfil         (nome de exibição, escola, disciplinas)
//   DELETE → { confirmar: "EXCLUIR" } apaga a conta e tudo dela (banco e arquivos)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const naoLogado = () => NextResponse.json({ error: "Entre com sua conta." }, { status: 401 });

async function getRota() {
  const u = authConfigurado ? await usuarioAtual() : null;
  if (!u) return naoLogado();
  if (!bancoLigado()) return NextResponse.json({ banco: false, perfil: null });
  return NextResponse.json({ banco: true, perfil: await lerPerfil(u.email) });
}

async function putRota(request) {
  const u = authConfigurado ? await usuarioAtual() : null;
  if (!u) return naoLogado();
  if (!bancoLigado()) return NextResponse.json({ error: "Perfil ainda não disponível." }, { status: 501 });
  const bruto = await request.text();
  if (bruto.length > 5_000) return NextResponse.json({ error: "Dados grandes demais." }, { status: 413 });
  let dados;
  try {
    dados = JSON.parse(bruto || "{}");
  } catch {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }
  return NextResponse.json({ perfil: await salvarPerfil(u.email, dados) });
}

// Apaga um material do Blob só se a chave provar que ele é desta conta
async function apagarMaterialBlob(id, chave) {
  try {
    const meta = await head(caminhoBlob(`materiais/${id}.json`));
    const registro = await (await fetch(meta.url, { cache: "no-store" })).json();
    if (chaveConfere(chave, registro.chaveHash)) {
      await del(meta.url);
      return true;
    }
  } catch {
    /* não existe mais */
  }
  return false;
}

async function apagarArquivo(caminho) {
  try {
    await del((await head(caminho)).url);
  } catch {
    /* não existe */
  }
}

async function deleteRota(request) {
  const u = authConfigurado ? await usuarioAtual() : null;
  if (!u) return naoLogado();
  let corpo = {};
  try {
    corpo = await request.json();
  } catch {
    /* corpo vazio */
  }
  if (corpo.confirmar !== "EXCLUIR") return NextResponse.json({ error: 'Digite EXCLUIR para confirmar.' }, { status: 400 });

  // materiais com cópia no Blob: os da lista antiga + os que o banco conhecia
  const candidatos = new Map();
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const hist = await lerHistoricoBlob(u.email).catch(() => ({}));
    for (const m of hist.itens || []) if (m?.id && m?.chave) candidatos.set(m.id, m.chave);
  }
  if (bancoLigado()) for (const m of await apagarContaBanco(u.email)) candidatos.set(m.id, m.chave);

  // links ativos da conta (no banco e/ou no Blob); todos deixam de abrir
  const materiais = candidatos.size;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    for (const [id, chave] of candidatos) await apagarMaterialBlob(id, chave);
    await apagarArquivo(caminhoHistorico(u.email));
    await apagarArquivo(caminhoUso(u.email));
  }
  // registro sem dados pessoais: só números
  console.log(JSON.stringify({ app: "edugera", evento: "conta_excluida", materiais }));
  return NextResponse.json({ ok: true, materiais });
}

export const GET = comRequestId("/api/conta", getRota);
export const PUT = comRequestId("/api/conta", putRota);
export const DELETE = comRequestId("/api/conta", deleteRota);
