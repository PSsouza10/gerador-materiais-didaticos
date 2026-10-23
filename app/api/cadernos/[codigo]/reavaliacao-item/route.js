import { comRequestId } from "@/lib/requestId";
import { exigirLogin, cadernoDoPedido, lerCorpo, resposta } from "@/lib/rotaCaderno";
import { temGemini, temOpenAI } from "@/lib/provedoresIA";
import { novaQuestao } from "@/lib/novaQuestao";
import { MAX_ITENS_REAVALIACAO } from "@/lib/ciclo";

// Mini-reavaliação: UMA questão nova no lugar da questão `indice` do caderno diagnóstico
// (mesma habilidade, descritor e nível; não repete nenhuma do caderno nem as já feitas).
// A tela chama uma vez por questão. Só o dono do caderno ou um administrador.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function postRota(request, { params }) {
  const t0 = Date.now();
  if (!temOpenAI() && !temGemini()) return resposta({ error: "IA não configurada." }, 500);
  const { usuario, erro } = await exigirLogin();
  if (erro) return erro;
  const { caderno, erro: e2 } = await cadernoDoPedido(params, usuario, { gerir: true });
  if (e2) return e2;
  if (caderno.tipo !== "diagnostico") return resposta({ error: "A reavaliação parte do caderno diagnóstico." }, 400);
  const { corpo, erro: e3 } = await lerCorpo(request, 200_000);
  if (e3) return e3;
  const itens = caderno.avaliacao.itens;
  const indice = Number(corpo.indice);
  const novos = Array.isArray(corpo.novos) ? corpo.novos.filter((x) => x && typeof x === "object" && typeof x.comando === "string").slice(0, MAX_ITENS_REAVALIACAO) : [];
  if (!Number.isInteger(indice) || indice < 0 || indice >= itens.length) return resposta({ error: "Questão inválida." }, 400);
  // a prova "vista" pela troca: o caderno + as novas já aceitas (para não repetir nenhuma)
  const av = { ...caderno.avaliacao, itens: [...itens, ...novos] };
  const { item, diag } = await novaQuestao(av, indice, { t0 });
  if (!item) {
    console.error("Reavaliação: nenhuma questão passou", { codigo: caderno.codigo, indice, diag });
    return resposta({ error: `Não consegui uma questão nova para a questão ${indice + 1}. Tente de novo.` }, 502);
  }
  return resposta({ item: { ...item, trocada: undefined } });
}

export const POST = comRequestId("/api/cadernos/[codigo]/reavaliacao-item", postRota);
