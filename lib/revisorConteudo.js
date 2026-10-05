// Revisor de conteúdo: depois de gerada, a apostila é lida por uma segunda IA
// no papel de professor experiente da disciplina. Ele aponta erros que as
// conferências fixas não pegam (conceito errado, regra inventada, fala que
// entrega a resposta, item da habilidade BNCC esquecido, nomenclatura antiga…).
// Aqui ficam o pedido (prompt), a limpeza da resposta e a aplicação no material:
// cada apontamento de exercício fica GRUDADO no exercício (campo "revisor"),
// então some sozinho quando o exercício é corrigido, editado ou removido.

const txt = (v, max = 300) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

export const LUGARES_REVISOR = {
  exercicio: "Exercício",
  resumo: "Resumo",
  conceitos: "Conceitos",
  formulas: "Fórmulas e regras",
  dicas: "Dicas",
  lembrete: "Lembrete",
  cena: "Cena do cotidiano",
  aplicacao: "Aplicação prática",
  figura: "Figura do conteúdo",
  geral: "Apostila",
};

// Versão enxuta do material para o revisor ler (sem campos de layout)
export function materialParaRevisor(m = {}) {
  const fig = (f) => (f ? JSON.stringify(f).slice(0, 400) : null);
  return {
    titulo: m.tituloDidatico,
    resumo: m.resumoPedagogico,
    conceitos: (m.conceitos || []).map((c) => `${c.termo}: ${c.definicao}`),
    formulas: (m.formulas || []).map((f) => `${f.nome}: ${f.expressao} — ${f.descricao}`),
    dicas: m.dicas || [],
    lembrete: m.lembreteImportante || "",
    aplicacao: m.aplicacaoPratica || null,
    figuraDoConteudo: fig(m.figuraExplicativa),
    cena: m.cena ? { falas: (m.cena.falas || []).map((f) => `${f.quem}: ${f.texto}`), figura: fig(m.cena.figura), pergunta: m.cena.pergunta } : null,
    exercicios: (m.exercicios || []).map((e, i) => ({
      numero: i + 1,
      fala: e.fala ? `${e.fala.quem}: ${e.fala.texto}` : null,
      enunciado: e.enunciado,
      alternativas: e.alternativas || [],
      figura: fig(e.figura),
      resposta: e.resposta,
    })),
  };
}

export function promptRevisor(form = {}, material = {}, habilidade = "") {
  const ano = form.ano ? ` · ${/^EM/i.test(form.ano) ? `${String(form.ano).replace(/\D/g, "")}ª série` : `${form.ano}º ano`}` : "";
  return `Você é professor(a) experiente de ${form.disciplina || "da disciplina"} (${form.nivel || ""}${ano}) e coordenador(a) pedagógico(a) rigoroso(a).
Revise a apostila abaixo ANTES de ela ser impressa para os alunos. Tema: "${form.tema || ""}". Habilidade BNCC: ${habilidade || form.bncc || "não informada"}.

Aponte SOMENTE problemas reais que um professor dessa disciplina corrigiria:
- erro de conceito ou de conteúdo; definição imprecisa; regra falsa, incompleta ou inventada (pseudofórmula);
- gabarito errado, alternativa correta ausente ou mais de uma alternativa correta;
- enunciado ambíguo ou que não dá para responder com o que foi apresentado;
- fala do personagem que já mostra a resposta ou que só repete o enunciado;
- figura sem relação com a pergunta ou que entrega a resposta (ex.: tabela que já traz preenchido o que o aluno deve completar);
- frase-exemplo que mistura classificações e deixa a resposta ambígua (ex.: "Se eu tivesse tempo, iria" tem subjuntivo E futuro do pretérito);
- conteúdo fora do tema, acima ou abaixo do ano;
- item da habilidade BNCC que faz parte do tema e ficou de fora;
- nomenclatura desatualizada ou erro de português.
NÃO aponte gosto pessoal, estilo, tamanho de texto nem sugestões opcionais. Se estiver tudo certo, devolva a lista vazia. No máximo 10 apontamentos, do mais grave ao menos grave.

Apostila (JSON):
${JSON.stringify(materialParaRevisor(material))}

Retorne APENAS JSON:
{ "apontamentos": [ { "onde": "exercicio" | "resumo" | "conceitos" | "formulas" | "dicas" | "lembrete" | "cena" | "aplicacao" | "figura" | "geral", "numero": número do exercício ou null, "gravidade": "erro" | "atencao", "problema": "o que está errado, em 1 frase", "sugestao": "como corrigir, em 1 frase" } ] }`;
}

// Limpa a resposta do revisor: descarta lugares desconhecidos e exercícios que não existem
export function normalizarApontamentos(json, totalExercicios = 0) {
  const lista = Array.isArray(json?.apontamentos) ? json.apontamentos : [];
  const vistos = new Set();
  return lista
    .map((a) => {
      const lugar = LUGARES_REVISOR[a?.onde] ? a.onde : "geral";
      const numero = lugar === "exercicio" ? parseInt(a?.numero, 10) : null;
      const problema = txt(a?.problema);
      const sugestao = txt(a?.sugestao);
      return { lugar, numero, gravidade: a?.gravidade === "erro" ? "erro" : "aviso", problema, sugestao };
    })
    .filter((a) => a.problema && (a.lugar !== "exercicio" || (a.numero >= 1 && a.numero <= totalExercicios)))
    .filter((a) => {
      const k = `${a.lugar}|${a.numero}|${a.problema.toLowerCase()}`;
      return !vistos.has(k) && vistos.add(k);
    })
    .slice(0, 10);
}

const motivoDe = (a) => `${a.problema}${a.sugestao ? ` Sugestão: ${a.sugestao}` : ""}`;

// Grava os apontamentos no material. "enunciados" são os da hora do pedido: se o
// professor mexeu nos exercícios enquanto o revisor lia, o apontamento vai para o
// exercício certo (ou é descartado, se aquele exercício já foi trocado/removido).
export function aplicarRevisao(material = {}, apontamentos = [], enunciados = null) {
  // resposta de uma apostila anterior (o professor gerou outra enquanto o revisor lia): ignora
  if (enunciados && !(material.exercicios || []).some((e) => enunciados.includes(e.enunciado))) return material;
  const exercicios = (material.exercicios || []).map((e) => {
    const { revisor, ...resto } = e;
    return resto;
  });
  const geral = [];
  for (const a of apontamentos) {
    const item = { motivo: motivoDe(a), gravidade: a.gravidade };
    if (a.lugar !== "exercicio") {
      geral.push({ onde: LUGARES_REVISOR[a.lugar], ...item });
      continue;
    }
    let k = a.numero - 1;
    if (enunciados) k = exercicios.findIndex((e) => e.enunciado === enunciados[a.numero - 1]);
    if (k < 0 || !exercicios[k]) continue;
    exercicios[k] = { ...exercicios[k], revisor: [...(exercicios[k].revisor || []), item] };
  }
  return { ...material, exercicios, revisorGeral: geral, revisaoConteudo: { feita: true, total: apontamentos.length, em: new Date().toISOString() } };
}

// Apontamentos do revisor no formato da auditoria (onde, motivo, gravidade, fonte)
export function problemasDoRevisor(material = {}) {
  const p = [];
  (material.exercicios || []).forEach((e, i) => {
    for (const r of e.revisor || []) p.push({ onde: `Exercício ${i + 1}`, motivo: r.motivo, gravidade: r.gravidade, fonte: "revisor" });
  });
  for (const r of material.revisorGeral || []) p.push({ onde: r.onde, motivo: r.motivo, gravidade: r.gravidade, fonte: "revisor" });
  return p;
}
