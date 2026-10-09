import { NextResponse } from "next/server";
import { head, put } from "@vercel/blob";
import { comRequestId } from "@/lib/requestId";
import { exigirAdmin, baixar, semCache } from "@/lib/admin";
import { ehProducao, caminhoBlob } from "@/lib/ambiente";
import { bancoLigado } from "@/lib/banco";
import { apagarContaBanco, importarDoBlob, reabrirImportacao, estadoImportacao, listarMateriais } from "@/lib/contas";
import { caminhoHistoricoBruto, lerHistoricoBlob } from "@/lib/historico";
import { caminhoUsoBruto, lerUsoBlob } from "@/lib/uso";
import { esquecerImportacao } from "@/lib/importacao";

// ENSAIO da Parte B — só no site de TESTE (em produção: 404). Age só na conta do administrador.
//   preparar: zera a conta no banco de teste e copia os arquivos REAIS dela para teste/ (o real só é lido)
//   falha:    importa com um corte por tempo simulado (deve dar "falhou" e nada no banco)
//   simultaneo: 6 importações ao mesmo tempo (deve importar 1 vez)
//   reabrir:  volta a conta para "pendente" (religar depois de rollback)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function materialTeste(id) {
  const meta = await head(caminhoBlob(`materiais/${id}.json`));
  return JSON.parse(new TextDecoder().decode(await baixar(meta.url)));
}

async function copiar(caminhoReal) {
  try {
    const meta = await head(caminhoReal); // arquivo REAL: só leitura
    const dados = await baixar(meta.url);
    await put(caminhoBlob(caminhoReal), dados, { access: "public", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
    return dados;
  } catch {
    return null;
  }
}

async function postRota(request) {
  if (ehProducao()) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  const { u, erro } = await exigirAdmin();
  if (erro) return erro;
  if (!bancoLigado()) return NextResponse.json({ error: "Banco de teste desligado." }, { status: 409, headers: semCache });
  const acao = new URL(request.url).searchParams.get("acao");
  const fontes = { historico: lerHistoricoBlob, uso: lerUsoBlob, material: materialTeste };

  if (acao === "preparar") {
    await apagarContaBanco(u.email); // só o banco de TESTE
    esquecerImportacao(u.email);
    const hist = await copiar(caminhoHistoricoBruto(u.email));
    const uso = await copiar(caminhoUsoBruto(u.email));
    const itens = hist ? JSON.parse(new TextDecoder().decode(hist)).itens || [] : [];
    let copiados = 0, semArquivo = 0;
    for (let i = 0; i < itens.length; i += 6)
      await Promise.all(
        itens.slice(i, i + 6).map(async (m) => {
          if (m.revogado) return;
          (await copiar(`materiais/${m.id}.json`)) ? copiados++ : semArquivo++;
        })
      );
    return NextResponse.json({ acao, lista: !!hist, uso: !!uso, itens: itens.length, materiaisCopiados: copiados, semArquivo }, { headers: semCache });
  }
  if (acao === "falha") {
    const lento = { ...fontes, material: () => new Promise((ok) => setTimeout(() => ok(null), 3000)) };
    let mensagem = null;
    try {
      await importarDoBlob(u.email, lento, { orcamentoMs: 200 });
    } catch (e) {
      mensagem = String(e?.message || e);
    }
    return NextResponse.json({ acao, erro: mensagem, estado: await estadoImportacao(u.email), materiaisNoBanco: (await listarMateriais(u.email)).length }, { headers: semCache });
  }
  if (acao === "simultaneo") {
    esquecerImportacao(u.email);
    const r = await Promise.allSettled(Array.from({ length: 6 }, () => importarDoBlob(u.email, fontes)));
    return NextResponse.json(
      {
        acao,
        executaram: r.filter((x) => x.status === "fulfilled" && x.value.importado).length,
        aguardaram: r.filter((x) => x.status === "fulfilled" && !x.value.importado).length,
        erros: r.filter((x) => x.status === "rejected").map((x) => String(x.reason?.message || x.reason)),
        estado: await estadoImportacao(u.email),
        materiaisNoBanco: (await listarMateriais(u.email)).length,
      },
      { headers: semCache }
    );
  }
  if (acao === "reabrir") {
    await reabrirImportacao(u.email);
    esquecerImportacao(u.email);
    return NextResponse.json({ acao, estado: await estadoImportacao(u.email) }, { headers: semCache });
  }
  return NextResponse.json({ error: "acao: preparar | falha | simultaneo | reabrir" }, { status: 400 });
}

export const POST = comRequestId("/api/admin/ensaio", postRota);
