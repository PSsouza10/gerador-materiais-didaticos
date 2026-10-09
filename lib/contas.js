// Fase 1 — contas, materiais e uso no banco (Postgres).
// Só é usado quando o banco está ligado (hoje: só no site de teste). Sem banco,
// o EduGera continua usando o Vercel Blob como antes (lib/uso.js, lib/historico.js).
//
// Isolamento entre professores: TODA consulta filtra pelo usuario_id da conta
// logada; não existe função que leia material de outra conta (exceto o link
// público /m/<id>, que só devolve o conteúdo já compartilhado).
// O e-mail não é gravado: a conta é um HMAC do e-mail com a chave do servidor.
import { createHmac } from "crypto";
import { consultar, emTransacao } from "./banco.js";
import { SEGREDO } from "./segredo.js";
import { limparItem, LIMITE_ITENS } from "./historico.js";
import { chaveConfere } from "./chave.js";

export const TIPOS_USO = ["geracao", "correcao", "revisao", "imagem"];
const SEM_LIMITE = 2147483647;

export const contaDe = (email) =>
  createHmac("sha256", SEGREDO || "sem-segredo").update("conta:" + String(email).trim().toLowerCase()).digest("hex").slice(0, 40);

// Início do mês em UTC (mesma regra do contador antigo: "2026-10")
export const inicioDoMes = (agora = new Date()) => new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1)).toISOString();

// Cria a conta no 1º acesso; nos seguintes só atualiza o "último acesso"
export async function usuarioId(email) {
  if (!email) throw new Error("Conta sem e-mail.");
  const [linha] = await consultar(
    "INSERT INTO usuarios (conta) VALUES ($1) ON CONFLICT (conta) DO UPDATE SET ultimo_acesso_em = now() RETURNING id",
    [contaDe(email)]
  );
  return Number(linha.id);
}

// ---------- uso (eventos no lugar dos contadores) ----------

export async function contagensDoMes(email) {
  const id = await usuarioId(email);
  const linhas = await consultar(
    "SELECT tipo, count(*)::int AS n FROM eventos_uso WHERE usuario_id = $1 AND criado_em >= $2 GROUP BY tipo",
    [id, inicioDoMes()]
  );
  const c = Object.fromEntries(TIPOS_USO.map((t) => [t, 0]));
  for (const l of linhas) c[l.tipo] = Number(l.n);
  return c;
}

// Reserva um uso se ainda houver saldo. A trava (advisory lock) impede que
// duas abas ao mesmo tempo passem do limite.
export async function consumir(email, tipo, limite) {
  if (!TIPOS_USO.includes(tipo)) throw new Error("Tipo de uso inválido.");
  const id = await usuarioId(email);
  const teto = Number.isFinite(limite) ? Math.max(0, Math.floor(limite)) : SEM_LIMITE;
  const condicao =
    tipo === "imagem"
      ? // ilustração: no máximo uma por geração de texto do mês (folga igual à regra antiga)
        "(SELECT count(*) FROM eventos_uso WHERE usuario_id = $1 AND tipo = 'imagem' AND criado_em >= $3) <= (SELECT count(*) FROM eventos_uso WHERE usuario_id = $1 AND tipo = 'geracao' AND criado_em >= $3)"
      : "(SELECT count(*) FROM eventos_uso WHERE usuario_id = $1 AND tipo = $2 AND criado_em >= $3) < $4::bigint";
  const params = tipo === "imagem" ? [id, tipo, inicioDoMes()] : [id, tipo, inicioDoMes(), teto];
  const [, inserido] = await emTransacao([
    ["SELECT pg_advisory_xact_lock($1::bigint)", [id]],
    [`INSERT INTO eventos_uso (usuario_id, tipo) SELECT $1, $2 WHERE ${condicao} RETURNING id`, params],
  ]);
  return { ok: inserido.length > 0 };
}

// Devolve o último uso (a IA falhou: o professor não perde crédito)
export async function devolver(email, tipo) {
  const id = await usuarioId(email);
  await consultar(
    "DELETE FROM eventos_uso WHERE id = (SELECT id FROM eventos_uso WHERE usuario_id = $1 AND tipo = $2 ORDER BY id DESC LIMIT 1)",
    [id, tipo]
  );
}

// ---------- materiais ("Minhas Apostilas" + link /m/<id>) ----------

const paraItem = (l) => ({
  id: l.id,
  url: l.url,
  titulo: l.titulo,
  tema: l.tema,
  disciplina: l.disciplina,
  nivel: l.nivel,
  ano: l.ano,
  dificuldade: l.dificuldade,
  bncc: l.bncc || null,
  chave: l.revogado ? null : l.chave || null,
  revogado: !!l.revogado,
  criadoEm: new Date(l.criado_em).toISOString(),
});

export async function listarMateriais(email) {
  const id = await usuarioId(email);
  const linhas = await consultar(
    "SELECT * FROM materiais WHERE usuario_id = $1 AND NOT removido ORDER BY criado_em DESC LIMIT $2",
    [id, LIMITE_ITENS]
  );
  return linhas.map(paraItem);
}

// Grava o material recém-gerado (conteúdo do link público + item da lista)
export async function gravarMaterial(email, { id, url, chave, chaveHash, registro }) {
  const uid = await usuarioId(email);
  const f = registro?.form || {};
  await consultar(
    `INSERT INTO materiais (id, usuario_id, url, titulo, tema, disciplina, nivel, ano, dificuldade, bncc, chave, chave_hash, conteudo, criado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      id,
      uid,
      url,
      String(registro?.material?.tituloDidatico || f.tema || "").slice(0, 200),
      String(f.tema || "").slice(0, 200),
      String(f.disciplina || "").slice(0, 60),
      String(f.nivel || "").slice(0, 60),
      String(f.ano || "").slice(0, 6),
      String(f.dificuldade || "").slice(0, 20),
      registro?.material?.bncc?.codigo || null,
      chave,
      chaveHash,
      JSON.stringify(registro),
      registro?.criadoEm || new Date().toISOString(),
    ]
  );
}

const UPSERT_ITEM = `INSERT INTO materiais (id, usuario_id, url, titulo, tema, disciplina, nivel, ano, dificuldade, bncc, chave, revogado, criado_em)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  ON CONFLICT (id) DO UPDATE SET
    titulo = EXCLUDED.titulo, tema = EXCLUDED.tema, disciplina = EXCLUDED.disciplina, nivel = EXCLUDED.nivel,
    ano = EXCLUDED.ano, dificuldade = EXCLUDED.dificuldade, bncc = COALESCE(EXCLUDED.bncc, materiais.bncc),
    revogado = materiais.revogado OR EXCLUDED.revogado,
    chave = CASE WHEN materiais.revogado OR EXCLUDED.revogado THEN NULL ELSE COALESCE(EXCLUDED.chave, materiais.chave) END,
    atualizado_em = now()
  WHERE materiais.usuario_id = EXCLUDED.usuario_id AND NOT materiais.removido`;

const paramsItem = (uid, m) => [m.id, uid, m.url, m.titulo, m.tema, m.disciplina, m.nivel, m.ano, m.dificuldade, m.bncc, m.chave, m.revogado, m.criadoEm];

// Junta a lista do navegador com a da conta (mesmas regras do histórico antigo):
// "revogado" nunca volta atrás e item removido não reaparece.
// Um id de OUTRA conta nunca é alterado (o WHERE do upsert bloqueia).
export async function sincronizarMateriais(email, itens = [], removidos = []) {
  const uid = await usuarioId(email);
  const limpos = itens.map(limparItem).filter(Boolean).slice(0, LIMITE_ITENS);
  const fora = removidos.filter((r) => typeof r === "string" && /^[\w-]{6,40}$/.test(r)).slice(0, LIMITE_ITENS);
  const lista = [
    ...limpos.filter((m) => !fora.includes(m.id)).map((m) => [UPSERT_ITEM, paramsItem(uid, m)]),
    ...(fora.length
      ? [
          ["UPDATE materiais SET removido = true, atualizado_em = now() WHERE usuario_id = $1 AND id = ANY($2::text[])", [uid, fora]],
          [
            "INSERT INTO materiais (id, usuario_id, removido) SELECT x, $1, true FROM unnest($2::text[]) AS x ON CONFLICT (id) DO NOTHING",
            [uid, fora],
          ],
        ]
      : []),
  ];
  if (lista.length) await emTransacao(lista);
  return listarMateriais(email);
}

// Link público: só o conteúdo de material compartilhado e não revogado
export async function materialPublico(id) {
  const [l] = await consultar("SELECT conteudo FROM materiais WHERE id = $1 AND NOT revogado AND conteudo IS NOT NULL", [id]);
  if (!l) return null;
  return typeof l.conteudo === "string" ? JSON.parse(l.conteudo) : l.conteudo;
}

// Revogar: exige a chave (como antes). null = o banco não conhece este material.
export async function revogarMaterial(id, chave) {
  const [l] = await consultar("SELECT chave_hash, revogado FROM materiais WHERE id = $1 AND chave_hash IS NOT NULL", [id]);
  if (!l) return null;
  if (l.revogado) return { ok: true, jaRevogado: true };
  if (!chaveConfere(chave, l.chave_hash)) return { ok: false };
  // revogação LÓGICA: o conteúdo fica guardado (retenção); o link deixa de abrir
  await consultar("UPDATE materiais SET revogado = true, chave = NULL, atualizado_em = now() WHERE id = $1", [id]);
  return { ok: true };
}

// O que o banco sabe deste link: "revogado" (404 sem consultar o Blob), "conteudo", "sem_conteudo" ou null
export async function situacaoMaterial(id) {
  const [l] = await consultar("SELECT revogado, conteudo IS NOT NULL AS tem FROM materiais WHERE id = $1 AND NOT removido", [id]);
  if (!l) return null;
  return l.revogado ? "revogado" : l.tem ? "conteudo" : "sem_conteudo";
}

// Conferência (admin, só a própria conta): o que o banco tem, linha a linha
export async function materiaisDaConta(email) {
  const id = await usuarioId(email);
  return consultar(
    "SELECT id, revogado, removido, chave IS NOT NULL AS tem_chave, chave_hash, conteudo FROM materiais WHERE usuario_id = $1",
    [id]
  );
}

export async function estadoImportacao(email) {
  const [l] = await consultar("SELECT importacao_status, importado_em FROM usuarios WHERE conta = $1", [contaDe(email)]);
  return l ? { status: l.importacao_status, importadoEm: l.importado_em ? new Date(l.importado_em).toISOString() : null } : null;
}

// ---------- perfil ----------

const txt = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function lerPerfil(email) {
  const id = await usuarioId(email);
  const [l] = await consultar("SELECT nome_exibicao, escola, disciplinas, criado_em FROM usuarios WHERE id = $1", [id]);
  return { nomeExibicao: l.nome_exibicao || "", escola: l.escola || "", disciplinas: l.disciplinas || [], criadoEm: new Date(l.criado_em).toISOString() };
}

export async function salvarPerfil(email, perfil = {}) {
  const id = await usuarioId(email);
  const disciplinas = (Array.isArray(perfil.disciplinas) ? perfil.disciplinas : []).map((d) => txt(d, 60)).filter(Boolean).slice(0, 10);
  await consultar("UPDATE usuarios SET nome_exibicao = $2, escola = $3, disciplinas = $4::text[] WHERE id = $1", [
    id,
    txt(perfil.nomeExibicao, 120) || null,
    txt(perfil.escola, 120) || null,
    disciplinas,
  ]);
  return lerPerfil(email);
}

// ---------- exclusão da conta ----------

// Apaga a conta e TUDO dela no banco (materiais e eventos vão junto, ON DELETE CASCADE).
// Devolve os materiais que tinham chave, para a rota apagar também as cópias no Blob.
export async function apagarContaBanco(email) {
  const conta = contaDe(email);
  const materiais = await consultar(
    "SELECT m.id, m.chave FROM materiais m JOIN usuarios u ON u.id = m.usuario_id WHERE u.conta = $1 AND m.chave IS NOT NULL",
    [conta]
  );
  await consultar("DELETE FROM usuarios WHERE conta = $1", [conta]);
  return materiais.map((m) => ({ id: m.id, chave: m.chave }));
}

// ---------- importação do Blob (uma vez por conta) ----------

// Importação com trava e status (Parte B):
//   pendente → em_andamento → concluida | falhou
// - reserva atômica: só uma chamada importa; travada há mais de 5 min pode ser retomada;
// - busca no Blob com prazo (orçamento) e em paralelo (6 por vez);
// - dados + "concluida" na MESMA transação, com trava por conta: entra tudo ou nada.
// fontes: { historico(email) → {itens, removidos}, uso(email) → {geracoes, ...}, material(id) → registro | null }
async function emLotes(lista, tamanho, fn) {
  const saida = new Array(lista.length);
  for (let i = 0; i < lista.length; i += tamanho) {
    const parte = await Promise.all(lista.slice(i, i + tamanho).map((x, j) => fn(x, i + j)));
    parte.forEach((v, j) => (saida[i + j] = v));
  }
  return saida;
}

export async function importarDoBlob(email, fontes, { orcamentoMs = 10000 } = {}) {
  const uid = await usuarioId(email);
  const [reservado] = await consultar(
    `UPDATE usuarios SET importacao_status = 'em_andamento', importacao_inicio = now()
     WHERE id = $1 AND importado_em IS NULL
       AND (importacao_status IN ('pendente', 'falhou')
            OR (importacao_status = 'em_andamento' AND importacao_inicio < now() - interval '5 minutes'))
     RETURNING id`,
    [uid]
  );
  if (!reservado) {
    const [l] = await consultar("SELECT importado_em, importacao_status FROM usuarios WHERE id = $1", [uid]);
    return { importado: false, status: l?.importado_em ? "concluida" : l?.importacao_status || "pendente" };
  }
  let relogio;
  try {
    const coletar = async () => {
      const [hist, uso] = await Promise.all([fontes.historico(email), fontes.uso(email)]);
      const itens = ((hist || {}).itens || []).map(limparItem).filter(Boolean).slice(0, LIMITE_ITENS);
      const registros = await emLotes(itens, 6, (m) => (m.revogado ? null : fontes.material(m.id).catch(() => null)));
      return { hist: hist || {}, uso: uso || {}, itens, registros };
    };
    const prazo = new Promise((_, falha) => (relogio = setTimeout(() => falha(new Error("tempo esgotado na importação")), orcamentoMs)));
    const { hist, uso, itens, registros } = await Promise.race([coletar(), prazo]);
    clearTimeout(relogio);

    const instr = [["SELECT pg_advisory_xact_lock($1::bigint)", [uid]]];
    let comConteudo = 0;
    itens.forEach((m, i) => {
      const registro = registros[i];
      if (registro) {
        const { chaveHash, ...conteudo } = registro;
        // só traz o conteúdo se a chave da lista confere: prova que o material é desta conta
        const meu = chaveHash && chaveConfere(m.chave, chaveHash);
        instr.push([
          `INSERT INTO materiais (id, usuario_id, url, titulo, tema, disciplina, nivel, ano, dificuldade, bncc, chave, chave_hash, revogado, conteudo, criado_em)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT (id) DO UPDATE SET
             usuario_id = EXCLUDED.usuario_id, url = EXCLUDED.url, titulo = EXCLUDED.titulo, tema = EXCLUDED.tema,
             disciplina = EXCLUDED.disciplina, nivel = EXCLUDED.nivel, ano = EXCLUDED.ano, dificuldade = EXCLUDED.dificuldade,
             bncc = EXCLUDED.bncc, chave = EXCLUDED.chave, chave_hash = EXCLUDED.chave_hash, conteudo = EXCLUDED.conteudo,
             revogado = EXCLUDED.revogado, removido = false, criado_em = EXCLUDED.criado_em, atualizado_em = now()
           -- quem prova a chave toma o lugar de um registro sem prova (ex.: outra conta colou o mesmo link)
           WHERE materiais.chave_hash IS NULL AND EXCLUDED.chave_hash IS NOT NULL`,
          [...paramsItem(uid, m).slice(0, 11), meu ? chaveHash : null, m.revogado, meu ? JSON.stringify(conteudo) : null, m.criadoEm],
        ]);
        if (meu) comConteudo++;
      } else {
        instr.push([
          `INSERT INTO materiais (id, usuario_id, url, titulo, tema, disciplina, nivel, ano, dificuldade, bncc, chave, revogado, criado_em)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (id) DO NOTHING`,
          paramsItem(uid, m),
        ]);
      }
    });
    const removidos = (hist.removidos || []).filter((r) => typeof r === "string" && /^[\w-]{6,40}$/.test(r)).slice(-1000);
    if (removidos.length)
      instr.push([
        "INSERT INTO materiais (id, usuario_id, removido) SELECT x, $1, true FROM unnest($2::text[]) AS x ON CONFLICT (id) DO NOTHING",
        [uid, removidos],
      ]);
    const campos = { geracoes: "geracao", correcoes: "correcao", revisoes: "revisao", imagens: "imagem" };
    let eventos = 0;
    for (const [campo, tipo] of Object.entries(campos)) {
      const datas = (uso[campo] || []).filter((d) => typeof d === "string" && !isNaN(Date.parse(d))).slice(-300);
      if (!datas.length) continue;
      eventos += datas.length;
      instr.push([
        "INSERT INTO eventos_uso (usuario_id, tipo, criado_em) SELECT $1, $2, x::timestamptz FROM unnest($3::text[]) AS x",
        [uid, tipo, datas],
      ]);
    }
    instr.push(["UPDATE usuarios SET importado_em = now(), importacao_status = 'concluida' WHERE id = $1", [uid]]);
    await emTransacao(instr);
    return { importado: true, materiais: itens.length, comConteudo, removidos: removidos.length, eventos };
  } catch (e) {
    clearTimeout(relogio);
    // nada ficou pela metade (transação); libera para tentar de novo no próximo acesso
    await consultar("UPDATE usuarios SET importacao_status = 'falhou' WHERE id = $1 AND importado_em IS NULL", [uid]).catch(() => {});
    throw e;
  }
}

// Ensaio/rollback: volta a conta para "pendente" (a importação pode repetir sem duplicar)
export async function reabrirImportacao(email) {
  await consultar("UPDATE usuarios SET importado_em = NULL, importacao_status = 'pendente' WHERE conta = $1", [contaDe(email)]);
}
