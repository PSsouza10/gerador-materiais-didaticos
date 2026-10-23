// Campanhas de divulgação (Instagram, HTPC…): link edugera.app/convite/<CÓDIGO> que libera
// N dias de Pro sem cobrança. Uma campanha por conta; data de fim e limite de contas.
import { consultar, emTransacao } from "./banco.js";
import { usuarioId, ativarAssinatura, cobrancaAtiva } from "./contas.js";

export const normalizarCodigoCampanha = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
export const codigoCampanhaValido = (c) => /^[A-Z0-9]{4,20}$/.test(c);

export function validarCampanha({ codigo, dias, limite, fim } = {}, agora = new Date()) {
  const c = normalizarCodigoCampanha(codigo);
  if (!codigoCampanhaValido(c)) return { ok: false, erro: "O código precisa ter de 4 a 20 letras ou números (ex.: INSTA60)." };
  const d = Number(dias);
  if (!Number.isInteger(d) || d < 1 || d > 366) return { ok: false, erro: "Dias de Pro: de 1 a 366." };
  const l = Number(limite);
  if (!Number.isInteger(l) || l < 1 || l > 100000) return { ok: false, erro: "Limite de contas: de 1 a 100000." };
  // fim: "AAAA-MM-DD" vale até 23h59 de Brasília desse dia
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fim || ""));
  const f = m ? new Date(`${m[1]}-${m[2]}-${m[3]}T23:59:59-03:00`) : null;
  if (!f || Number.isNaN(f.getTime()) || f <= agora) return { ok: false, erro: "Escolha uma data de fim no futuro." };
  return { ok: true, dados: { codigo: c, dias: d, limite: l, fim: f.toISOString() } };
}

export async function criarCampanha(dados) {
  const v = validarCampanha(dados);
  if (!v.ok) return v;
  const { codigo, dias, limite, fim } = v.dados;
  const r = await consultar("INSERT INTO campanhas (codigo, dias, limite, fim) VALUES ($1, $2, $3, $4) ON CONFLICT (codigo) DO NOTHING RETURNING codigo", [codigo, dias, limite, fim]);
  if (!r.length) return { ok: false, erro: `Já existe uma campanha ${codigo}. Use outro código.` };
  return { ok: true, codigo };
}

export async function definirAtiva(codigo, ativa) {
  await consultar("UPDATE campanhas SET ativa = $2 WHERE codigo = $1", [normalizarCodigoCampanha(codigo), !!ativa]);
  return { ok: true };
}

const linha = (l) => ({ codigo: l.codigo, dias: Number(l.dias), limite: Number(l.limite), fim: new Date(l.fim).toISOString(), ativa: l.ativa, resgates: Number(l.resgates || 0), criadoEm: new Date(l.criado_em).toISOString() });

export async function listarCampanhas() {
  const l = await consultar("SELECT c.*, (SELECT count(*) FROM resgates_campanha r WHERE r.campanha = c.codigo) AS resgates FROM campanhas c ORDER BY c.criado_em DESC LIMIT 100");
  return l.map(linha);
}

export async function lerCampanha(codigo) {
  const c = normalizarCodigoCampanha(codigo);
  if (!codigoCampanhaValido(c)) return null;
  const [l] = await consultar("SELECT c.*, (SELECT count(*) FROM resgates_campanha r WHERE r.campanha = c.codigo) AS resgates FROM campanhas c WHERE c.codigo = $1", [c]);
  return l ? linha(l) : null;
}

// Situação pública do link (sem dados de ninguém)
export function situacao(c, agora = new Date()) {
  if (!c) return { valida: false, motivo: "Este link de campanha não existe. Confira o endereço." };
  if (!c.ativa) return { valida: false, motivo: "Esta campanha foi encerrada." };
  if (new Date(c.fim) <= agora) return { valida: false, motivo: "Esta campanha já terminou." };
  if (c.resgates >= c.limite) return { valida: false, motivo: "As vagas desta campanha acabaram." };
  return { valida: true };
}

// Resgate: uma campanha por conta; quem já paga o Pro não precisa (o pago continua valendo)
export async function resgatar(email, codigo) {
  const c = await lerCampanha(codigo);
  const s = situacao(c);
  if (!s.valida) return { ok: false, erro: s.motivo };
  const id = await usuarioId(email);
  const [ja] = await consultar("SELECT campanha FROM resgates_campanha WHERE usuario_id = $1", [id]);
  if (ja) return { ok: false, erro: ja.campanha === c.codigo ? "Você já ativou esta campanha." : "Sua conta já usou uma campanha de dias grátis." };
  const paga = await cobrancaAtiva(email).catch(() => null);
  if (paga) return { ok: false, erro: "Você já tem o Pro pago: ele continua valendo normalmente." };
  // trava por campanha: o limite não passa nem com dois cliques ao mesmo tempo
  const [, inseridas] = await emTransacao([
    ["SELECT pg_advisory_xact_lock(hashtext($1))", [c.codigo]],
    [
      `INSERT INTO resgates_campanha (campanha, usuario_id)
       SELECT $1, $2 FROM campanhas k
        WHERE k.codigo = $1 AND k.ativa AND k.fim > now()
          AND (SELECT count(*) FROM resgates_campanha r WHERE r.campanha = $1) < k.limite
       ON CONFLICT (usuario_id) DO NOTHING RETURNING id`,
      [c.codigo, id],
    ],
  ]);
  if (!inseridas?.length) return { ok: false, erro: "Não foi possível ativar agora (vagas esgotadas ou link já usado)." };
  try {
    const a = await ativarAssinatura(email, "pro_mensal", "manual", { dias: c.dias });
    return { ok: true, dias: c.dias, ate: a?.fim || null };
  } catch (e) {
    await consultar("DELETE FROM resgates_campanha WHERE id = $1", [inseridas[0].id]).catch(() => {});
    throw e;
  }
}
