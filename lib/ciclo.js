// Ciclo de Recomposição da Rede (piloto) — regras puras, usadas no navegador e no servidor.
//   1. O coordenador distribui um CADERNO (uma avaliação) para várias escolas.
//   2. Cada professor corrige a turma e envia só a CONTAGEM de respostas por questão.
//   3. O painel agrega escola × habilidade; turma ou escola com menos de 5 alunos não aparece.
//   4. A mini-reavaliação traz questões novas das habilidades mais fracas; o painel compara.
// Nenhuma função aqui recebe ou devolve nome de aluno.
import { relatorioTurma, BRANCO, DUPLA, LETRAS_CARTAO, faixaDe } from "./correcao.js";

export const MIN_ALUNOS = 5; // abaixo disso o painel não mostra (evita identificar aluno)
export const MAX_ALUNOS_TURMA = 80;
export const OPCOES_CONTAGEM = [...LETRAS_CARTAO, BRANCO, DUPLA];
export const LIMITES_CADERNO = { titulo: 140, escola: 120, turma: 40, escolas: 60, itens: 12 };
export const MAX_ITENS_REAVALIACAO = 8;
export const MIN_ITENS_REAVALIACAO = 6;

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const texto = (v, max) => String(typeof v === "string" ? v : "").replace(/\s+/g, " ").trim().slice(0, max);

// Código do caderno: 8 letras/algarismos sem os que confundem (0/O, 1/I/L)
export const ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const codigoValido = (c) => typeof c === "string" && new RegExp(`^[${ALFABETO_CODIGO}]{8}$`).test(c);
export const normalizarCodigo = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

export function normalizarEscolas(entrada) {
  const lista = Array.isArray(entrada) ? entrada : String(entrada || "").split(/\r?\n/);
  const vistos = new Set();
  const out = [];
  for (const e of lista) {
    const t = texto(e, LIMITES_CADERNO.escola);
    const k = t.toLowerCase();
    if (t && !vistos.has(k)) {
      vistos.add(k);
      out.push(t);
    }
  }
  return out.slice(0, LIMITES_CADERNO.escolas);
}

// Avaliação aceita como caderno: 1 a 12 questões, todas com gabarito
export function validarAvaliacaoDoCaderno(av) {
  if (!av || typeof av !== "object" || !Array.isArray(av.itens)) return { ok: false, erro: "Avaliação inválida." };
  if (av.itens.length < 1 || av.itens.length > LIMITES_CADERNO.itens) return { ok: false, erro: "O caderno precisa ter de 1 a 12 questões." };
  if (av.itens.some((it) => !it || !LETRAS_CARTAO.includes(it.correta))) return { ok: false, erro: "Há questão sem gabarito. Corrija antes de distribuir." };
  if (JSON.stringify(av).length > 400_000) return { ok: false, erro: "Avaliação grande demais." };
  return { ok: true };
}

// O que o professor envia: a distribuição de respostas de cada questão (já calculada no relatório)
export function contagensDaTurma(avaliacao, alunos = []) {
  return relatorioTurma(avaliacao, alunos).porQuestao.map((q) => Object.fromEntries(OPCOES_CONTAGEM.map((o) => [o, q.distribuicao[o] || 0])));
}

export function validarEnvio(caderno, body = {}) {
  const itens = caderno?.avaliacao?.itens || [];
  const escola = texto(body.escola, LIMITES_CADERNO.escola);
  const turma = texto(body.turma, LIMITES_CADERNO.turma);
  const alunos = Number(body.alunos);
  if (!escola || !(caderno.escolas || []).some((e) => e.toLowerCase() === escola.toLowerCase())) return { ok: false, erro: "Escolha a escola na lista do caderno." };
  if (!turma) return { ok: false, erro: 'Escreva a turma (ex.: "7º A").' };
  if (!Number.isInteger(alunos) || alunos < 1 || alunos > MAX_ALUNOS_TURMA) return { ok: false, erro: "Número de alunos inválido." };
  const c = body.contagens;
  if (!Array.isArray(c) || c.length !== itens.length) return { ok: false, erro: "As respostas não batem com o caderno." };
  const contagens = [];
  for (const q of c) {
    if (!q || typeof q !== "object") return { ok: false, erro: "Contagem inválida." };
    const linha = {};
    let soma = 0;
    for (const o of OPCOES_CONTAGEM) {
      const v = Number(q[o] || 0);
      if (!Number.isInteger(v) || v < 0) return { ok: false, erro: "Contagem inválida." };
      linha[o] = v;
      soma += v;
    }
    if (Object.keys(q).some((k) => !OPCOES_CONTAGEM.includes(k))) return { ok: false, erro: "Contagem inválida." };
    if (soma !== alunos) return { ok: false, erro: "A contagem de uma questão não bate com o número de alunos." };
    contagens.push(linha);
  }
  const nomeEscola = caderno.escolas.find((e) => e.toLowerCase() === escola.toLowerCase());
  return { ok: true, dados: { escola: nomeEscola, turma, alunos, contagens } };
}

// ---------- grupos (habilidade, ou descritor quando a prova tem uma habilidade só) ----------
const codigosDo = (it) => {
  const l = (it?.habilidades?.length ? it.habilidades : [it?.habilidade]).map((h) => (typeof h === "string" ? h : h?.codigo)).filter(Boolean);
  return l.length ? l : [];
};

export function gruposDaAvaliacao(av) {
  const itens = av?.itens || [];
  // agrupa por habilidade quando a prova cobre 2 ou mais (pela habilidade principal de cada questão)
  const codigos = new Set(itens.map((it) => codigosDo(it)[0]).filter(Boolean));
  const porHabilidade = codigos.size >= 2;
  const chaveDe = (i) => {
    const it = itens[i];
    if (porHabilidade) return codigosDo(it)[0] || "—";
    return texto(it?.descritor, 200) || `Questão ${i + 1}`;
  };
  const grupos = [];
  const mapa = new Map();
  itens.forEach((it, i) => {
    const chave = chaveDe(i);
    if (!mapa.has(chave)) {
      const g = { chave, rotulo: chave, habilidade: codigosDo(it)[0] || "", descritor: texto(it?.descritor, 200), itens: [] };
      mapa.set(chave, g);
      grupos.push(g);
    }
    mapa.get(chave).itens.push(i);
  });
  return { porHabilidade, grupos, chaveDe };
}

// Soma os envios. `indices` restringe às questões informadas (o "antes" da comparação).
export function agregar(av, resultados = [], { indices = null } = {}) {
  const itens = av?.itens || [];
  const { porHabilidade, grupos, chaveDe } = gruposDaAvaliacao(av);
  const usar = indices ? new Set(indices) : null;
  const vazio = () => ({ alunos: 0, turmas: 0, grupos: {} });
  const somar = (alvo, r) => {
    alvo.alunos += r.alunos;
    alvo.turmas += 1;
    itens.forEach((it, i) => {
      if (usar && !usar.has(i)) return;
      const k = chaveDe(i);
      const g = (alvo.grupos[k] ||= { acertos: 0, respostas: 0 });
      g.acertos += Number(r.contagens?.[i]?.[it.correta] || 0);
      g.respostas += r.alunos;
    });
  };
  const rede = vazio();
  const porEscola = new Map();
  for (const r of resultados) {
    somar(rede, r);
    if (!porEscola.has(r.escola)) porEscola.set(r.escola, vazio());
    somar(porEscola.get(r.escola), r);
  }
  const fechar = (o) => {
    const visivel = o.alunos >= MIN_ALUNOS;
    const g = {};
    for (const [k, v] of Object.entries(o.grupos)) {
      const p = pct(v.acertos, v.respostas);
      g[k] = visivel ? { percentual: p, faixa: faixaDe(p).id } : null;
    }
    return { alunos: o.alunos, turmas: o.turmas, visivel, grupos: g };
  };

  // por questão (só na rede): acerto e alternativa errada mais marcada
  const questoes = itens.map((it, i) => {
    const dist = Object.fromEntries(OPCOES_CONTAGEM.map((o) => [o, 0]));
    for (const r of resultados) for (const o of OPCOES_CONTAGEM) dist[o] += Number(r.contagens?.[i]?.[o] || 0);
    const total = rede.alunos;
    const erradas = LETRAS_CARTAO.filter((l) => l !== it.correta && dist[l] > 0).sort((a, b) => dist[b] - dist[a]);
    const comum = erradas[0];
    return {
      n: i + 1,
      grupo: chaveDe(i),
      descritor: texto(it.descritor, 200),
      percentual: total >= MIN_ALUNOS ? pct(dist[it.correta] || 0, total) : null,
      erroMaisComum: comum && total >= MIN_ALUNOS ? { letra: comum, percentual: pct(dist[comum], total), explicacao: it.distratores?.[comum] || "" } : null,
    };
  });

  return {
    porHabilidade,
    grupos: grupos.filter((g) => !usar || g.itens.some((i) => usar.has(i))),
    rede: fechar(rede),
    escolas: [...porEscola.entries()].map(([escola, o]) => ({ escola, ...fechar(o) })).sort((a, b) => a.escola.localeCompare(b.escola, "pt-BR")),
    questoes,
  };
}

// Grupos da rede do mais fraco para o mais forte (só os que aparecem)
export function gruposMaisFracos(agregado) {
  return (agregado?.grupos || [])
    .map((g) => ({ ...g, percentual: agregado.rede.grupos[g.chave]?.percentual ?? null }))
    .filter((g) => g.percentual !== null)
    .sort((a, b) => a.percentual - b.percentual);
}

// Vagas da mini-reavaliação: cada vaga é a questão do caderno que ganha uma "irmã" nova.
// Só entram os grupos abaixo de 70% (se nenhum estiver, o mais fraco). Com poucas questões
// fracas, a mesma questão de origem ganha mais de uma irmã, até chegar a `min` (máximo `max`).
export function itensParaReavaliacao(av, agregado, { min = MIN_ITENS_REAVALIACAO, max = MAX_ITENS_REAVALIACAO } = {}) {
  const fracos = gruposMaisFracos(agregado);
  let alvos = fracos.filter((g) => g.percentual < 70);
  if (!alvos.length && fracos.length) alvos = [fracos[0]];
  const base = alvos.flatMap((g) => g.itens).slice(0, max);
  if (!base.length) return [];
  const vagas = [...base];
  for (let k = 0; vagas.length < Math.min(min, max); k++) vagas.push(base[k % base.length]);
  return vagas;
}

// Monta o caderno da mini-reavaliação a partir das questões novas (cada uma lembra a de origem)
export function montarReavaliacao(diag, novos = []) {
  const itens = novos.map(({ origem, item }) => ({ ...item, origem }));
  const titulo = `Reavaliação · ${texto(diag?.titulo, 120) || "caderno"}`;
  return { ...diag, titulo, itens, reavaliacao: true };
}

// Antes × depois por grupo, na rede e em cada escola (só onde os dois lados têm 5 alunos ou mais)
export function compararAntesDepois(diagAv, diagRes, reavAv, reavRes) {
  const origens = (reavAv?.itens || []).map((it) => it.origem).filter((i) => Number.isInteger(i));
  const antes = agregar(diagAv, diagRes, { indices: origens });
  // o "depois" usa a chave do grupo da questão de origem (mesma habilidade/descritor)
  const { chaveDe } = gruposDaAvaliacao(diagAv);
  const reavComChave = {
    ...reavAv,
    itens: (reavAv?.itens || []).map((it) => ({ ...it, habilidades: undefined, habilidade: undefined, descritor: undefined, _chave: chaveDe(it.origem) })),
  };
  const depoisBruto = agregarPorChave(reavComChave, reavRes);
  const linha = (a, d) => ({
    antes: a?.percentual ?? null,
    depois: d?.percentual ?? null,
    diferenca: a && d ? d.percentual - a.percentual : null,
  });
  const grupos = antes.grupos.map((g) => ({
    chave: g.chave,
    rotulo: g.rotulo,
    habilidade: g.habilidade,
    rede: linha(antes.rede.grupos[g.chave], depoisBruto.rede.grupos[g.chave]),
    escolas: antes.escolas.map((e) => {
      const de = depoisBruto.escolas.find((x) => x.escola === e.escola);
      return { escola: e.escola, ...linha(e.grupos[g.chave], de?.grupos[g.chave]) };
    }),
  }));
  return { grupos, alunosAntes: antes.rede.alunos, alunosDepois: depoisBruto.rede.alunos };
}

// agregação usando a chave já gravada em cada item (_chave)
function agregarPorChave(av, resultados) {
  const itens = av.itens;
  const vazio = () => ({ alunos: 0, grupos: {} });
  const somar = (alvo, r) => {
    alvo.alunos += r.alunos;
    itens.forEach((it, i) => {
      const g = (alvo.grupos[it._chave] ||= { acertos: 0, respostas: 0 });
      g.acertos += Number(r.contagens?.[i]?.[it.correta] || 0);
      g.respostas += r.alunos;
    });
  };
  const rede = vazio();
  const porEscola = new Map();
  for (const r of resultados) {
    somar(rede, r);
    if (!porEscola.has(r.escola)) porEscola.set(r.escola, vazio());
    somar(porEscola.get(r.escola), r);
  }
  const fechar = (o) => ({
    alunos: o.alunos,
    grupos: Object.fromEntries(Object.entries(o.grupos).map(([k, v]) => [k, o.alunos >= MIN_ALUNOS ? { percentual: pct(v.acertos, v.respostas) } : null])),
  });
  return { rede: fechar(rede), escolas: [...porEscola.entries()].map(([escola, o]) => ({ escola, ...fechar(o) })) };
}

// Recomposição da turma: as 2–3 habilidades (ou descritores) mais fracas do relatório
export function recomposicaoDaTurma(rel, { max = 3 } = {}) {
  const hab = (rel?.porHabilidade || []).filter((h) => h.codigo !== "—");
  if (hab.length >= 2) {
    return hab
      .filter((h) => h.faixa !== "adequado")
      .slice(0, max)
      .map((h) => ({ habilidade: h.codigo, percentual: h.percentual, faixa: h.faixa, tema: h.descritores?.[0] || "" }));
  }
  // prova de uma habilidade só: os descritores das questões de menor acerto
  const codigo = hab[0]?.codigo || "";
  const vistos = new Set();
  return (rel?.porQuestao || [])
    .filter((q) => q.faixa !== "adequado" && q.descritor)
    .sort((a, b) => a.percentual - b.percentual)
    .filter((q) => !vistos.has(q.descritor) && vistos.add(q.descritor))
    .slice(0, max)
    .map((q) => ({ habilidade: codigo, percentual: q.percentual, faixa: q.faixa, tema: q.descritor }));
}
