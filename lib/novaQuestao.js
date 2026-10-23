// Uma questão NOVA no lugar de outra (mesma habilidade, descritor e nível), com a MESMA
// conferência da prova: sistema + resolução cega e revisão no Gemini; se nada passar,
// a questão montada pelo próprio sistema (Matemática). Só no servidor.
// Usada por "Trocar esta questão" e pela mini-reavaliação do Ciclo de Recomposição.
import bnccDados from "@/data/bncc-habilidades.json";
import { indexar, resolverCodigo } from "./bncc.js";
import { openaiJson, geminiJson, temGemini, temOpenAI } from "./provedoresIA.js";
import {
  pedidoDaAvaliacao,
  montarPromptTrocarUma,
  candidatosDeReposicao,
  repararAvaliacao,
  escolherTroca,
  montarPromptResolucaoCega,
  aplicarResolucaoCega,
  montarPromptRevisaoItens,
  aplicarRevisaoItens,
  conferirItem,
  montarPromptRepor,
  aceitarReposicao,
} from "./avaliacao.js";
import { conferirCobertura, conferirRepeticoes } from "./diagnostico.js";
import { questaoDoSistema } from "./questoesSistema.js";

const BNCC = indexar(bnccDados.habilidades);
const SISTEMA = "Você é elaborador de itens de avaliações externas (Prova Paulista, SARESP, SAEB), especialista na BNCC e no Currículo Paulista. Escreve itens de múltipla escolha corretos, claros e com distratores baseados em erros reais dos alunos. Responda em português do Brasil, só com JSON válido.";
const SISTEMA_CEGO = "Você é professor experiente e resolve questões de múltipla escolha com rigor, sem gabarito. Responda em português do Brasil, só com JSON válido.";
const SISTEMA_REVISOR = "Você é revisor de avaliações externas (Prova Paulista, SARESP, SAEB): confere se cada questão avalia o tema e a habilidade pedidos, se o enunciado não entrega a resposta e se as explicações dos erros batem com cada alternativa. Responda em português do Brasil, só com JSON válido.";

async function pedirIA({ sistema, prompt, temperatura }) {
  if (temOpenAI()) {
    const a = await openaiJson({ sistema, prompt, modelo: process.env.MODELO_TEXTO || "gpt-4o", temperatura });
    if (a.ok || !temGemini()) return a;
  }
  return temGemini() ? geminiJson({ sistema, prompt, temperatura }) : { ok: false, status: 500, erro: "sem IA" };
}

// av: a prova inteira (a nova questão não pode repetir nenhuma delas); indice: a questão a substituir.
// Devolve { item } (sem os campos internos) ou { item: null, diag }.
export async function novaQuestao(av, indice, { t0 = Date.now(), d = pedidoDaAvaliacao(av) } = {}) {
  const resolver = (c) => resolverCodigo(BNCC, c);
  const oficial = d.bncc ? resolverCodigo(BNCC, d.bncc) : null;
  const velho = av.itens[indice];
  let escolhida = null;
  const diag = [];
  for (let tentativa = 1; !escolhida && tentativa <= 2 && Date.now() - t0 < 75_000; tentativa++) {
    const r = await pedirIA({ sistema: SISTEMA, prompt: montarPromptTrocarUma(av, indice, d), temperatura: 0.6 });
    if (!r.ok) {
      diag.push({ tentativa, erro: `${r.status} ${r.erro}`.slice(0, 160) });
      continue;
    }
    const semEla = { ...av, itens: av.itens.filter((_, i) => i !== indice) };
    const cands = candidatosDeReposicao(semEla, r.json, d, resolver, oficial).map((c) => ({ ...c, dificuldade: velho.dificuldade || c.dificuldade }));
    let tmp = repararAvaliacao({ itens: cands }).avaliacao;
    const limpos = tmp.itens.map((it, i) => (!it.problemas?.length && it.correta && !it.semGabarito ? i : -1)).filter((i) => i >= 0);
    if (temGemini() && limpos.length && Date.now() - t0 < 90_000) {
      const [rc, rv] = await Promise.all([
        geminiJson({ sistema: SISTEMA_CEGO, prompt: montarPromptResolucaoCega(tmp, limpos), temperatura: 0 }),
        geminiJson({ sistema: SISTEMA_REVISOR, prompt: montarPromptRevisaoItens(tmp, limpos, d, oficial ? `${oficial.c} — ${oficial.t}` : d.bncc), temperatura: 0 }),
      ]);
      if (rc.ok) tmp = aplicarResolucaoCega(tmp, rc.json, limpos).avaliacao;
      if (rv.ok) tmp = aplicarRevisaoItens(tmp, rv.json, limpos).avaliacao;
    }
    escolhida = escolherTroca(av, indice, tmp.itens, d);
    diag.push({ tentativa, recebidas: cands.length, problemas: tmp.itens.map((it) => (it.problemas || [])[0] || null) });
  }
  // Matemática (área, perímetro, volume, gráficos, ângulos): o sistema monta a questão
  if (!escolhida) {
    const comandos = new Set(av.itens.map((it) => it.comando));
    for (let k = 0; k < 6 && !escolhida; k++) {
      const sys = questaoDoSistema(d, indice + 7 * (k + 1) + new Date().getSeconds(), { habilidades: velho.habilidades?.length ? velho.habilidades : oficial ? [{ codigo: oficial.c, verificada: true }] : [], dificuldade: velho.dificuldade || "media" });
      if (!sys) break;
      const c = conferirItem(sys, indice + 1).item;
      if (!c.problemas?.length && c.correta && !comandos.has(c.comando)) escolhida = c;
    }
  }
  if (!escolhida) return { item: null, diag };
  const { problemas, reposta, ...item } = escolhida;
  return { item, diag };
}

// Completar a avaliação: UMA questão nova que falta (mesmo tema; no diagnóstico, uma das
// habilidades da distribuição ainda sem questão), com a mesma conferência da prova.
export async function questaoParaCompletar(av, { t0 = Date.now() } = {}) {
  const base = pedidoDaAvaliacao(av);
  const plano = (av.pedido?.plano || []).map((p) => ({ ...p, texto: resolverCodigo(BNCC, p.codigo)?.t || "" }));
  const d = { ...base, itens: av.itens.length + 1, ...(plano.length ? { plano } : {}) };
  const resolver = (c) => resolverCodigo(BNCC, c);
  const oficial = d.bncc ? resolverCodigo(BNCC, d.bncc) : null;
  const diag = [];
  for (let tentativa = 1; tentativa <= 2 && Date.now() - t0 < 80_000; tentativa++) {
    const r = await pedirIA({ sistema: SISTEMA, prompt: montarPromptRepor(av, 1, d), temperatura: 0.5 });
    if (!r.ok) {
      diag.push({ tentativa, erro: `${r.status} ${r.erro}`.slice(0, 160) });
      continue;
    }
    const cands = candidatosDeReposicao(av, r.json, d, resolver, oficial);
    let tmp = repararAvaliacao({ ...av, itens: [...av.itens, ...cands] }).avaliacao;
    tmp = conferirRepeticoes(plano.length ? conferirCobertura(tmp, plano) : tmp, { diagnostico: !!plano.length });
    const ini = av.itens.length;
    const limpos = tmp.itens.map((it, i) => (i >= ini && !it.problemas?.length && it.correta && !it.semGabarito ? i : -1)).filter((i) => i >= 0);
    if (temGemini() && limpos.length && Date.now() - t0 < 95_000) {
      const [rc, rv] = await Promise.all([
        geminiJson({ sistema: SISTEMA_CEGO, prompt: montarPromptResolucaoCega(tmp, limpos), temperatura: 0 }),
        geminiJson({ sistema: SISTEMA_REVISOR, prompt: montarPromptRevisaoItens(tmp, limpos, d, plano.length ? "" : oficial ? `${oficial.c} — ${oficial.t}` : d.bncc), temperatura: 0 }),
      ]);
      if (rc.ok) tmp = aplicarResolucaoCega(tmp, rc.json, limpos).avaliacao;
      if (rv.ok) tmp = aplicarRevisaoItens(tmp, rv.json, limpos).avaliacao;
    }
    const ac = aceitarReposicao(av, tmp.itens.slice(ini), d);
    diag.push({ tentativa, recebidas: cands.length, problemas: tmp.itens.slice(ini).map((it) => (it.problemas || [])[0] || null) });
    if (ac.aceitas.length) {
      const { problemas, reposta, ...item } = ac.avaliacao.itens[ac.avaliacao.itens.length - 1];
      return { item, diag };
    }
  }
  // Matemática (área, perímetro, volume, gráficos, ângulos): o sistema monta a questão
  const comandos = new Set(av.itens.map((it) => it.comando));
  // (no diagnóstico não: a questão do sistema não segue a distribuição de habilidades)
  for (let k = 0; k < 6 && !plano.length; k++) {
    const sys = questaoDoSistema(d, av.itens.length + 7 * (k + 1) + new Date().getSeconds(), { habilidades: oficial ? [{ codigo: oficial.c, verificada: true }] : av.itens[0]?.habilidades || [], dificuldade: "media" });
    if (!sys) break;
    const c = conferirItem(sys, av.itens.length + 1).item;
    if (!c.problemas?.length && c.correta && !comandos.has(c.comando)) {
      const { problemas, reposta, ...item } = c;
      return { item, diag };
    }
  }
  return { item: null, diag };
}
