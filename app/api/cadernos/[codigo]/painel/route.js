import { comRequestId } from "@/lib/requestId";
import { exigirLogin, cadernoDoPedido, resposta } from "@/lib/rotaCaderno";
import { resultadosDoCaderno, reavaliacoesDe } from "@/lib/cadernos";

// Painel do coordenador: o caderno, os envios (escola, turma, nº de alunos e contagens; sem
// professor e sem aluno) e as mini-reavaliações ligadas a ele. A agregação é feita na tela
// (lib/ciclo.js), com o mínimo de 5 alunos por célula.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getRota(_request, { params }) {
  const { usuario, erro } = await exigirLogin();
  if (erro) return erro;
  const { caderno, erro: e2 } = await cadernoDoPedido(params, usuario, { gerir: true });
  if (e2) return e2;
  const { donoId, ...c } = caderno;
  const reavs = c.tipo === "diagnostico" ? await reavaliacoesDe(c.codigo) : [];
  return resposta({
    caderno: c,
    resultados: await resultadosDoCaderno(c.codigo),
    reavaliacoes: await Promise.all(reavs.map(async ({ donoId: _d, ...r }) => ({ ...r, resultados: await resultadosDoCaderno(r.codigo) }))),
  });
}

export const GET = comRequestId("/api/cadernos/[codigo]/painel", getRota);
