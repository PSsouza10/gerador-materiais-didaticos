// Gêneros do módulo de Redação: etapas do construtor, rubrica e elementos obrigatórios.
// Arquivo de dados: para mudar uma dica, uma faixa de palavras ou um critério, altere só aqui.
//   etapas[].parte: parágrafo do texto montado (0 = título/tema, fora do texto)
//   etapas[].fim:   pontuação final da etapa ("." se ausente; "" = nenhuma; "," = vírgula)
//   elementos:      o que o gênero precisa ter; o critério "criterioDosElementos" perde nota
//                   por elemento ausente e fica com 0 se faltarem todos.
// Rubrica: 5 critérios × 2,0 pontos (10). No perfil ENEM a dissertação usa as 5 competências (1000).

const NORMA = { id: "norma", nome: "Ortografia, pontuação e gramática", max: 2 };
const COESAO = { id: "coesao", nome: "Coesão (ligação entre frases e parágrafos)", max: 2 };

export const GENEROS_REDACAO = {
  dissertacao: {
    nome: "Dissertação argumentativa",
    publico: "Concurso, ENEM e Ensino Médio",
    linhas: { minLinhas: 20, maxLinhas: 30 },
    etapas: [
      { id: "tema", parte: 0, titulo: "Tema", dica: "Copie o tema da proposta ou escreva com suas palavras o assunto que a banca pediu.", min: 3, max: 20 },
      { id: "contexto", parte: 1, titulo: "Introdução: contexto", dica: "Apresente o assunto: um fato, um dado, uma lei ou uma situação da escola que mostre por que o tema importa hoje.", min: 12, max: 35 },
      { id: "tese", parte: 1, titulo: "Introdução: tese", dica: "Diga, em uma frase, o que você defende. Essa é a ideia que os parágrafos seguintes vão provar.", min: 8, max: 30 },
      { id: "argumento1", parte: 2, titulo: "Desenvolvimento 1: argumento normativo ou teórico", dica: "Sustente a tese com uma norma ou um autor (BNCC, LDB, ECA, PNE). Cite só o que você tem certeza de que existe.", min: 15, max: 45 },
      { id: "consequencia1", parte: 2, titulo: "Desenvolvimento 1: consequência", dica: "Explique o que acontece na prática quando essa norma é (ou não é) cumprida. Não repita a tese.", min: 12, max: 35 },
      { id: "argumento2", parte: 3, titulo: "Desenvolvimento 2: argumento prático", dica: "Traga um argumento DIFERENTE do primeiro: um exemplo da sala de aula, da escola ou da rede.", min: 15, max: 45 },
      { id: "principio2", parte: 3, titulo: "Desenvolvimento 2: princípio", dica: "Mostre o princípio por trás do exemplo (equidade, gestão democrática, aprendizagem de todos...).", min: 12, max: 35 },
      { id: "retomada", parte: 4, titulo: "Conclusão: retomada da tese", dica: "Retome a tese com outras palavras, ligando-a ao que você provou nos dois desenvolvimentos.", min: 8, max: 30 },
      { id: "proposta", parte: 4, titulo: "Conclusão: proposta de intervenção", dica: "Diga QUEM faz (agente), O QUE faz (ação), COMO faz (meio) e PARA QUÊ (finalidade).", min: 15, max: 45 },
    ],
    checklist: [
      "A tese aparece na introdução e não é repetida igual no 2º parágrafo.",
      "Cada desenvolvimento traz um argumento diferente.",
      "O repertório (BNCC, LDB, ECA, PNE ou dado real) está citado sem inventar artigo.",
      "A proposta tem agente, ação, meio e finalidade.",
      "Conectivos ligam os parágrafos e nenhuma frase ficou sem verbo.",
    ],
    criterios: [
      { id: "tema", nome: "Adequação ao tema e ao gênero dissertativo-argumentativo", max: 2 },
      { id: "estrutura", nome: "Estrutura (introdução com tese, 2 desenvolvimentos distintos, conclusão)", max: 2 },
      { id: "argumentacao", nome: "Argumentação e repertório (BNCC, LDB, ECA, PNE etc.)", max: 2 },
      { id: "proposta", nome: "Proposta de intervenção (agente + ação + meio + finalidade)", max: 2 },
      { id: "coesao", nome: "Coesão e norma culta", max: 2 },
    ],
    elementos: { titulo: "Proposta de intervenção", itens: [["agente", "Agente"], ["acao", "Ação"], ["meio", "Meio"], ["finalidade", "Finalidade"]] },
    criterioDosElementos: "proposta",
    regras: [
      "Aponte redundância entre parágrafos (mesma tese repetida) como falha de estrutura.",
      "Verifique se a conclusão tem agente + ação + meio + finalidade; se faltar algum, diga qual.",
    ],
  },

  artigo: {
    nome: "Artigo de opinião",
    publico: "8º e 9º ano, Ensino Médio",
    linhas: { minLinhas: 15, maxLinhas: 30 },
    etapas: [
      { id: "tema", parte: 0, titulo: "Título", dica: "Um título que já mostre a sua posição sobre o assunto.", min: 2, max: 15 },
      { id: "contexto", parte: 1, titulo: "Apresentação do assunto", dica: "Conte, em poucas linhas, qual é a polêmica e por que ela importa.", min: 12, max: 35 },
      { id: "opiniao", parte: 1, titulo: "Sua opinião", dica: "Diga claramente o que você pensa: a favor ou contra, e por quê.", min: 8, max: 30 },
      { id: "argumento1", parte: 2, titulo: "Argumento 1", dica: "Dê a primeira razão para a sua opinião.", min: 12, max: 40 },
      { id: "exemplo1", parte: 2, titulo: "Exemplo ou dado", dica: "Mostre um exemplo, um fato ou um dado que prove o argumento 1.", min: 10, max: 35 },
      { id: "argumento2", parte: 3, titulo: "Argumento 2", dica: "Dê uma segunda razão, diferente da primeira.", min: 12, max: 40 },
      { id: "contra", parte: 3, titulo: "Contra-argumento", dica: "Mostre o que pensa quem discorda de você e responda a essa ideia.", min: 12, max: 40 },
      { id: "conclusao", parte: 4, titulo: "Conclusão", dica: "Retome a sua opinião e faça um convite ao leitor: o que ele deve pensar ou fazer.", min: 12, max: 40 },
    ],
    checklist: [
      "A opinião aparece clara logo no início.",
      "Há dois argumentos diferentes, cada um com exemplo ou dado.",
      "O texto responde a quem pensa diferente (contra-argumento).",
      "A conclusão retoma a opinião e convida o leitor.",
      "Ortografia, pontuação e acentuação revisadas.",
    ],
    criterios: [
      { id: "tema", nome: "Adequação ao tema e ao gênero artigo de opinião", max: 2 },
      { id: "estrutura", nome: "Posição clara e estrutura (opinião, argumentos, contra-argumento, conclusão)", max: 2 },
      { id: "argumentacao", nome: "Força dos argumentos e exemplos", max: 2 },
      COESAO,
      NORMA,
    ],
    elementos: { titulo: "Partes do artigo", itens: [["opiniao", "Opinião"], ["argumentos", "Argumentos"], ["contra", "Contra-argumento"], ["conclusao", "Conclusão"]] },
    criterioDosElementos: "estrutura",
    regras: ["Verifique se a opinião do autor está explícita e se há contra-argumento respondido; se faltar, diga o quê."],
  },

  narrativo: {
    nome: "Texto narrativo (conto)",
    publico: "Ensino Fundamental",
    linhas: { minLinhas: 15, maxLinhas: 30 },
    etapas: [
      { id: "tema", parte: 0, titulo: "Título", dica: "Um título curto que dê curiosidade, sem contar o final.", min: 1, max: 12 },
      { id: "apresentacao", parte: 1, titulo: "Personagens, lugar e tempo", dica: "Quem é o personagem principal, onde e quando a história acontece?", min: 12, max: 40 },
      { id: "inicial", parte: 1, titulo: "Situação inicial", dica: "Como era a vida do personagem antes do problema aparecer?", min: 10, max: 35 },
      { id: "conflito", parte: 2, titulo: "Conflito", dica: "Qual problema ou acontecimento muda tudo?", min: 12, max: 40 },
      { id: "acoes", parte: 2, titulo: "Tentativas", dica: "O que o personagem faz para resolver o problema? Use diálogo se quiser.", min: 15, max: 50 },
      { id: "climax", parte: 3, titulo: "Clímax", dica: "O momento de maior tensão: o que acontece de mais emocionante?", min: 12, max: 40 },
      { id: "desfecho", parte: 4, titulo: "Desfecho", dica: "Como o problema termina e como fica o personagem no final?", min: 10, max: 40 },
    ],
    checklist: [
      "Personagens, lugar e tempo estão apresentados.",
      "Há um conflito claro e um clímax.",
      "O desfecho resolve o conflito.",
      "Os fatos seguem uma ordem que o leitor entende.",
      "Diálogos com travessão e pontuação revisada.",
    ],
    criterios: [
      { id: "tema", nome: "Adequação à proposta e ao gênero narrativo", max: 2 },
      { id: "estrutura", nome: "Estrutura narrativa (situação inicial, conflito, clímax, desfecho)", max: 2 },
      { id: "elementos", nome: "Personagens, tempo, espaço e narrador", max: 2 },
      { id: "coesao", nome: "Sequência dos fatos e coesão", max: 2 },
      NORMA,
    ],
    elementos: { titulo: "Partes da narrativa", itens: [["inicial", "Situação inicial"], ["conflito", "Conflito"], ["climax", "Clímax"], ["desfecho", "Desfecho"]] },
    criterioDosElementos: "estrutura",
    regras: ["Verifique se a narrativa tem situação inicial, conflito, clímax e desfecho; se faltar algum, diga qual."],
  },

  relato: {
    nome: "Relato pessoal",
    publico: "Ensino Fundamental",
    linhas: { minLinhas: 10, maxLinhas: 25 },
    etapas: [
      { id: "tema", parte: 0, titulo: "Título", dica: "Um título que resuma a experiência.", min: 1, max: 12 },
      { id: "quando", parte: 1, titulo: "Quando e onde", dica: "Quando aconteceu e onde você estava? Quem estava com você?", min: 10, max: 35 },
      { id: "fato", parte: 2, titulo: "O que aconteceu", dica: "Conte o fato principal em 1ª pessoa (eu, nós), na ordem em que aconteceu.", min: 15, max: 50 },
      { id: "detalhes", parte: 2, titulo: "Detalhes", dica: "Um detalhe que só quem estava lá saberia: um som, uma fala, uma cor.", min: 10, max: 35 },
      { id: "sentimentos", parte: 3, titulo: "O que você sentiu", dica: "Como você se sentiu durante e depois?", min: 10, max: 35 },
      { id: "reflexao", parte: 4, titulo: "O que ficou", dica: "O que essa experiência ensinou ou mudou em você?", min: 10, max: 35 },
    ],
    checklist: [
      "O texto está em 1ª pessoa.",
      "Diz quando e onde aconteceu.",
      "Os fatos estão na ordem certa.",
      "Mostra sentimentos e uma reflexão final.",
      "Ortografia, pontuação e acentuação revisadas.",
    ],
    criterios: [
      { id: "tema", nome: "Adequação à proposta e ao gênero relato pessoal", max: 2 },
      { id: "estrutura", nome: "Organização do relato (quando/onde, fato, sentimentos, reflexão)", max: 2 },
      { id: "autoria", nome: "Detalhes, sentimentos e voz própria em 1ª pessoa", max: 2 },
      COESAO,
      NORMA,
    ],
    elementos: { titulo: "Partes do relato", itens: [["quando", "Quando e onde"], ["fato", "Fato"], ["sentimentos", "Sentimentos"], ["reflexao", "Reflexão"]] },
    criterioDosElementos: "estrutura",
    regras: ["Verifique se o relato diz quando e onde, conta o fato, mostra sentimentos e termina com reflexão; se faltar algum, diga qual."],
  },

  carta: {
    nome: "Carta",
    publico: "Ensino Fundamental",
    linhas: { minLinhas: 10, maxLinhas: 25 },
    etapas: [
      { id: "tema", parte: 0, titulo: "Para quem e por quê", dica: "Ex.: carta ao prefeito pedindo uma faixa de pedestres. (Não entra no texto.)", min: 3, max: 20 },
      { id: "local", parte: 1, titulo: "Local e data", dica: "Ex.: Araçariguama, 24 de outubro de 2026", min: 3, max: 10, fim: "" },
      { id: "vocativo", parte: 2, titulo: "Vocativo", dica: "Como você chama o destinatário. Ex.: Senhor Prefeito / Querida avó", min: 1, max: 8, fim: "," },
      { id: "motivo", parte: 3, titulo: "Apresentação e motivo", dica: "Quem é você e por que está escrevendo.", min: 12, max: 40 },
      { id: "corpo", parte: 4, titulo: "Desenvolvimento", dica: "Explique o assunto com detalhes e razões.", min: 15, max: 60 },
      { id: "pedido", parte: 5, titulo: "Pedido ou fechamento", dica: "O que você pede, propõe ou deseja ao destinatário.", min: 8, max: 35 },
      { id: "despedida", parte: 6, titulo: "Despedida", dica: "Ex.: Atenciosamente / Um abraço", min: 1, max: 8, fim: "," },
      { id: "assinatura", parte: 7, titulo: "Assinatura", dica: "Seu nome (ou só a turma, se não quiser se identificar).", min: 1, max: 8, fim: "" },
    ],
    checklist: [
      "Tem local e data, vocativo, despedida e assinatura.",
      "O motivo da carta aparece logo no início.",
      "A linguagem combina com o destinatário (formal ou informal).",
      "O pedido ou fechamento está claro.",
      "Ortografia, pontuação e acentuação revisadas.",
    ],
    criterios: [
      { id: "tema", nome: "Adequação ao propósito e ao destinatário", max: 2 },
      { id: "estrutura", nome: "Estrutura da carta (local e data, vocativo, corpo, despedida, assinatura)", max: 2 },
      { id: "clareza", nome: "Clareza do assunto e do pedido", max: 2 },
      { id: "coesao", nome: "Coesão e registro (formal ou informal) adequado", max: 2 },
      NORMA,
    ],
    elementos: { titulo: "Partes da carta", itens: [["local", "Local e data"], ["vocativo", "Vocativo"], ["corpo", "Corpo"], ["despedida", "Despedida"], ["assinatura", "Assinatura"]] },
    criterioDosElementos: "estrutura",
    regras: ["Verifique local e data, vocativo, corpo, despedida e assinatura; se faltar algum, diga qual."],
  },

  noticia: {
    nome: "Notícia",
    publico: "Ensino Fundamental",
    linhas: { minLinhas: 10, maxLinhas: 25 },
    etapas: [
      { id: "tema", parte: 0, titulo: "Manchete", dica: "Frase curta, com verbo no presente. Ex.: Alunos plantam 50 árvores na escola", min: 3, max: 15, fim: "" },
      { id: "linhaFina", parte: 1, titulo: "Linha fina", dica: "Uma frase abaixo da manchete com um detalhe importante.", min: 6, max: 25 },
      { id: "lide", parte: 2, titulo: "Lide", dica: "Responda: o quê, quem, quando, onde, como e por quê.", min: 20, max: 55 },
      { id: "desenvolvimento", parte: 3, titulo: "Desenvolvimento", dica: "Mais detalhes do fato, do mais importante para o menos importante.", min: 15, max: 55 },
      { id: "fala", parte: 4, titulo: "Fala de alguém", dica: "Uma fala entre aspas de uma pessoa envolvida, dizendo quem ela é.", min: 8, max: 40 },
      { id: "fechamento", parte: 5, titulo: "Fechamento", dica: "O que vai acontecer depois ou onde saber mais.", min: 6, max: 30 },
    ],
    checklist: [
      "A manchete é curta e informa o fato.",
      "O lide responde o quê, quem, quando e onde.",
      "O texto é em 3ª pessoa, sem opinião do autor.",
      "Há a fala de alguém entre aspas.",
      "Ortografia, pontuação e acentuação revisadas.",
    ],
    criterios: [
      { id: "tema", nome: "Adequação ao fato e ao gênero notícia", max: 2 },
      { id: "estrutura", nome: "Lide completo (o quê, quem, quando, onde)", max: 2 },
      { id: "organizacao", nome: "Organização das informações e imparcialidade", max: 2 },
      COESAO,
      NORMA,
    ],
    elementos: { titulo: "Lide", itens: [["oque", "O quê"], ["quem", "Quem"], ["quando", "Quando"], ["onde", "Onde"]] },
    criterioDosElementos: "estrutura",
    regras: ["Verifique se o lide responde o quê, quem, quando e onde; se faltar algum, diga qual. Aponte opinião do autor como falha do gênero."],
  },
};

// ENEM: a dissertação vale 1000 pontos em 5 competências (0 a 200, de 40 em 40)
export const ENEM_REDACAO = {
  criterios: [
    { id: "c1", nome: "Competência 1: domínio da norma padrão da língua escrita", max: 200 },
    { id: "c2", nome: "Competência 2: compreensão da proposta e do tipo dissertativo-argumentativo", max: 200 },
    { id: "c3", nome: "Competência 3: seleção e organização de informações e argumentos", max: 200 },
    { id: "c4", nome: "Competência 4: mecanismos linguísticos de coesão", max: 200 },
    { id: "c5", nome: "Competência 5: proposta de intervenção que respeita os direitos humanos", max: 200 },
  ],
  elementos: { titulo: "Proposta de intervenção", itens: [["agente", "Agente"], ["acao", "Ação"], ["meio", "Meio"], ["finalidade", "Finalidade"], ["detalhamento", "Detalhamento"]] },
  criterioDosElementos: "c5",
  passo: 40,
  linhas: { minLinhas: 7, maxLinhas: 30 },
};

// Compatibilidade: a dissertação é o gênero padrão
export const ETAPAS_REDACAO = GENEROS_REDACAO.dissertacao.etapas;
export const CHECKLIST_REDACAO = GENEROS_REDACAO.dissertacao.checklist;
