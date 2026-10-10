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

// Contato de suporte: vem da variável SUPORTE_EMAIL; sem ela, aparece este aviso.
export const SUPORTE_EMAIL_PADRAO = "[COLOCAREI O E-MAIL AQUI]";

// Fuso usado no limite diário (Brasil sem horário de verão desde 2019)
export const FUSO_MINUTOS = -180; // UTC−03:00

const LIMITES_GRATIS = {
  geracoesMes: 2,
  geracoesDia: 2,
  revisoesMes: 10,
  correcoesMes: 30,
  imagensPorGeracao: 1,
  biblioteca: 5,
};

const LIMITES_PRO = {
  geracoesMes: 30,
  geracoesDia: 10,
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
    prioridade: false,
    recursos: [
      "2 gerações de apostila por mês",
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
    prioridade: true,
    recursos: [
      "30 gerações por mês",
      "Biblioteca completa",
      "Mais revisões",
      "Mais imagens",
      "Prioridade de processamento",
    ],
  },
  pro_anual: {
    id: "pro_anual",
    nome: "Pro anual",
    preco: 299,
    periodo: "ano",
    contratavel: true,
    limites: LIMITES_PRO,
    prioridade: true,
    recursos: ["Tudo do Pro mensal", "30 gerações por mês", "Pagamento uma vez por ano"],
  },
  escola: {
    id: "escola",
    nome: "Escola",
    preco: null, // a definir
    periodo: null,
    contratavel: false, // sem cobrança: só "Fale conosco"
    emBreve: true,
    limites: LIMITES_PRO,
    prioridade: true,
    recursos: ["Vários professores da mesma escola", "Preço a definir", "Fale conosco"],
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
  prioridade: true,
  recursos: [],
};

export const ORDEM_PLANOS = ["gratis", "pro_mensal", "pro_anual", "escola"];
export const PLANO_PADRAO = "gratis";

export const obterPlano = (id) => (id === "admin" ? PLANO_ADMIN : PLANOS[id] || PLANOS[PLANO_PADRAO]);

// null → Infinity (para contas); número → inteiro ≥ 0
export const teto = (v) => (v === null || v === undefined ? Infinity : Math.max(0, Math.floor(Number(v)) || 0));

export function formatarPreco(plano) {
  if (plano.preco === null || plano.preco === undefined) return "A definir";
  if (plano.preco === 0) return "R$ 0";
  return "R$ " + plano.preco.toLocaleString("pt-BR", { minimumFractionDigits: plano.preco % 1 ? 2 : 0, maximumFractionDigits: 2 });
}
export const rotuloPeriodo = (p) => (p === "mes" ? "por mês" : p === "ano" ? "por ano" : "");

export function suporteEmail(env = process.env) {
  const v = String(env.SUPORTE_EMAIL || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
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
    prioridade: !!plano.prioridade,
    renovaMes: proximoMes(agora),
    renovaDia: proximoDia(agora),
    admin,
    premium,
  };
}

// Por que a geração foi recusada: "dia" (mês ainda tem saldo) ou "mes"
export const motivoBloqueio = (r) => (r.hoje.restantes === 0 && (r.limite === null || r.usados < r.limite) ? "dia" : "mes");
