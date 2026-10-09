import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { exigirAdmin, listarArquivos, baixar, semCache } from "@/lib/admin";
import { inventariar } from "@/lib/inventario";
import { ehProducao } from "@/lib/ambiente";

// Inventário (só números): contas, listas, itens, links ativos/revogados, órfãos, quebrados, duplicados.
// ?escopo=teste só existe fora da produção (conta os arquivos de teste/).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function getRota(request) {
  const { erro } = await exigirAdmin();
  if (erro) return erro;
  const escopo = !ehProducao() && new URL(request.url).searchParams.get("escopo") === "teste" ? "teste" : "real";
  const arquivos = await listarArquivos(escopo);
  const pasta = (b) => b.pathname.replace(/^teste\//, "").split("/")[0];
  const id = (b) => b.pathname.split("/").pop().replace(/\.json$/, "");
  const historicos = [];
  for (const b of arquivos.filter((b) => pasta(b) === "historicos")) {
    try {
      historicos.push(JSON.parse(new TextDecoder().decode(await baixar(b.url))));
    } catch {
      historicos.push({ ilegivel: true });
    }
  }
  const porPasta = {};
  for (const b of arquivos) porPasta[pasta(b)] = (porPasta[pasta(b)] || 0) + 1;
  const numeros = inventariar({
    historicos,
    materiais: new Set(arquivos.filter((b) => pasta(b) === "materiais").map(id)),
    lapides: new Set(arquivos.filter((b) => pasta(b) === "revogados").map(id)),
  });
  return NextResponse.json(
    {
      escopo,
      geradoEm: new Date().toISOString(),
      porPasta,
      contas: porPasta.usuarios || 0,
      bytes: arquivos.reduce((s, b) => s + b.size, 0),
      listasIlegiveis: historicos.filter((h) => h.ilegivel).length,
      ...numeros,
    },
    { headers: semCache }
  );
}

export const GET = comRequestId("/api/admin/inventario", getRota);
