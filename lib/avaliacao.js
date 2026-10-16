// Avaliação no padrão das provas externas de SP (Prova Paulista / SARESP):
// itens de múltipla escolha com texto-base, comando, 4 alternativas (A–D),
// uma só correta e distratores que revelam erros típicos. Cada item traz a
// habilidade da BNCC e o descritor (o que o item avalia). A versão do professor
// tem gabarito, resolução e a análise de cada distrator (o que o aluno que marcou
// aquela letra provavelmente pensou), para planejar a retomada.
// Sem acesso a rede: testável.

import { limparTexto } from "./validacao.js";
import { etapaIncompativel } from "./coerencia.js";
import { normalizarFigura, citaFigura } from "./figuras.js";
import { conferirExercicio, valorNumerico } from "./gabarito.js";
import { unificarNomes } from "./material.js";

export const QUANTIDADES_ITENS = [5, 8, 10, 12];
export const LETRAS = ["A", "B", "C", "D"];
export const DIFICULDADES_ITEM = ["facil", "media", "dificil"];
export const ROTULO_DIFICULDADE = { facil: "Fácil", media: "Média", dificil: "Difícil" };
export const LIMITES_AVALIACAO = { professor: 120, escola: 120, turma: 60, tema: 200, observacoes: 1000, bncc: 20, habilidade: 2000 };
export const LIMITE_AVALIACOES_SALVAS = 50;

const txt = (v) => (typeof v === "string" ? limparTexto(v) : "");
const lista = (v) => (Array.isArray(v) ? v : []);
const anoLegivel = (ano = "") => (!ano ? "" : ano.startsWith("EM") ? `${ano.slice(2)}ª série` : `${ano}º ano`);

// ---------- Pedido ----------
export function validarPedidoAvaliacao(body = {}, { temBase = false } = {}) {
  const d = {};
  for (const [campo, max] of Object.entries(LIMITES_AVALIACAO)) {
    const v = limparTexto(typeof body[campo] === "string" ? body[campo] : "");
    if (v.length > max) return { ok: false, erro: `O campo "${campo}" passou do limite de ${max} caracteres.` };
    d[campo] = v;
  }
  d.disciplina = limparTexto(typeof body.disciplina === "string" ? body.disciplina : "").slice(0, 60);
  d.nivel = limparTexto(typeof body.nivel === "string" ? body.nivel : "").slice(0, 60);
  d.ano = limparTexto(typeof body.ano === "string" ? body.ano : "").slice(0, 6);
  d.itens = QUANTIDADES_ITENS.includes(Number(body.itens)) ? Number(body.itens) : 8;
  if (!d.tema && temBase) {
    d.tema = "conforme a apostila";
    d.temaDoMaterial = true;
  }
  if (!d.disciplina || !d.nivel || !d.tema) return { ok: false, erro: "Preencha Disciplina, Nível e Tema." };
  if (!d.temaDoMaterial && d.tema.length < 3) return { ok: false, erro: "Escreva um tema com pelo menos 3 caracteres." };
  const etapa = etapaIncompativel(d);
  if (etapa) return { ok: false, erro: etapa.charAt(0).toUpperCase() + etapa.slice(1) };
  return { ok: true, dados: d };
}

// ---------- Pedido à IA ----------
export function montarPromptAvaliacao(d, habilidadeOficial = "", base = null, candidatas = []) {
  const n = d.itens;
  const faceis = Math.max(1, Math.round(n * 0.3));
  const dificeis = Math.max(1, Math.round(n * 0.3));
  const medias = n - faceis - dificeis;
  return `Monte uma AVALIAÇÃO DE MÚLTIPLA ESCOLHA no padrão das avaliações externas de São Paulo (Prova Paulista e SARESP).
${base?.texto ? `
MATERIAL BASE: uma apostila criada no EduGera e já trabalhada com a turma (texto abaixo).
Avalie o que a apostila ensina: os mesmos conceitos e habilidades, com situações NOVAS (não copie os exercícios da apostila).
Ignore nomes de alunos ou dados pessoais que apareçam no material.
---
${base.texto}
---
` : ""}
DADOS DO PROFESSOR
- Componente curricular: ${d.disciplina}
- Etapa: ${d.nivel}${d.ano ? ` — ${anoLegivel(d.ano)}` : ""}
- Tema: ${d.temaDoMaterial ? "o da apostila acima" : d.tema}
- Habilidade: ${
    habilidadeOficial ||
    (d.bncc
      ? `${d.bncc} — ${d.habilidade || "(sem texto)"}`
      : candidatas.length
        ? "não informada; use de 1 a 3 habilidades DA LISTA OFICIAL abaixo, as que mais combinam com o tema. Copie o código exatamente."
        : "não informada; use habilidades da BNCC adequadas à etapa e ao ano, com o código correto")
  }${candidatas.length && !habilidadeOficial && !d.bncc ? `
LISTA OFICIAL (BNCC):
${candidatas.join("\n")}` : ""}
- Orientações do professor: ${d.observacoes || "nenhuma"}

Retorne um JSON com esta estrutura EXATA:
{
  "titulo": "título curto da avaliação (ex.: \\"Avaliação — Volume de blocos retangulares\\")",
  "itens": [
    {
      "habilidade": "código BNCC que o item avalia (ex.: EF07MA30)",
      "descritor": "o que o item avalia, começando por verbo, até 15 palavras (ex.: \\"Resolver problema de volume de bloco retangular em cm³\\")",
      "dificuldade": "facil" | "media" | "dificil",
      "textoBase": "texto de apoio: situação do cotidiano, notícia, receita, tabela descrita etc. (1 a 4 frases)",
      "figura": { UMA figura dos tipos abaixo } ou null,
      "comando": "pergunta direta que o aluno responde, terminando com ? ou :",
      "alternativas": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "resolucao": "resolução curta feita ANTES de escolher a letra; em cálculo, termine com = resultado e depois 'Portanto, ...'. Não cite letras.",
      "correta": "A" | "B" | "C" | "D",
      "distratores": { "LETRA_ERRADA": "o erro de raciocínio que leva o aluno a marcar essa alternativa (1 frase)" }
    }
  ]
}

FIGURAS (desenhadas pelo sistema a partir destes dados):
- { "tipo": "tabela", "cabecalho": ["...", "..."], "linhas": [["...", "..."]], "legenda": "" }   (até 6 colunas e 8 linhas)
- { "tipo": "barras", "titulo": "", "unidade": "", "itens": [{ "rotulo": "...", "valor": 10 }], "legenda": "" }   (até 8 barras)
- { "tipo": "reta", "inicio": 0, "fim": 1, "divisoes": 4, "rotulos": "extremos" | "todos" | "nenhum", "marcar": null ou número do tracinho a destacar com a letra A, "legenda": "" }
- { "tipo": "fracao", "forma": "barra" | "circulo", "partes": 5, "pintadas": 1, "legenda": "" }
- { "tipo": "grade", "linhas": 3, "colunas": 4, "pintadas": 0, "legenda": "" }
- { "tipo": "linha_do_tempo", "eventos": [{ "data": "1500", "texto": "..." }], "legenda": "" }
- { "tipo": "fluxo", "etapas": ["...", "..."], "ciclo": false, "legenda": "" }
- { "tipo": "mapa", "centro": "ideia central", "ramos": ["...", "..."], "legenda": "" }

REGRAS DO PADRÃO PROVA PAULISTA / SARESP:
- Exatamente ${n} itens. Dificuldade: ${faceis} "facil", ${medias} "media" e ${dificeis} "dificil", em ordem crescente.
- Dificuldade pela exigência real: "facil" = reconhecer ou aplicar diretamente um conceito ou fórmula num passo; "media" = aplicar com conversão ou comparação (2 passos); "dificil" = problema com várias etapas, interpretação de dados ou análise de um erro.
- Todo item tem texto-base contextualizado (situação real da faixa etária) e um comando claro e afirmativo. O comando NÃO usa "exceto", "incorreta", "falsa" nem "não é".
- Cada item avalia UMA habilidade e UM descritor. Se só uma habilidade foi informada, todos os itens a avaliam, cobrindo aspectos diferentes dela (não repita o mesmo item com números trocados).
- Exatamente 4 alternativas (A, B, C, D) e só UMA correta. Nada de "todas as anteriores" ou "nenhuma das anteriores".
- Alternativas curtas, paralelas e de tamanho parecido; a correta não pode ser a mais longa nem a única com unidade. Alternativas numéricas em ordem crescente.
- Distratores PLAUSÍVEIS: cada alternativa errada nasce de um erro comum e real dos alunos dessa etapa (ex.: somar em vez de multiplicar, esquecer de converter a unidade, confundir área e volume, ler só parte do texto). Em "distratores", explique as 3 letras erradas (nunca a correta), mostrando a conta errada que chega EXATAMENTE ao valor daquela alternativa (ex.: "Somou as medidas: 30 + 20 + 10 = 60"). Confira cada conta.
- Antes de preencher "correta", RESOLVA o item em "resolucao": a letra marcada TEM de ser a alternativa cujo valor é o resultado da resolução. Confira antes de terminar.
- Distribua as respostas corretas entre A, B, C e D (nenhuma letra com mais da metade dos itens).
- Use figura quando o item depende de dado visual (tabela, gráfico, reta, malha, linha do tempo). NUNCA cite tabela, gráfico ou figura sem preencher "figura". A figura não entrega a resposta.
- Números e contextos adequados à faixa etária; unidades sempre explícitas e coerentes (área em unidades quadradas, volume em cúbicas ou litros).
- Use só conteúdos que a BNCC prevê até o ano escolhido; nunca antecipe conteúdo de anos seguintes. A habilidade é da etapa escolhida (EF = Ensino Fundamental, EM = Ensino Médio).
- Potências com ^ (ex.: 3^4); o sistema formata como expoente.
- Não escreva nomes de alunos reais; use nomes comuns e variados nos contextos.
- Português do Brasil revisado, texto direto, sem frases de enfeite.`;
}

// ---------- Normalização ----------
const semRotulo = (a) => String(a).replace(/^\s*\(?\s*[a-eA-E]\s*[).:\-–]\s*/, "").trim();
const letraValida = (v) => {
  const m = /^\s*\(?\s*([a-dA-D])\b/.exec(String(v || ""));
  return m ? m[1].toUpperCase() : null;
};

export function normalizarItem(it = {}, resolverHabilidade = () => null, habilidadePadrao = null) {
  const alternativas = lista(it.alternativas).map((a) => semRotulo(txt(a))).filter(Boolean).slice(0, 5);
  let correta = letraValida(it.correta) || letraValida(it.resposta);
  if (correta && LETRAS.indexOf(correta) >= alternativas.length) correta = null;
  const distratores = {};
  const brutos = it.distratores && typeof it.distratores === "object" && !Array.isArray(it.distratores) ? it.distratores : {};
  for (const [k, v] of Object.entries(brutos)) {
    const l = letraValida(k);
    if (l && LETRAS.indexOf(l) < alternativas.length && txt(v)) distratores[l] = txt(v); // a da correta sai depois da conferência
  }
  const codigo = txt(it.habilidade).toUpperCase().replace(/\s+/g, "");
  const oficial = codigo ? resolverHabilidade(codigo) : null;
  const habilidade = oficial
    ? { codigo: oficial.c, verificada: true }
    : habilidadePadrao
      ? { codigo: habilidadePadrao.c, verificada: true, substituida: codigo || null }
      : codigo
        ? { codigo, verificada: false }
        : null;
  return {
    habilidade,
    descritor: txt(it.descritor),
    dificuldade: DIFICULDADES_ITEM.includes(it.dificuldade) ? it.dificuldade : "media",
    textoBase: txt(it.textoBase),
    figura: normalizarFigura(it.figura),
    comando: txt(it.comando),
    alternativas,
    correta,
    resolucao: txt(it.resolucao),
    distratores,
  };
}

// Alternativas só numéricas (com unidade no máximo) vão em ordem crescente, como nas provas oficiais
const UNIDADES = /\b(?:cm|dm|km|mm|m|l|ml|kg|g|reais|R\$|horas?|h|min|vez|minutos?|segundos?|anos?|dias?|semanas?|meses|vezes|metros?(?: c[uú]bicos?| quadrados?)?|cent[ií]metros?(?: c[uú]bicos?| quadrados?)?|litros?|mililitros?|quilos?|quilogramas?|gramas?|graus?|°C?|%)(?=[\s.,;]|$)/gi;
export const numeroDaAlternativa = (t = "") => {
  const s = String(t).replace(/([a-z])[²³]/gi, "$1").replace(/R\$\s*/g, "").trim();
  if (!/^-?\d/.test(s)) return null;
  if (/[a-zà-ú]{3,}/i.test(s.replace(UNIDADES, ""))) return null;
  return valorNumerico(s.replace(UNIDADES, "").trim());
};
const ehNumerica = (t) => numeroDaAlternativa(t) != null;

function reordenar(item, novaOrdem) {
  // novaOrdem[i] = índice antigo que vai para a posição i
  const alternativas = novaOrdem.map((k) => item.alternativas[k]);
  const de = (l) => LETRAS[novaOrdem.indexOf(LETRAS.indexOf(l))];
  const distratores = Object.fromEntries(Object.entries(item.distratores).map(([l, v]) => [de(l), v]));
  return { ...item, alternativas, correta: item.correta ? de(item.correta) : null, distratores };
}

export function ordenarNumericas(item) {
  if (item.alternativas.length < 2 || !item.alternativas.every(ehNumerica)) return item;
  const ordem = item.alternativas.map((a, i) => [numeroDaAlternativa(a), i]).sort((x, y) => x[0] - y[0]).map(([, i]) => i);
  if (ordem.every((k, i) => k === i)) return item;
  return reordenar(item, ordem);
}

// A IA concentra o gabarito em B e C. Se uma letra passa de 40% (com 5 itens ou mais),
// itens NÃO numéricos que estão na letra em excesso passam a ter a correta na letra
// menos usada (troca de lugar com a alternativa que estava lá). Só mexe em itens cuja
// resolução e distratores não citam letras.
const citaLetra = (t = "") => /\b(?:alternativa|letra|op[cç][aã]o)\s+\(?[a-d]\b|\b[a-d]\)/i.test(t);

export function equilibrarGabarito(itens = []) {
  const cont = contarLetras(itens);
  const maior = Math.max(0, ...Object.values(cont));
  if (itens.length < 5 || maior / itens.length <= 0.4) return { itens, mexeu: false };
  const teto = Math.ceil(itens.length / 4);
  let mexeu = false;
  const novos = itens.map((it) => {
    if (!it.correta || it.alternativas.length !== 4 || it.alternativas.every(ehNumerica)) return it;
    if (citaLetra(it.resolucao) || Object.values(it.distratores).some(citaLetra)) return it;
    if (cont[it.correta] <= teto) return it;
    const alvo = LETRAS.reduce((m, l) => (cont[l] < cont[m] ? l : m), LETRAS[0]);
    if (cont[alvo] >= cont[it.correta] - 1) return it;
    cont[it.correta]--;
    cont[alvo]++;
    // troca a correta com a alternativa que está na letra-alvo
    const a = LETRAS.indexOf(it.correta);
    const b = LETRAS.indexOf(alvo);
    const ordem = [0, 1, 2, 3];
    ordem[a] = b;
    ordem[b] = a;
    mexeu = true;
    return reordenar(it, ordem);
  });
  return { itens: novos, mexeu };
}

export function contarLetras(itens = []) {
  const c = { A: 0, B: 0, C: 0, D: 0 };
  for (const it of itens) if (c[it.correta] != null) c[it.correta]++;
  return c;
}

export function normalizarAvaliacao(json = {}, d = {}, oficial = null, resolverHabilidade = () => null) {
  const raiz = json?.avaliacao && typeof json.avaliacao === "object" ? json.avaliacao : json || {};
  // habilidade oficial informada pelo professor: item com código inventado volta para ela
  let itens = lista(raiz.itens)
    .filter((it) => it && (it.comando || it.textoBase))
    .slice(0, d.itens || 12)
    .map((it) => normalizarItem(unificarNomes(it), resolverHabilidade, oficial))
    .map(ordenarNumericas);
  // dificuldade crescente (fácil → média → difícil), mantendo a ordem da IA dentro de cada nível
  const peso = { facil: 0, media: 1, dificil: 2 };
  itens = itens.map((it, i) => [it, i]).sort((a, b) => peso[a[0].dificuldade] - peso[b[0].dificuldade] || a[1] - b[1]).map(([it]) => it);
  const eq = equilibrarGabarito(itens);
  itens = eq.itens;
  return {
    titulo: txt(raiz.titulo) || `Avaliação — ${d.tema || ""}`.trim(),
    identificacao: {
      professor: d.professor || "",
      escola: d.escola || "",
      turma: d.turma || "",
      componente: d.disciplina || "",
      etapa: [d.nivel, anoLegivel(d.ano)].filter(Boolean).join(" — "),
      tema: d.temaDoMaterial ? txt(raiz.tema) || txt(raiz.titulo).replace(/^avalia[cç][aã]o\s*[—–-]\s*/i, "") : d.tema,
    },
    itens,
    gabaritoEquilibrado: eq.mexeu,
  };
}

// ---------- Conferências (determinísticas, sem IA) ----------
const aviso = (n, motivo, tipo = "conferir", trecho = "") => ({ onde: `Item ${n}`, motivo, tipo, trecho });

export function conferirItem(it, n) {
  const avisos = [];
  let item = it;
  if (item.alternativas.length !== 4) avisos.push(aviso(n, `tem ${item.alternativas.length} alternativas; o padrão é 4 (A a D).`));
  const limpas = item.alternativas.map((a) => a.toLowerCase().replace(/[\s.;]+/g, ""));
  if (new Set(limpas).size !== limpas.length) avisos.push(aviso(n, "tem alternativas repetidas."));
  if (!item.correta) avisos.push(aviso(n, "está sem a letra correta no gabarito."));
  if (/\b(todas as anteriores|nenhuma das anteriores)\b/i.test(item.alternativas.join(" "))) avisos.push(aviso(n, "usa \"todas/nenhuma das anteriores\", fora do padrão das provas oficiais."));
  if (/\b(exceto|incorreta|falsa|n[aã]o [eé])\b/i.test(item.comando)) avisos.push(aviso(n, "o comando está na forma negativa (exceto, incorreta…); as provas oficiais usam comando afirmativo.", "conferir", item.comando));
  if (!item.figura && (citaFigura(item.comando) || citaFigura(item.textoBase)) && /\b(tabela|gr[aá]fico|figura|reta|malha|linha do tempo|esquema)\b/i.test(`${item.textoBase} ${item.comando}`))
    avisos.push(aviso(n, "cita uma tabela, gráfico ou figura que não veio no item."));
  if (item.habilidade && !item.habilidade.verificada) avisos.push(aviso(n, `a habilidade ${item.habilidade.codigo} não foi localizada na BNCC.`));
  if (item.habilidade?.substituida) avisos.push(aviso(n, `a IA indicou o código ${item.habilidade.substituida}, inexistente; foi usada a habilidade informada (${item.habilidade.codigo}).`, "corrigido"));

  // gabarito × resolução: mesma conferência das apostilas
  if (item.correta && item.alternativas.length >= 2) {
    const ex = {
      enunciado: `${item.textoBase} ${item.comando}`,
      alternativas: item.alternativas.map((a, i) => `${"abcd"[i]}) ${item.alternativas.every(ehNumerica) ? String(numeroDaAlternativa(a)) : a}`),
      resolucao: item.resolucao,
      resposta: `${item.correta.toLowerCase()}) ${item.alternativas[LETRAS.indexOf(item.correta)] || ""}`,
    };
    const r = conferirExercicio(ex, n);
    const nova = letraValida(r.exercicio.resposta);
    const trocou = nova && nova !== item.correta;
    const textoDe = (l) => `${l}) ${item.alternativas[LETRAS.indexOf(l)] || ""}`;
    for (const a of r.avisos) {
      if (a.tipo === "corrigido" && trocou)
        avisos.push(aviso(n, `gabarito corrigido de ${item.correta} para ${textoDe(nova)}: a própria resolução chega a esse valor.`, "corrigido", textoDe(item.correta)));
      else avisos.push({ ...a, onde: `Item ${n}`, trecho: "", motivo: String(a.motivo).replace(/\b([a-d])\)/g, (_, l) => `${l.toUpperCase()})`) });
    }
    if (trocou) item = { ...item, correta: nova };
  }
  if (item.correta && item.distratores[item.correta]) {
    const distratores = { ...item.distratores };
    delete distratores[item.correta];
    item = { ...item, distratores };
  }
  const faltam = LETRAS.slice(0, item.alternativas.length).filter((l) => l !== item.correta && !item.distratores[l]);
  if (item.correta && faltam.length) avisos.push(aviso(n, `falta a análise do distrator ${faltam.join(", ")} (o erro que leva o aluno a essa letra).`));
  return { item, avisos };
}

export function conferirAvaliacao(av = {}) {
  const avisos = [];
  const itens = lista(av.itens).map((it, i) => {
    const r = conferirItem(it, i + 1);
    avisos.push(...r.avisos);
    return r.item;
  });
  if (itens.length >= 5) {
    const c = contarLetras(itens);
    const [letra, qtd] = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    if (qtd / itens.length > 0.5) avisos.push({ onde: "Gabarito", motivo: `${qtd} de ${itens.length} respostas são ${letra}; espalhe as respostas entre A, B, C e D.`, tipo: "conferir", trecho: "" });
  }
  return { avaliacao: { ...av, itens }, avisos };
}

// Mapa habilidade → itens (versão do professor)
export function mapaHabilidades(itens = []) {
  const m = new Map();
  itens.forEach((it, i) => {
    const c = it.habilidade?.codigo || "—";
    if (!m.has(c)) m.set(c, { codigo: c, itens: [], descritores: [] });
    const e = m.get(c);
    e.itens.push(i + 1);
    if (it.descritor && !e.descritores.includes(it.descritor)) e.descritores.push(it.descritor);
  });
  return [...m.values()];
}

// Texto de uma apostila do EduGera para servir de base (sem dados do professor nem gabarito)
export function resumoParaAvaliacao(registro = {}) {
  const m = registro.material || {};
  const f = registro.form || {};
  const l = [];
  l.push(`Título: ${m.tituloDidatico || f.tema || ""}`);
  if (f.tema) l.push(`Tema: ${f.tema}`);
  if (m.bncc?.codigo) l.push(`Habilidade: ${m.bncc.codigo}${m.bncc.texto ? ` — ${m.bncc.texto}` : ""}`);
  if (m.resumoPedagogico) l.push(`Resumo: ${m.resumoPedagogico}`);
  for (const c of lista(m.conceitos).slice(0, 8)) if (c?.termo && c.termo !== "—") l.push(`Conceito: ${c.termo} — ${c.definicao || ""}`);
  for (const fo of lista(m.formulas).slice(0, 6)) l.push(`Regra: ${fo?.nome || ""} ${fo?.expressao || ""}`.trim());
  lista(m.exercicios).slice(0, 10).forEach((e, i) => e?.enunciado && l.push(`Exercício trabalhado ${i + 1}: ${e.enunciado}`));
  return l.join("\n").slice(0, 8000);
}

export function adicionarAvaliacaoNaLista(listaAtual = [], avaliacao, origem = null) {
  const item = { id: `av-${Date.now().toString(36)}`, criadoEm: new Date().toISOString(), origem, avaliacao };
  return [item, ...(Array.isArray(listaAtual) ? listaAtual : [])].slice(0, LIMITE_AVALIACOES_SALVAS);
}
