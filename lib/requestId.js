// request_id: um identificador por pedido, para achar nos registros (logs) da Vercel
// tudo o que aconteceu numa geração. Vai no cabeçalho de resposta "x-request-id" e
// em uma linha JSON por pedido no log. O log NUNCA leva e-mail, nome, texto da
// apostila nem chaves: só id, rota, método, status e duração.
import { randomUUID } from "crypto";
import { registrarEvento } from "./banco.js";

const VALIDO = /^[A-Za-z0-9:_\-.]{8,100}$/;

// Reaproveita o id que chegou (outro serviço ou teste) se for seguro; senão cria um novo
export function obterRequestId(request) {
  const recebido = request?.headers?.get?.("x-request-id");
  if (recebido && VALIDO.test(recebido)) return recebido;
  return randomUUID();
}

export function registrar(dados) {
  console.log(JSON.stringify({ app: "edugera", ...dados }));
}

// Envolve uma rota da API: mede, registra e devolve o x-request-id, sem mudar a resposta.
// Erro inesperado vira 500 com o request_id (para o professor poder informar o código).
export function comRequestId(rota, handler) {
  return async function (request, contexto) {
    const request_id = obterRequestId(request);
    const inicio = Date.now();
    let resposta;
    try {
      resposta = await handler(request, contexto, request_id);
    } catch (e) {
      registrar({ request_id, rota, metodo: request?.method, erro: String(e?.message || e).slice(0, 200) });
      resposta = new Response(JSON.stringify({ error: "Erro interno. Tente novamente.", request_id }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    try {
      resposta.headers.set("x-request-id", request_id);
    } catch {
      /* resposta com cabeçalhos imutáveis: segue sem o cabeçalho */
    }
    const evento = { request_id, rota, metodo: request?.method, status: resposta.status, ms: Date.now() - inicio };
    registrar(evento);
    await registrarEvento(evento); // só grava no banco de TESTE; em produção não faz nada
    return resposta;
  };
}
