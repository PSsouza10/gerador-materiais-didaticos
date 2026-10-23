// Cadernos do Ciclo de Recomposição (banco). Regras puras em lib/ciclo.js.
// O dono do caderno é um coordenador (marcado pelo administrador) ou um administrador.
import { randomInt } from "crypto";
import { consultar } from "./banco.js";
import { usuarioId, contaDe } from "./contas.js";
import { ALFABETO_CODIGO, normalizarEscolas, validarAvaliacaoDoCaderno, LIMITES_CADERNO, codigoValido } from "./ciclo.js";

// Mesma regra de lib/uso.js (ADMIN_EMAILS), sem importar o módulo inteiro
const ehAdmin = (email) =>
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(String(email || "").trim().toLowerCase());

export const novoCodigo = () => Array.from({ length: 8 }, () => ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)]).join("");

export async function ehCoordenador(email) {
  if (!email) return false;
  if (ehAdmin(email)) return true;
  const [l] = await consultar("SELECT coordenador FROM usuarios WHERE conta = $1", [contaDe(email)]);
  return !!l?.coordenador;
}

export async function marcarCoordenador(email, sim = true) {
  const id = await usuarioId(email);
  await consultar("UPDATE usuarios SET coordenador = $2 WHERE id = $1", [id, !!sim]);
  return { ok: true };
}

const linhaParaCaderno = (l) =>
  l && {
    codigo: l.codigo,
    tipo: l.tipo,
    origem: l.origem || null,
    titulo: l.titulo,
    escolas: l.escolas || [],
    avaliacao: l.avaliacao,
    ativo: l.ativo,
    criadoEm: new Date(l.criado_em).toISOString(),
    donoId: Number(l.dono_id),
  };

export async function criarCaderno(email, { titulo, escolas, avaliacao, tipo = "diagnostico", origem = null }) {
  const v = validarAvaliacaoDoCaderno(avaliacao);
  if (!v.ok) return v;
  const lista = normalizarEscolas(escolas);
  const dono = await usuarioId(email);
  let origemOk = null;
  if (tipo === "reavaliacao") {
    const o = await lerCaderno(origem);
    if (!o || o.tipo !== "diagnostico" || (o.donoId !== dono && !ehAdmin(email))) return { ok: false, erro: "Caderno de origem não encontrado." };
    origemOk = o.codigo;
    if (!lista.length) lista.push(...o.escolas);
  } else if (tipo !== "diagnostico") return { ok: false, erro: "Tipo inválido." };
  if (!lista.length) return { ok: false, erro: "Informe pelo menos uma escola." };
  const nome = String(titulo || avaliacao.titulo || "Caderno").replace(/\s+/g, " ").trim().slice(0, LIMITES_CADERNO.titulo);
  for (let t = 0; t < 4; t++) {
    const codigo = novoCodigo();
    try {
      await consultar("INSERT INTO cadernos (codigo, dono_id, tipo, origem, titulo, escolas, avaliacao) VALUES ($1, $2, $3, $4, $5, $6::text[], $7::jsonb)", [
        codigo,
        dono,
        tipo,
        origemOk,
        nome,
        lista,
        JSON.stringify(avaliacao),
      ]);
      return { ok: true, codigo };
    } catch (e) {
      if (!/duplicate|unique/i.test(String(e?.message))) throw e;
    }
  }
  return { ok: false, erro: "Não consegui criar o código. Tente de novo." };
}

export async function lerCaderno(codigo) {
  if (!codigoValido(codigo)) return null;
  const [l] = await consultar("SELECT * FROM cadernos WHERE codigo = $1", [codigo]);
  return linhaParaCaderno(l) || null;
}

// Pode ver o painel e gerar a reavaliação: o dono ou um administrador
export async function podeGerir(email, caderno) {
  if (!caderno || !email) return false;
  if (ehAdmin(email)) return true;
  return caderno.donoId === (await usuarioId(email));
}

export async function cadernosDoUsuario(email) {
  const dono = await usuarioId(email);
  const linhas = await consultar(
    `SELECT c.codigo, c.tipo, c.origem, c.titulo, c.escolas, c.ativo, c.criado_em, c.dono_id,
            jsonb_array_length(c.avaliacao->'itens') AS questoes,
            (SELECT count(*)::int FROM resultados_turma r WHERE r.caderno = c.codigo) AS envios,
            (SELECT coalesce(sum(alunos), 0)::int FROM resultados_turma r WHERE r.caderno = c.codigo) AS alunos
       FROM cadernos c WHERE c.dono_id = $1 ORDER BY c.criado_em DESC LIMIT 100`,
    [dono]
  );
  return linhas.map((l) => ({ ...linhaParaCaderno({ ...l, avaliacao: null }), questoes: Number(l.questoes), envios: l.envios, alunos: l.alunos }));
}

export async function reavaliacoesDe(codigo) {
  const linhas = await consultar("SELECT * FROM cadernos WHERE origem = $1 AND tipo = 'reavaliacao' ORDER BY criado_em DESC", [codigo]);
  return linhas.map(linhaParaCaderno);
}

// Reenviar a mesma turma (mesmo professor, escola e turma) substitui o envio anterior
export async function gravarResultado(email, codigo, { escola, turma, alunos, contagens }) {
  const professor = await usuarioId(email);
  await consultar(
    `INSERT INTO resultados_turma (caderno, professor_id, escola, turma, alunos, contagens)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (caderno, professor_id, escola, turma)
     DO UPDATE SET alunos = EXCLUDED.alunos, contagens = EXCLUDED.contagens, atualizado_em = now()`,
    [codigo, professor, escola, turma, alunos, JSON.stringify(contagens)]
  );
  return { ok: true };
}

// Resultados para o painel: SEM o professor (só escola, turma, alunos e contagens)
export async function resultadosDoCaderno(codigo) {
  const linhas = await consultar("SELECT escola, turma, alunos, contagens, atualizado_em FROM resultados_turma WHERE caderno = $1 ORDER BY escola, turma", [codigo]);
  return linhas.map((l) => ({ escola: l.escola, turma: l.turma, alunos: Number(l.alunos), contagens: l.contagens, atualizadoEm: new Date(l.atualizado_em).toISOString() }));
}

export async function meusEnvios(email, codigo) {
  const professor = await usuarioId(email);
  const linhas = await consultar("SELECT escola, turma, alunos, atualizado_em FROM resultados_turma WHERE caderno = $1 AND professor_id = $2 ORDER BY atualizado_em DESC", [codigo, professor]);
  return linhas.map((l) => ({ escola: l.escola, turma: l.turma, alunos: Number(l.alunos), atualizadoEm: new Date(l.atualizado_em).toISOString() }));
}

export async function encerrarCaderno(codigo) {
  await consultar("UPDATE cadernos SET ativo = false WHERE codigo = $1 OR origem = $1", [codigo]);
  return { ok: true };
}
