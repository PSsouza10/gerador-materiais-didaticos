import { comRequestId } from "@/lib/requestId";
import { exigirLogin, cadernoDoPedido, lerCorpo, resposta } from "@/lib/rotaCaderno";
import { gravarResultado, meusEnvios } from "@/lib/cadernos";
import { validarEnvio } from "@/lib/ciclo";

// O professor envia o resultado da turma: SÓ a contagem de respostas por questão.
// Nenhum nome, número de chamada ou resposta individual chega aqui.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function postRota(request, { params }) {
  const { usuario, erro } = await exigirLogin();
  if (erro) return erro;
  const { caderno, erro: e2 } = await cadernoDoPedido(params, usuario);
  if (e2) return e2;
  if (!caderno.ativo) return resposta({ error: "Este caderno foi encerrado pela coordenação." }, 409);
  const { corpo, erro: e3 } = await lerCorpo(request, 60_000);
  if (e3) return e3;
  const v = validarEnvio(caderno, corpo);
  if (!v.ok) return resposta({ error: v.erro }, 400);
  await gravarResultado(usuario.email, caderno.codigo, v.dados);
  return resposta({ ok: true, envios: await meusEnvios(usuario.email, caderno.codigo) });
}

export const POST = comRequestId("/api/cadernos/[codigo]/resultados", postRota);
