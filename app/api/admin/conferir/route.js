import { NextResponse } from "next/server";
import { head } from "@vercel/blob";
import { comRequestId } from "@/lib/requestId";
import { exigirAdmin, baixar, semCache } from "@/lib/admin";
import { bancoLigado } from "@/lib/banco";
import { materiaisDaConta, contagensDoMes, estadoImportacao } from "@/lib/contas";
import { lerHistoricoBlob } from "@/lib/historico";
import { lerUsoBlob } from "@/lib/uso";
import { caminhoBlob } from "@/lib/ambiente";
import { chaveConfere } from "@/lib/chave";
import { compararConta } from "@/lib/inventario";

// Conferência Blob × banco da PRÓPRIA conta do administrador (no teste: a cópia em teste/).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const mes = () => new Date().toISOString().slice(0, 7);

async function getRota() {
  const { u, erro } = await exigirAdmin();
  if (erro) return erro;
  if (!bancoLigado()) return NextResponse.json({ error: "Banco desligado neste ambiente." }, { status: 409, headers: semCache });
  const blob = await lerHistoricoBlob(u.email);
  const conteudos = new Map();
  const itens = (blob.itens || []).filter((m) => m?.id && !m.revogado);
  for (let i = 0; i < itens.length; i += 6) {
    await Promise.all(
      itens.slice(i, i + 6).map(async (m) => {
        try {
          const meta = await head(caminhoBlob(`materiais/${m.id}.json`));
          const registro = JSON.parse(new TextDecoder().decode(await baixar(meta.url)));
          conteudos.set(m.id, { registro, meu: !!registro.chaveHash && chaveConfere(m.chave, registro.chaveHash) });
        } catch {
          conteudos.set(m.id, { registro: null });
        }
      })
    );
  }
  const banco = await materiaisDaConta(u.email);
  const r = compararConta({ blob, conteudos, banco });
  const usoBlob = await lerUsoBlob(u.email);
  const c = await contagensDoMes(u.email);
  const usoMesBlob = (usoBlob.geracoes || []).filter((g) => String(g).startsWith(mes())).length;
  const quebrados = [...conteudos.entries()].filter(([, v]) => !v.registro).map(([id]) => id);
  const aprovado =
    r.idsIguais && r.itensBlob === r.itensBanco && r.ativosBlob === r.ativosBanco && r.revogadosBlob === r.revogadosBanco && r.duplicados === 0 && r.divergentes.length === 0 && usoMesBlob === c.geracao;
  return NextResponse.json(
    { geradoEm: new Date().toISOString(), importacao: await estadoImportacao(u.email), ...r, quebrados, usoMesBlob, usoMesBanco: c.geracao, aprovado },
    { headers: semCache }
  );
}

export const GET = comRequestId("/api/admin/conferir", getRota);
