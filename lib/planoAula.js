// Plano de aula na estrutura usual do Currículo Paulista (SEDUC-SP):
// identificação, unidade temática, objeto de conhecimento, habilidades (códigos da BNCC,
// adotados pelo Currículo Paulista), objetivos, desenvolvimento aula a aula, recursos,
// avaliação, recuperação contínua e adaptações. Sem acesso a rede: testável.
import { limparTexto } from "./validacao.js";

export const AULAS = [1, 2, 3, 4, 5, 6, 8, 10];
export const LIMITES_PLANO = { professor: 120, escola: 120, turma: 60, tema: 200, periodo: 60, observacoes: 1000, bncc: 20, habilidade: 2000 };

const txt = (v, max) => limparTexto(typeof v === "string" ? v : "").slice(0, max);
const etapaDoCodigo = (c = "") => (/^EF/i.test(c) ? "Ensino Fundamental" : /^EM/i.test(c) ? "Ensino Médio" : null);
const etapaDoNivel = (n = "") => (/m[eé]dio/i.test(n) ? "Ensino Médio" : /fundamental/i.test(n) ? "Ensino Fundamental" : null);

// Confere o pedido no servidor. Habilidade de outra etapa BLOQUEIA (não só avisa).
export function validarPedidoPlano(body = {}, { temBase = false } = {}) {
  const d = {};
  for (const [campo, max] of Object.entries(LIMITES_PLANO)) {
    const v = limparTexto(typeof body[campo] === "string" ? body[campo] : "");
    if (v.length > max) return { ok: false, erro: `O campo "${campo}" passou do limite de ${max} caracteres.` };
    d[campo] = v;
  }
  d.disciplina = txt(body.disciplina, 60);
  d.nivel = txt(body.nivel, 60);
  d.ano = txt(body.ano, 6);
  d.aulas = AULAS.includes(Number(body.aulas)) ? Number(body.aulas) : 2;
  if (!d.tema && temBase) d.tema = "conforme o material base";
  if (!d.disciplina || !d.nivel || !d.tema) return { ok: false, erro: "Preencha Disciplina, Nível e Tema." };
  const doCodigo = etapaDoCodigo(d.bncc);
  const doNivel = etapaDoNivel(d.nivel);
  if (d.bncc && doCodigo && doNivel && doCodigo !== doNivel)
    return { ok: false, erro: `O código ${d.bncc} é do ${doCodigo}, mas o nível escolhido é ${doNivel}. Escolha uma habilidade da etapa certa.` };
  return { ok: true, dados: d };
}

const anoLegivel = (ano = "") => (!ano ? "" : ano.startsWith("EM") ? `${ano.slice(2)}ª série` : `${ano}º ano`);

// Texto de uma apostila do EduGera para servir de base ao plano (sem dados do professor)
export function resumoDaApostila(registro = {}) {
  const m = registro.material || {};
  const f = registro.form || {};
  const l = [];
  l.push(`Título: ${m.tituloDidatico || f.tema || ""}`);
  if (m.resumoPedagogico) l.push(`Resumo: ${m.resumoPedagogico}`);
  if (m.cena?.pergunta) l.push(`Situação do cotidiano: ${m.cena.pergunta}`);
  for (const c of (m.conceitos || []).slice(0, 8)) if (c?.termo && c.termo !== "—") l.push(`Conceito: ${c.termo} — ${c.definicao || ""}`);
  for (const fo of (m.formulas || []).slice(0, 6)) l.push(`Fórmula: ${fo?.expressao || fo?.formula || ""} ${fo?.legenda || fo?.descricao || ""}`.trim());
  (m.exercicios || []).slice(0, 10).forEach((e, i) => e?.enunciado && l.push(`Exercício ${i + 1}: ${e.enunciado}`));
  return l.join("\n").slice(0, 8000);
}

const TIPOS_BASE = { apostila: "uma apostila criada no EduGera (texto abaixo)", pdf: "o PDF anexo, enviado pelo professor" };

export function montarPromptPlano(d, habilidadeOficial = "", base = null) {
  return `Monte um PLANO DE AULA no formato usado nas escolas que seguem o Currículo Paulista.
${base ? `
MATERIAL BASE: ${TIPOS_BASE[base.tipo] || "material do professor"}.
O plano deve ser construído A PARTIR desse material: use os conceitos, a situação e as atividades dele nas aulas
(diga em qual aula cada parte do material é usada). Se o material indicar outra habilidade ou outro tema, siga o material.
Ignore nomes de alunos ou dados pessoais que apareçam no material.${base.texto ? `
---
${base.texto}
---` : ""}
` : ""}
DADOS DO PROFESSOR
- Componente curricular: ${d.disciplina}
- Etapa: ${d.nivel}${d.ano ? ` — ${anoLegivel(d.ano)}` : ""}
- Tema: ${d.tema}
- Habilidade: ${habilidadeOficial || (d.bncc ? `${d.bncc} — ${d.habilidade || "(sem texto)"}` : "não informada; escolha UMA habilidade da BNCC adequada à etapa e ao ano, com o código correto")}
- Número de aulas: ${d.aulas}
- Orientações do professor: ${d.observacoes || "nenhuma"}

REGRAS
1. Use exatamente ${d.aulas} aula(s), numeradas de 1 a ${d.aulas}, cada uma com introdução, desenvolvimento e fechamento.
2. A habilidade informada é a referência; não invente códigos. O Currículo Paulista usa os códigos da BNCC.
3. Conteúdo adequado ao ano escolhido; nada de anos seguintes.
4. Não escreva nomes de alunos nem dados pessoais.
5. Português do Brasil, frases diretas, linguagem de documento pedagógico.
6. Avaliação contínua: diga o que observar e com que instrumento.

Responda SOMENTE com JSON neste formato:
{"plano_de_aula": {
  "unidade_tematica": "...",
  "objeto_de_conhecimento": "...",
  "habilidades": [{"codigo": "...", "descricao": "..."}],
  "objetivos": ["..."],
  "aulas": [{"numero": 1, "titulo": "...", "introducao": "...", "desenvolvimento": "...", "fechamento": "..."}],
  "recursos": ["..."],
  "avaliacao": {"criterios": ["..."], "instrumentos": ["..."]},
  "recuperacao": "...",
  "adaptacoes": "..."
}}`;
}

const lista = (v, max, n) => (Array.isArray(v) ? v : []).map((x) => txt(String(x ?? ""), max)).filter(Boolean).slice(0, n);

// Limpa o JSON da IA: tamanhos, aulas renumeradas 1..N e habilidade oficial no lugar da inventada
export function normalizarPlano(json, d, oficial = null) {
  const p = (json && (json.plano_de_aula || json)) || {};
  const aulas = (Array.isArray(p.aulas) ? p.aulas : []).slice(0, d.aulas).map((a, i) => ({
    numero: i + 1,
    titulo: txt(a?.titulo, 160),
    introducao: txt(a?.introducao, 1200),
    desenvolvimento: txt(a?.desenvolvimento, 2500),
    fechamento: txt(a?.fechamento, 1200),
  }));
  let habilidades = (Array.isArray(p.habilidades) ? p.habilidades : [])
    .map((h) => ({ codigo: txt(h?.codigo, 20).toUpperCase(), descricao: txt(h?.descricao, 2000) }))
    .filter((h) => h.codigo || h.descricao)
    .slice(0, 4);
  if (oficial) habilidades = [{ codigo: oficial.c, descricao: oficial.t }];
  else if (d.bncc) habilidades = [{ codigo: d.bncc.toUpperCase(), descricao: d.habilidade || habilidades[0]?.descricao || "" }];
  // código de outra etapa vindo da IA não passa
  const doNivel = etapaDoNivel(d.nivel);
  habilidades = habilidades.filter((h) => !h.codigo || !etapaDoCodigo(h.codigo) || !doNivel || etapaDoCodigo(h.codigo) === doNivel);
  const av = p.avaliacao || {};
  return {
    identificacao: {
      professor: d.professor,
      escola: d.escola,
      turma: d.turma,
      componente: d.disciplina,
      etapa: [d.nivel, anoLegivel(d.ano)].filter(Boolean).join(" — "),
      periodo: d.periodo,
      aulas: d.aulas,
      tema: d.tema,
    },
    unidadeTematica: txt(p.unidade_tematica, 300),
    objetoConhecimento: txt(p.objeto_de_conhecimento, 500),
    habilidades,
    objetivos: lista(p.objetivos, 400, 8),
    aulas,
    recursos: lista(p.recursos, 200, 12),
    avaliacao: { criterios: lista(av.criterios, 400, 8), instrumentos: lista(av.instrumentos, 200, 8) },
    recuperacao: txt(p.recuperacao, 1200),
    adaptacoes: txt(p.adaptacoes, 1200),
  };
}

// O plano está completo o bastante para entregar?
export function problemasDoPlano(pl, d) {
  const p = [];
  if (pl.aulas.length !== d.aulas) p.push(`a IA devolveu ${pl.aulas.length} de ${d.aulas} aulas`);
  if (!pl.objetivos.length) p.push("sem objetivos");
  if (!pl.avaliacao.criterios.length && !pl.avaliacao.instrumentos.length) p.push("sem avaliação");
  if (pl.aulas.some((a) => !a.desenvolvimento)) p.push("aula sem desenvolvimento");
  return p;
}

// Texto simples (para colar no Word ou no modelo da escola)
export function planoParaTexto(pl) {
  const i = pl.identificacao;
  const l = [];
  l.push("PLANO DE AULA");
  for (const [r, v] of [["Professor(a)", i.professor], ["Escola", i.escola], ["Turma", i.turma], ["Componente curricular", i.componente], ["Etapa / ano", i.etapa], ["Período", i.periodo], ["Número de aulas", String(i.aulas)], ["Tema", i.tema]])
    if (v) l.push(`${r}: ${v}`);
  l.push("", `UNIDADE TEMÁTICA: ${pl.unidadeTematica}`, `OBJETO DE CONHECIMENTO: ${pl.objetoConhecimento}`, "", "HABILIDADE(S)");
  pl.habilidades.forEach((h) => l.push(`- ${[h.codigo, h.descricao].filter(Boolean).join(" — ")}`));
  l.push("", "OBJETIVOS");
  pl.objetivos.forEach((o) => l.push(`- ${o}`));
  l.push("", "DESENVOLVIMENTO");
  pl.aulas.forEach((a) => l.push(``, `Aula ${a.numero}${a.titulo ? ` — ${a.titulo}` : ""}`, `Introdução: ${a.introducao}`, `Desenvolvimento: ${a.desenvolvimento}`, `Fechamento: ${a.fechamento}`));
  l.push("", "RECURSOS");
  pl.recursos.forEach((r) => l.push(`- ${r}`));
  l.push("", "AVALIAÇÃO", "Critérios:");
  pl.avaliacao.criterios.forEach((c) => l.push(`- ${c}`));
  l.push("Instrumentos:");
  pl.avaliacao.instrumentos.forEach((c) => l.push(`- ${c}`));
  l.push("", `RECUPERAÇÃO CONTÍNUA: ${pl.recuperacao}`, `ADAPTAÇÕES / INCLUSÃO: ${pl.adaptacoes}`);
  return l.join("\n");
}

// ---------- revisão automática do plano (segunda leitura pela IA) ----------
export function montarPromptRevisaoPlano(pl, habilidadeOficial = "") {
  const json = {
    unidade_tematica: pl.unidadeTematica,
    objeto_de_conhecimento: pl.objetoConhecimento,
    objetivos: pl.objetivos,
    aulas: pl.aulas,
    recursos: pl.recursos,
    avaliacao: pl.avaliacao,
    recuperacao: pl.recuperacao,
    adaptacoes: pl.adaptacoes,
  };
  return `Revise este plano de aula como coordenador(a) pedagógico(a) da disciplina ${pl.identificacao.componente}, ${pl.identificacao.etapa}.
Habilidade de referência: ${habilidadeOficial || pl.habilidades.map((h) => `${h.codigo} — ${h.descricao}`).join("; ") || "não informada"}.

Procure e CORRIJA:
- erros conceituais (ex.: confundir volume com capacidade, área com perímetro, massa com peso);
- objetivos que não batem com a habilidade ou com o ano;
- atividades que não ensinam o que o objetivo promete;
- avaliação que não mede os objetivos;
- conteúdo de anos seguintes;
- erros de português.
Não mude o que está certo. Mantenha o mesmo número de aulas e a mesma estrutura.

PLANO:
${JSON.stringify(json)}

Responda SOMENTE com JSON:
{"correcoes": ["o que foi corrigido e por quê (uma frase cada); lista vazia se nada"], "plano_de_aula": { mesmo formato do plano acima }}`;
}

// Aplica a revisão sem perder identificação/habilidade oficial nem o número de aulas
export function aplicarRevisaoPlano(pl, json, d) {
  const correcoes = (Array.isArray(json?.correcoes) ? json.correcoes : []).map((c) => txt(String(c ?? ""), 300)).filter(Boolean).slice(0, 10);
  const revisado = json?.plano_de_aula ? normalizarPlano({ plano_de_aula: json.plano_de_aula }, d) : null;
  if (!revisado || revisado.aulas.length !== pl.aulas.length || !revisado.objetivos.length) return { plano: pl, correcoes: [], aplicada: false };
  return { plano: { ...revisado, identificacao: pl.identificacao, habilidades: pl.habilidades }, correcoes, aplicada: true };
}

// ---------- planos salvos neste navegador ----------
export const LIMITE_PLANOS_SALVOS = 50;
export function adicionarPlanoNaLista(lista = [], plano, origem = null) {
  const item = { id: `pl-${Date.now().toString(36)}`, criadoEm: new Date().toISOString(), origem, plano };
  return [item, ...(Array.isArray(lista) ? lista : [])].slice(0, LIMITE_PLANOS_SALVOS);
}
