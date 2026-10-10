import { ehProducao } from "./ambiente.js";

// Planos do EduGera — ÚNICO lugar com preços e limites (valores provisórios).
// Para mudar um preço ou limite antes de publicar, altere só este arquivo.
// Não há cobrança: nenhum plano pago pode ser contratado de verdade ainda.
//
// Limites (por usuário):
//   geracoesMes   gerações de apostila por mês (renova no dia 1º)
//   geracoesDia   gerações de apostila por dia (renova à meia-noite, horário de Brasília)
//   revisoesMes   revisões de conteúdo por mês (segunda leitura da apostila)
//   correcoesMes  correções de exercício com IA por mês
//   imagensPorGeracao  ilustrações por apostila gerada
//   biblioteca    materiais mostrados em "Minhas Apostilas" (null = sem limite)
// null em qualquer limite = sem limite.

// Contato de suporte: vem da variável SUPORTE_EMAIL; sem ela, aparece este texto.
export const SUPORTE_TEXTO_PADRAO = "Suporte em breve";

// Quando os limites novos do Grátis começam a valer (início do ciclo mensal, UTC).
// Antes disso o Grátis segue a regra antiga (LIMITES_TRANSICAO), para ninguém ser
// bloqueado de surpresa. Pode ser trocada pela variável INICIO_NOVOS_LIMITES.
// Fora da produção (site de teste) a regra nova vale já, salvo se a variável disser outra data.
export const INICIO_NOVOS_LIMITES = "2026-11-01T00:00:00.000Z";

// Fuso usado no limite diário (Brasil sem horário de verão desde 2019)
export const FUSO_MINUTOS = -180; // UTC−03:00

const LIMITES_GRATIS = {
  geracoesMes: 2,
  geracoesDia: 1,
  revisoesMes: 10,
  correcoesMes: 30,
  imagensPorGeracao: 1,
  biblioteca: 5,
};

const LIMITES_PRO = {
  geracoesMes: 30,
  geracoesDia: 3,
  revisoesMes: 60,
  correcoesMes: 150,
  imagensPorGeracao: 2,
  biblioteca: null,
};

export const PLANOS = {
  gratis: {
    id: "gratis",
    nome: "Grátis",
    preco: 0,
    periodo: "mes",
    contratavel: false, // é o plano de quem entra
    limites: LIMITES_GRATIS,
    capaPremium: false,
    recursos: [
      "2 gerações de apostila por mês (1 por dia)",
      "PDF do aluno",
      "PDF do professor",
      "Exercícios e gabarito",
      "Revisão básica",
      "Biblioteca com até 5 materiais",
    ],
  },
  pro_mensal: {
    id: "pro_mensal",
    nome: "Pro mensal",
    preco: 29.9,
    periodo: "mes",
    contratavel: true,
    limites: LIMITES_PRO,
    capaPremium: true, // capa "História que Ensina"
    recursos: [
      "30 gerações por mês (até 3 por dia)",
      "Biblioteca completa",
      "Mais revisões",
      "Mais imagens",
      "Capa Premium “História que Ensina”",
      "Limites maiores e recursos Pro",
    ],
  },
  pro_anual: {
    id: "pro_anual",
    nome: "Pro anual",
    preco: 299,
    periodo: "ano",
    contratavel: true,
    limites: LIMITES_PRO,
    capaPremium: true,
    recursos: ["Tudo do Pro mensal", "30 gerações por mês (até 3 por dia)", "Pagamento uma vez por ano"],
  },
  escola: {
    id: "escola",
    nome: "Escola",
    preco: null, // sem preço ainda
    periodo: null,
    contratavel: false, // sem cobrança
    emBreve: true,
    limites: LIMITES_PRO,
    capaPremium: true,
    recursos: ["Vários professores da mesma escola"],
  },
};

// Administrador: sem limites (bateria de qualidade, testes)
export const PLANO_ADMIN = {
  id: "admin",
  nome: "Administrador",
  preco: null,
  periodo: null,
  contratavel: false,
  limites: { geracoesMes: null, geracoesDia: null, revisoesMes: null, correcoesMes: null, imagensPorGeracao: null, biblioteca: null },
  capaPremium: true,
  recursos: [],
};

export const ORDEM_PLANOS = ["gratis", "pro_mensal", "pro_anual", "escola"];
export const PLANO_PADRAO = "gratis";

export const obterPlano = (id) => (id === "admin" ? PLANO_ADMIN : PLANOS[id] || PLANOS[PLANO_PADRAO]);

// null → Infinity (para contas); número → inteiro ≥ 0
export const teto = (v) => (v === null || v === undefined ? Infinity : Math.max(0, Math.floor(Number(v)) || 0));

export function formatarPreco(plano) {
  if (plano.preco === null || plano.preco === undefined) return "Em breve";
  if (plano.preco === 0) return "R$ 0";
  return "R$ " + plano.preco.toLocaleString("pt-BR", { minimumFractionDigits: plano.preco % 1 ? 2 : 0, maximumFractionDigits: 2 });
}
export const rotuloPeriodo = (p) => (p === "mes" ? "por mês" : p === "ano" ? "por ano" : "");

export function suporteEmail(env = process.env) {
  const v = String(env.SUPORTE_EMAIL || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}

// Regra antiga do Grátis (a que está publicada hoje), usada até INICIO_NOVOS_LIMITES.
// Lê as mesmas variáveis de antes, para não mudar nada para quem já usa.
export function limitesTransicao(env = process.env) {
  const n = (v, padrao) => {
    const x = parseInt(v ?? "", 10);
    return Number.isFinite(x) && x >= 0 ? x : padrao;
  };
  return {
    geracoesMes: n(env.LIMITE_GERACOES_MES, 5),
    geracoesDia: null,
    revisoesMes: n(env.LIMITE_REVISOES_MES, 40),
    correcoesMes: n(env.LIMITE_CORRECOES_MES, 60),
    imagensPorGeracao: 1,
    biblioteca: null,
  };
}

export function inicioNovosLimites(env = process.env) {
  const v = Date.parse(env.INICIO_NOVOS_LIMITES || "");
  if (Number.isFinite(v)) return new Date(v).toISOString();
  return ehProducao(env) ? INICIO_NOVOS_LIMITES : null; // null = já vale
}

// Plano com os limites que valem AGORA. Só o Grátis tem transição; o histórico de uso não muda.
export function planoVigente(plano, agora = new Date(), env = process.env) {
  if (plano.id !== "gratis") return plano;
  const inicio = inicioNovosLimites(env);
  if (!inicio || agora.toISOString() >= inicio) return plano;
  return { ...plano, limites: limitesTransicao(env), transicao: { novosLimitesEm: inicio, novos: plano.limites } };
}

// Biblioteca limitada (no servidor): só os N mais recentes vão para a tela.
// Os outros não são apagados; voltam quando o limite muda (upgrade).
export function limitarBiblioteca(itens, limite) {
  const lista = Array.isArray(itens) ? itens : [];
  if (limite === null || limite === undefined || !Number.isFinite(limite)) return { itens: lista, ocultos: 0, limite: null };
  const ordenados = [...lista].sort((a, b) => String(b.criadoEm || "").localeCompare(String(a.criadoEm || "")));
  return { itens: ordenados.slice(0, limite), ocultos: Math.max(0, ordenados.length - limite), limite };
}

// Início do dia no fuso do Brasil, em UTC (ISO)
export function inicioDoDia(agora = new Date(), fusoMin = FUSO_MINUTOS) {
  const local = new Date(agora.getTime() + fusoMin * 60_000);
  const meiaNoite = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(meiaNoite - fusoMin * 60_000).toISOString();
}

// Mensagem clara quando o limite de geração bate
export function mensagemLimite(motivo, plano, limite) {
  const n = limite === 1 ? "1 geração" : `${limite} gerações`;
  if (motivo === "dia")
    return `Você chegou ao limite de ${n} por dia do plano ${plano.nome}. Amanhã você pode gerar de novo.`;
  return `Você usou as ${n} deste mês do plano ${plano.nome}. O limite renova no dia 1º. Veja os planos em /planos.`;
}

// Tabela de comparação (página de planos e painel de uso)
export const ROTULOS_LIMITES = [
  ["geracoesMes", "Gerações de apostila por mês"],
  ["geracoesDia", "Gerações de apostila por dia"],
  ["revisoesMes", "Revisões de conteúdo por mês"],
  ["correcoesMes", "Correções de exercício por mês"],
  ["imagensPorGeracao", "Ilustrações por apostila"],
  ["biblioteca", "Materiais na biblioteca"],
];
export const valorLimite = (v) => (v === null || v === undefined ? "Sem limite" : String(v));

// ---------- contas de uso (puras: testáveis sem servidor) ----------

const finito = (v) => (Number.isFinite(teto(v)) ? teto(v) : null);
export const proximoMes = (agora = new Date()) => new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + 1, 1)).toISOString();
export const proximoDia = (agora = new Date()) => new Date(new Date(inicioDoDia(agora)).getTime() + 86_400_000).toISOString();

// Arquivo de uso do Blob ({ geracoes: [iso...], ... }) → { mes, dia } por tipo (mesmo formato do banco)
const TIPO_DO_CAMPO = { geracoes: "geracao", correcoes: "correcao", revisoes: "revisao", imagens: "imagem" };
export function contagensDoArquivo(dados = {}, agora = new Date()) {
  const mes0 = agora.toISOString().slice(0, 7);
  const dia0 = inicioDoDia(agora);
  const mes = {};
  const dia = {};
  for (const [campo, tipo] of Object.entries(TIPO_DO_CAMPO)) {
    const lista = (dados[campo] || []).filter((g) => typeof g === "string");
    mes[tipo] = lista.filter((g) => g.startsWith(mes0)).length;
    dia[tipo] = lista.filter((g) => g >= dia0).length;
  }
  return { mes, dia };
}

// Resumo de uso para a interface e as rotas. usados/limite/restantes = gerações do mês
// (campos antigos, mantidos); restantes já considera o limite do dia.
export function resumoDoUso(c, { plano, assinatura = null, admin = false, premium = false }, agora = new Date()) {
  const L = plano.limites;
  const limite = finito(L.geracoesMes);
  const limiteDia = finito(L.geracoesDia);
  const usados = c.mes.geracao || 0;
  const hoje = c.dia.geracao || 0;
  const restMes = limite === null ? null : Math.max(0, limite - usados);
  const restDia = limiteDia === null ? null : Math.max(0, limiteDia - hoje);
  const restantes = restMes === null ? restDia : restDia === null ? restMes : Math.min(restMes, restDia);
  return {
    usados,
    limite,
    restantes,
    hoje: { usados: hoje, limite: limiteDia, restantes: restDia },
    revisoes: { usados: c.mes.revisao || 0, limite: finito(L.revisoesMes) },
    correcoes: { usados: c.mes.correcao || 0, limite: finito(L.correcoesMes) },
    imagens: { usados: c.mes.imagem || 0, porGeracao: finito(L.imagensPorGeracao) },
    biblioteca: finito(L.biblioteca),
    plano: { id: plano.id, nome: plano.nome },
    assinatura: assinatura ? { plano: assinatura.plano, origem: assinatura.origem, fim: assinatura.fim } : null,
    capaPremium: !!plano.capaPremium,
    transicao: plano.transicao || null,
    renovaMes: proximoMes(agora),
    renovaDia: proximoDia(agora),
    admin,
    premium: premium || !!plano.capaPremium,
  };
}

// Por que a geração foi recusada: "dia" (mês ainda tem saldo) ou "mes"
export const motivoBloqueio = (r) => (r.hoje.restantes === 0 && (r.limite === null || r.usados < r.limite) ? "dia" : "mes");

// Aviso antes de a regra nova valer (Grátis em transição)
export function avisoTransicao(transicao) {
  if (!transicao) return null;
  const d = new Date(transicao.novosLimitesEm);
  const dia = d.getUTCDate() === 1 ? "1º" : String(d.getUTCDate());
  const mes = d.toLocaleDateString("pt-BR", { timeZone: "UTC", month: "long" });
  const n = transicao.novos;
  const ger = (v) => (v === 1 ? "1 geração" : `${v} gerações`);
  return (
    `A partir de ${dia} de ${mes} de ${d.getUTCFullYear()}, o plano Grátis passa a ter ${ger(n.geracoesMes)} por mês` +
    (n.geracoesDia ? ` (${n.geracoesDia} por dia)` : "") +
    (n.biblioteca ? ` e mostra os ${n.biblioteca} materiais mais recentes na biblioteca` : "") +
    ". Seu histórico e todos os seus materiais continuam guardados."
  );
}
