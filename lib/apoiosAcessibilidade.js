export const APOIOS_ACESSIBILIDADE = [
  {
    id: "linguagem-direta",
    titulo: "Instruções curtas e diretas",
    descricao: "Preferir frases objetivas e linguagem literal.",
  },
  {
    id: "etapas-curtas",
    titulo: "Etapas curtas e numeradas",
    descricao: "Dividir orientações com várias ações em passos claros.",
  },
  {
    id: "exemplo-guiado",
    titulo: "Exemplo guiado antes dos exercícios",
    descricao: "Mostrar um modelo resolvido sem entregar respostas da atividade.",
  },
  {
    id: "ilustracao-simples",
    titulo: "Ilustração simples, sem detalhes decorativos",
    descricao: "Manter apenas elementos visuais úteis para entender o tema.",
  },
];

const IDS_VALIDOS = new Set(APOIOS_ACESSIBILIDADE.map(({ id }) => id));

export function normalizarApoiosAcessibilidade(valor) {
  if (!Array.isArray(valor)) return [];
  const selecionados = new Set(valor.slice(0, 32).filter((id) => typeof id === "string" && IDS_VALIDOS.has(id)));
  return APOIOS_ACESSIBILIDADE.filter(({ id }) => selecionados.has(id)).map(({ id }) => id);
}

export function montarPromptApoiosAcessibilidade(valor) {
  const ids = new Set(normalizarApoiosAcessibilidade(valor));
  const regras = [];

  if (ids.has("linguagem-direta")) {
    regras.push("Use frases curtas, linguagem literal e vocabulário adequado ao ano; evite metáforas, expressões ambíguas, ironias e instruções com várias ações misturadas. Explique os termos curriculares necessários sem eliminá-los.");
  }
  if (ids.has("etapas-curtas")) {
    regras.push("Quando uma orientação exigir mais de uma ação, divida-a em passos curtos e numerados, com uma ação por passo; mantenha o objetivo e a dificuldade curricular.");
  }
  if (ids.has("exemplo-guiado")) {
    regras.push('Inclua "exemploGuiado" como um objeto com título e de 2 a 5 passos curtos e numerados, antes dos exercícios. Use um exemplo diferente dos exercícios pedidos e não revele nem resolva as respostas da atividade.');
  }
  if (ids.has("ilustracao-simples")) {
    regras.push("Prefira figuras funcionais, claras e sem elementos decorativos desnecessários; preserve diagramas, tabelas ou ilustrações que sejam importantes para compreender o conteúdo.");
  }

  if (!regras.length) return "";
  return `APOIOS DE ACESSIBILIDADE ESCOLHIDOS PARA ESTA ATIVIDADE (aplique somente os itens abaixo):\n${regras.map((regra) => `- ${regra}`).join("\n")}\nNão infira diagnóstico, não altere a habilidade BNCC nem reduza o objetivo de aprendizagem.`;
}

export function promptImagemAcessibilidade(valor) {
  return normalizarApoiosAcessibilidade(valor).includes("ilustracao-simples")
    ? " A composição deve ser visualmente simples, com poucos elementos relevantes, fundo limpo, bom espaço entre objetos e sem padrões, texturas ou enfeites que distraiam. Preserve somente os elementos essenciais para representar o tema."
    : "";
}

export function auditarApoiosAcessibilidade(valor, material = {}) {
  const ids = normalizarApoiosAcessibilidade(valor);
  if (!ids.includes("exemplo-guiado")) return [];

  const exemplo = material?.exemploGuiado;
  const passos = Array.isArray(exemplo?.passos)
    ? exemplo.passos.filter((passo) => typeof passo === "string" && passo.trim())
    : [];
  if (typeof exemplo?.titulo === "string" && exemplo.titulo.trim() && passos.length >= 2) return [];

  return [
    {
      onde: "Exemplo guiado",
      motivo: "O apoio foi solicitado, mas o material não apresentou um exemplo com título e pelo menos duas etapas. Confira ou ajuste antes de usar.",
    },
  ];
}
