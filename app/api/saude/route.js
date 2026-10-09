import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { ambiente, ehProducao, iaSimulada, PREFIXO_TESTE } from "@/lib/ambiente";
import { bancoLigado, marcadorDoBanco, consultar } from "@/lib/banco";

// Verificação do ambiente de TESTE (Fase 0). Em produção esta página não existe (404).
// Não mostra chaves nem endereços: só o que comprova o isolamento.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

async function getRota(_request, _contexto, request_id) {
  if (ehProducao()) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  const ligado = bancoLigado();
  const marcador = ligado ? await marcadorDoBanco() : null;
  // quais migrações já rodaram neste banco (só nomes)
  const migracoes = marcador === "teste" ? await consultar("SELECT nome FROM schema_migrations ORDER BY nome").then((l) => l.map((x) => x.nome)).catch(() => null) : null;
  return NextResponse.json({
    ambiente: ambiente(),
    request_id,
    iaSimulada: iaSimulada(),
    blob: { prefixo: PREFIXO_TESTE, tokenConfigurado: !!process.env.BLOB_READ_WRITE_TOKEN },
    banco: {
      configurado: ligado,
      marcador,
      ok: marcador === "teste",
      migracoes,
      // diagnóstico sem expor o valor: só se a variável existe e se tem "postgres" dentro
      variavel: !process.env.DATABASE_URL_TESTE ? "ausente" : /postgres(ql)?:\/\//.test(process.env.DATABASE_URL_TESTE) ? "ok" : "formato inesperado",
    },
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || null,
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,
  });
}

export const GET = comRequestId("/api/saude", getRota);
