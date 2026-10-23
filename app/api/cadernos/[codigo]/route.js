import { comRequestId } from "@/lib/requestId";
import { exigirLogin, cadernoDoPedido, resposta } from "@/lib/rotaCaderno";
import { meusEnvios } from "@/lib/cadernos";

// O professor abre o caderno pelo código e o adiciona às suas avaliações (precisa de login).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getRota(_request, { params }) {
  const { usuario, erro } = await exigirLogin();
  if (erro) return erro;
  const { caderno, podeGerirEste, erro: e2 } = await cadernoDoPedido(params, usuario);
  if (e2) return e2;
  const { donoId, ...publico } = caderno;
  return resposta({ caderno: publico, gerir: podeGerirEste, envios: await meusEnvios(usuario.email, caderno.codigo) });
}

export const GET = comRequestId("/api/cadernos/[codigo]", getRota);
