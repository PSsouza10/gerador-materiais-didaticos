import { comRequestId } from "@/lib/requestId";
import { exigirLogin, lerCorpo, resposta } from "@/lib/rotaCaderno";
import { criarCaderno, cadernosDoUsuario, ehCoordenador } from "@/lib/cadernos";

// Ciclo de Recomposição: o coordenador cria um caderno (diagnóstico ou reavaliação)
// e lista os seus. Professor comum não cria caderno.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getRota() {
  const { usuario, erro } = await exigirLogin();
  if (erro) return erro;
  if (!(await ehCoordenador(usuario.email))) return resposta({ coordenador: false, cadernos: [] });
  return resposta({ coordenador: true, cadernos: await cadernosDoUsuario(usuario.email) });
}

async function postRota(request) {
  const { usuario, erro } = await exigirLogin();
  if (erro) return erro;
  if (!(await ehCoordenador(usuario.email))) return resposta({ error: "Só coordenadores do piloto criam cadernos." }, 403);
  const { corpo, erro: e2 } = await lerCorpo(request);
  if (e2) return e2;
  const r = await criarCaderno(usuario.email, {
    titulo: corpo.titulo,
    escolas: corpo.escolas,
    avaliacao: corpo.avaliacao,
    tipo: corpo.tipo === "reavaliacao" ? "reavaliacao" : "diagnostico",
    origem: corpo.origem || null,
  });
  if (!r.ok) return resposta({ error: r.erro }, 400);
  return resposta({ codigo: r.codigo });
}

export const GET = comRequestId("/api/cadernos", getRota);
export const POST = comRequestId("/api/cadernos", postRota);
