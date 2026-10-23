// Pedaços comuns das rotas /api/cadernos (só no servidor)
import { NextResponse } from "next/server";
import { authConfigurado, usuarioAtual } from "./auth.js";
import { bancoLigado } from "./banco.js";
import { lerCaderno, podeGerir } from "./cadernos.js";
import { normalizarCodigo } from "./ciclo.js";

export const semCache = { "Cache-Control": "no-store" };
export const resposta = (corpo, status = 200) => NextResponse.json(corpo, { status, headers: semCache });

// Sessão + banco. Devolve { usuario } ou { erro: Response }
export async function exigirLogin() {
  if (!authConfigurado) return { erro: resposta({ error: "Login não configurado." }, 503) };
  if (!bancoLigado()) return { erro: resposta({ error: "Recurso indisponível neste ambiente." }, 503) };
  const usuario = await usuarioAtual();
  if (!usuario) return { erro: resposta({ error: "Entre com sua conta." }, 401) };
  return { usuario };
}

// Caderno do endereço; com gerir=true, só o dono ou um administrador
export async function cadernoDoPedido(params, usuario, { gerir = false } = {}) {
  const caderno = await lerCaderno(normalizarCodigo(params?.codigo));
  if (!caderno) return { erro: resposta({ error: "Caderno não encontrado. Confira o código." }, 404) };
  const podeGerirEste = await podeGerir(usuario.email, caderno);
  if (gerir && !podeGerirEste) return { erro: resposta({ error: "Só quem criou o caderno vê o painel." }, 403) };
  return { caderno, podeGerirEste };
}

export async function lerCorpo(request, max = 450_000) {
  const bruto = await request.text();
  if (bruto.length > max) return { erro: resposta({ error: "Pedido grande demais." }, 413) };
  try {
    return { corpo: JSON.parse(bruto || "{}") };
  } catch {
    return { erro: resposta({ error: "Pedido inválido." }, 400) };
  }
}
