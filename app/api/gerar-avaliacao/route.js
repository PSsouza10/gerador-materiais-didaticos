import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import bnccDados from "@/data/bncc-habilidades.json";
import { indexar, resolverCodigo, DISCIPLINA_PARA_COMPONENTE, cobreAno } from "@/lib/bncc";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consumirGeracao, devolverGeracao } from "@/lib/uso";
import { openaiJson, geminiJson, temGemini, temOpenAI } from "@/lib/provedoresIA";
import { habilidadesCandidatas, mensagemFalhaPlano } from "@/lib/planoAula";
import { validarPedidoAvaliacao, montarPromptAvaliacao, normalizarAvaliacao, conferirAvaliacao, resumoParaAvaliacao, itensParaRefazer, montarPromptRefazer, montarPromptTrocar, aplicarRefeitos, retirarComProblema, finalizarAvaliacao, repararAvaliacao } from "@/lib/avaliacao";
import { apostilaDaConta } from "@/lib/apostilaDaConta";
import { questaoDoSistema } from "@/lib/questoesSistema";
import { conferirItem, montarPromptResolucaoCega, aplicarResolucaoCega, conferirTemaDaProva, montarPromptRevisaoItens, aplicarRevisaoItens, montarPromptRepor, candidatosDeReposicao, aceitarReposicao, figurasQueFaltam } from "@/lib/avaliacao";

// Avaliação no padrão Prova Paulista / SARESP. Conta como UMA geração do plano do professor.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // geração + até 3 rodadas de correção das questões com erro

const BNCC = indexar(bnccDados.habilidades);
// Modelos que o administrador pode escolher na bateria (comparação antes de deixar fixo)
const MODELOS_PERMITIDOS = ["gpt-4o", "gpt-4.1", "gpt-4.1-mini", "o4-mini", "o3", "gpt-5", "gpt-5-mini"];
const SISTEMA_REVISOR = "Você é revisor de avaliações externas (Prova Paulista, SARESP, SAEB): confere se cada questão avalia o tema e a habilidade pedidos, se o enunciado não entrega a resposta e se as explicações dos erros batem com cada alternativa. Responda em português do Brasil, só com JSON válido.";
const SISTEMA_CEGO = "Você é professor experiente e resolve questões de múltipla escolha com rigor, sem gabarito. Responda em português do Brasil, só com JSON válido.";
const SISTEMA =
  "Você é elaborador de itens de avaliações externas (Prova Paulista, SARESP, SAEB), especialista na BNCC e no Currículo Paulista. Escreve itens de múltipla escolha corretos, claros e com distratores baseados em erros reais dos alunos. Responda em português do Brasil, só com JSON válido.";

async function postRota(request, _contexto, requestId) {
  const t0 = Date.now();
  if (!temOpenAI() && !temGemini()) return NextResponse.json({ error: "IA não configurada." }, { status: 500 });
  if (!authConfigurado) return NextResponse.json({ error: "Login não configurado." }, { status: 503 });
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ error: "Entre com sua conta para gerar avaliações." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const fonte = body.fonte?.tipo === "apostila" ? body.fonte : null;
  const v = validarPedidoAvaliacao(body, { temBase: !!fonte });
  if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 });
  const d = v.dados;

  let uso;
  try {
    uso = await consumirGeracao(usuario.email, requestId);
  } catch (e) {
    console.error("Erro ao registrar uso (avaliação):", e);
    return NextResponse.json({ error: "Não foi possível verificar seu limite agora. Tente de novo." }, { status: 503 });
  }
  if (!uso.ok) return NextResponse.json({ error: uso.mensagem, motivo: uso.motivo, limiteAtingido: true }, { status: 429 });

  let base = null;
  if (fonte) {
    const registro = await apostilaDaConta(usuario.email, fonte.id).catch(() => null);
    if (!registro) {
      await devolverGeracao(usuario.email, requestId);
      return NextResponse.json({ error: "Não encontrei essa apostila na sua conta." }, { status: 404 });
    }
    base = { tipo: "apostila", texto: resumoParaAvaliacao(registro) };
  }

  const oficial = d.bncc ? resolverCodigo(BNCC, d.bncc) : null;
  const candidatas = oficial || d.bncc ? [] : habilidadesCandidatas(bnccDados.habilidades, d, DISCIPLINA_PARA_COMPONENTE[d.disciplina] || [], cobreAno);
  const prompt = montarPromptAvaliacao(d, oficial ? `${oficial.c} — ${oficial.t} (texto oficial)` : "", base, candidatas);
  // Modelo por disciplina: Matemática pode usar um modelo de raciocínio (MODELO_MATEMATICA na Vercel);
  // o administrador escolhe outro na bateria para comparar.
  const padrao = process.env.MODELO_TEXTO || "gpt-4o";
  const ehMatematica = /matem/i.test(d.disciplina || "");
  let modelo = uso.admin && MODELOS_PERMITIDOS.includes(body.modelo) ? body.modelo : (ehMatematica && process.env.MODELO_MATEMATICA) || padrao;

  const falhas = [];
  let r = temOpenAI() ? await openaiJson({ sistema: SISTEMA, prompt, modelo, temperatura: 0.4 }) : { ok: false, erro: "OpenAI ausente" };
  if (!r.ok && temOpenAI() && modelo !== padrao) {
    falhas.push(r);
    console.error("Avaliação: modelo escolhido falhou, voltando ao padrão", { request_id: requestId, modelo, status: r.status, erro: r.erro });
    modelo = padrao;
    r = await openaiJson({ sistema: SISTEMA, prompt, modelo, temperatura: 0.4 });
  }
  if (!r.ok) {
    falhas.push(r);
    console.error("Avaliação: OpenAI falhou", { request_id: requestId, status: r.status, erro: r.erro });
    if (temGemini()) {
      r = await geminiJson({ sistema: SISTEMA, prompt, temperatura: 0.4 });
      if (!r.ok) {
        // falha passageira (resposta cortada, JSON inválido, lotado): uma 2ª tentativa antes de desistir
        console.error("Avaliação: Gemini falhou, tentando de novo", { request_id: requestId, status: r.status, erro: r.erro });
        r = await geminiJson({ sistema: SISTEMA, prompt, temperatura: 0.3 });
      }
      if (!r.ok) {
        falhas.push(r);
        console.error("Avaliação: Gemini falhou", { request_id: requestId, status: r.status, erro: r.erro });
      }
    }
  }
  if (!r.ok) {
    await devolverGeracao(usuario.email, requestId);
    return NextResponse.json({ error: mensagemFalhaPlano(falhas).replace("gerar o plano", "gerar a avaliação") }, { status: 502 });
  }

  const resolver = (c) => resolverCodigo(BNCC, c);
  // Correções e reposição: OpenAI; se ela falhar (sem crédito, fora do ar), o Gemini faz o pedido
  let openaiFora = !temOpenAI() || falhas.some((f) => f.status === 429 || f.status === 401);
  const pedirIA = async ({ sistema, prompt, temperatura }) => {
    if (!openaiFora) {
      const a = await openaiJson({ sistema, prompt, modelo, temperatura });
      if (a.ok || !temGemini()) return a;
      if (a.status === 429 || a.status === 401) openaiFora = true;
      console.error("Avaliação: OpenAI falhou, usando o Gemini", { request_id: requestId, status: a.status, erro: a.erro });
    }
    return temGemini() ? geminiJson({ sistema, prompt, temperatura }) : { ok: false, status: 500, erro: "sem IA disponível" };
  };
  // 1ª conferência: contas refeitas pelo sistema, gabarito, explicações, figuras
  const primeira = conferirAvaliacao(normalizarAvaliacao(r.json, d, oficial, resolver));
  let atual = primeira.avaliacao;
  const corrigidos = primeira.avisos.filter((a) => a.tipo === "corrigido");
  // Questão com problema NÃO é entregue com aviso: é refeita (até 2 vezes); se ainda falhar,
  // a IA escreve uma questão nova no lugar; se nem assim passar, a questão sai da prova.
  const refeitas = new Set();
  const diagRodadas = []; // só para o administrador: o que cada rodada pediu e conseguiu
  const sistemaRef = "Você é revisor de itens de avaliações externas (Prova Paulista, SARESP). Corrige questões de múltipla escolha com rigor matemático. Responda em português do Brasil, só com JSON válido.";
  const rodadas = [montarPromptRefazer, montarPromptRefazer, montarPromptTrocar];
  const reparar = () => {
    const rp = repararAvaliacao(atual);
    atual = rp.avaliacao;
    rp.reparadas.forEach((n) => refeitas.add(n));
    if (rp.reparadas.length) diagRodadas.push({ reparoDoSistema: rp.reparadas });
  };
  // 2ª IA (Gemini), em paralelo: (1) resolve SEM ver o gabarito; (2) revisa com o gabarito se a questão
  // está no tema/habilidade, se o enunciado entrega a resposta e se cada explicação descreve a sua letra.
  // Qualquer problema → a questão é refeita (ou sai e é reposta).
  const habilidadeTexto = oficial ? `${oficial.c} — ${oficial.t}` : d.bncc || "";
  const revisarComGemini = async (av, indices, etapa) => {
    if (!temGemini() || !indices.length || Date.now() - t0 > 255_000) return av;
    const [rc, rv] = await Promise.all([
      geminiJson({ sistema: SISTEMA_CEGO, prompt: montarPromptResolucaoCega(av, indices), temperatura: 0 }),
      geminiJson({ sistema: SISTEMA_REVISOR, prompt: montarPromptRevisaoItens(av, indices, d, habilidadeTexto), temperatura: 0 }),
    ]);
    const diag = { gemini: etapa, conferidas: indices.map((i) => i + 1) };
    if (rc.ok) {
      const ap = aplicarResolucaoCega(av, rc.json, indices);
      av = ap.avaliacao;
      diag.discordantes = ap.discordantes;
    } else diag.erroCega = `${rc.status} ${rc.erro}`.slice(0, 160);
    if (rv.ok) {
      const ap = aplicarRevisaoItens(av, rv.json, indices);
      av = ap.avaliacao;
      diag.revisaoApontou = ap.marcadas;
    } else diag.erroRevisao = `${rv.status} ${rv.erro}`.slice(0, 160);
    if (!rc.ok || !rv.ok) console.error("Avaliação: revisão do Gemini falhou", { request_id: requestId, etapa, cega: rc.status, revisao: rv.status });
    diagRodadas.push(diag);
    return av;
  };
  const resolverAsCegas = async (indices, etapa) => {
    atual = await revisarComGemini(atual, indices, etapa);
  };
  const temaCodigo = oficial?.c || null;
  atual = conferirTemaDaProva(atual, d, temaCodigo); // fora do tema/habilidade → refazer
  const semProblema = () => atual.itens.map((it, i) => (!it.problemas?.length && it.correta && !it.semGabarito && !it.doSistema ? i : -1)).filter((i) => i >= 0);
  reparar(); // primeiro o sistema conserta o que consegue sozinho (alternativas erradas típicas)
  await resolverAsCegas(semProblema(), "primeira");
  for (const [k, montar] of rodadas.entries()) {
    const indices = itensParaRefazer(atual);
    if (!indices.length) break;
    if (Date.now() - t0 > 210_000) {
      console.error("Avaliação: sem tempo para mais uma rodada", { request_id: requestId, rodada: k + 1 });
      break;
    }
    const prompt = montar(atual, indices, d);
    const rr = await pedirIA({ sistema: sistemaRef, prompt, temperatura: k === 2 ? 0.5 : 0.2 });
    if (!rr.ok) {
      console.error("Avaliação: rodada de correção falhou", { request_id: requestId, rodada: k + 1, status: rr.status, erro: rr.erro });
      diagRodadas.push({ rodada: k + 1, erro: `${rr.status} ${rr.erro}`.slice(0, 200) });
      continue;
    }
    const ap = aplicarRefeitos(atual, rr.json, resolver, oficial);
    diagRodadas.push({ rodada: k + 1, pedidas: indices.map((i) => i + 1), devolvidas: (rr.json?.itensRefeitos || []).length, aceitas: ap.trocados, ms: Date.now() - t0 });
    atual = conferirTemaDaProva(ap.avaliacao, d, temaCodigo);
    ap.trocados.forEach((n) => refeitas.add(n));
  }
  reparar(); // e de novo depois da IA, antes de retirar alguma questão
  // as questões refeitas também passam pela resolução às cegas (as outras já passaram)
  await resolverAsCegas(semProblema().filter((i) => refeitas.has(i + 1)), "refeitas");
  // última garantia (área, perímetro, volume): o sistema monta a questão inteira no lugar da que não passou
  const montadas = [];
  atual = {
    ...atual,
    itens: atual.itens.map((it, i) => {
      if (!(it.problemas?.length || it.semGabarito || !it.correta)) return it;
      const sys = questaoDoSistema(d, i, { habilidades: it.habilidades?.length ? it.habilidades : oficial ? [{ codigo: oficial.c, verificada: true }] : [], dificuldade: it.dificuldade });
      if (!sys) return it;
      const conf = conferirItem(sys, i + 1).item;
      if (conf.problemas?.length || !conf.correta) return it;
      montadas.push(i + 1);
      return conf;
    }),
  };
  if (montadas.length) diagRodadas.push({ montadasPeloSistema: montadas });
  const ret = retirarComProblema(atual);
  atual = ret.avaliacao;
  // REPOSIÇÃO: a prova chega sempre com o número de questões pedido. A IA escreve questões novas,
  // que passam pela mesma conferência (sistema + Gemini) e respeitam a cota de figuras.
  const repostas = [];
  for (let tentativa = 1; atual.itens.length < d.itens && tentativa <= 2 && Date.now() - t0 < 235_000; tentativa++) {
    const faltam = d.itens - atual.itens.length;
    const pr = montarPromptRepor(atual, faltam, d);
    const rn = await pedirIA({ sistema: SISTEMA, prompt: pr, temperatura: 0.5 });
    if (!rn.ok) {
      diagRodadas.push({ reposicao: tentativa, erro: `${rn.status} ${rn.erro}`.slice(0, 160) });
      continue;
    }
    const cands = candidatosDeReposicao(atual, rn.json, d, resolver, oficial);
    let tmp = repararAvaliacao({ ...atual, itens: [...atual.itens, ...cands] }).avaliacao;
    const base = atual.itens.length;
    const limpos = tmp.itens.map((it, i) => (i >= base && !it.problemas?.length && it.correta && !it.semGabarito ? i : -1)).filter((i) => i >= 0);
    tmp = await revisarComGemini(tmp, limpos, `reposição ${tentativa}`);
    const ac = aceitarReposicao(atual, tmp.itens.slice(base), d);
    atual = ac.avaliacao;
    repostas.push(...ac.aceitas);
    diagRodadas.push({ reposicao: tentativa, faltavam: faltam, recebidas: cands.length, aceitas: ac.aceitas, problemas: tmp.itens.slice(base).map((it) => (it.problemas || [])[0] || null), ms: Date.now() - t0 });
  }
  // última reposição (Matemática: área, perímetro, volume, gráficos, ângulos): questão montada pelo sistema
  for (let k = 0; atual.itens.length < d.itens && k < d.itens * 2; k++) {
    const sys = questaoDoSistema(d, atual.itens.length + k, { habilidades: oficial ? [{ codigo: oficial.c, verificada: true }] : atual.itens[0]?.habilidades || [], dificuldade: ["facil", "media", "dificil"][(atual.itens.length + k) % 3] });
    if (!sys) break;
    const conf = conferirItem(sys, atual.itens.length + 1).item;
    if (conf.problemas?.length || !conf.correta) continue;
    if (atual.itens.some((x) => x.comando === conf.comando && JSON.stringify(x.figura) === JSON.stringify(conf.figura))) continue;
    atual = { ...atual, itens: [...atual.itens, conf] };
    repostas.push(atual.itens.length);
    montadas.push(atual.itens.length);
  }
  if (repostas.length) diagRodadas.push({ repostas });
  const figurasFaltando = figurasQueFaltam(atual, d);
  // final: espalha o gabarito e confere de novo (avisos do que ainda precisa do professor)
  const fim = finalizarAvaliacao(atual);
  const avaliacao = { ...fim.avaliacao, itens: fim.avaliacao.itens.map(({ problemas, ...it }) => it) };
  const chave = (a) => `${a.onde}|${a.motivo}`;
  const vistos = new Set(fim.avisos.map(chave));
  const avisos = [
    // números dos itens mudam quando alguma questão sai: os avisos de correção ficam só quando nada saiu
    ...(ret.retiradas.length ? [] : corrigidos.filter((a) => !vistos.has(chave(a)) && !refeitas.has(Number(String(a.onde).replace(/\D/g, ""))))),
    ...(refeitas.size ? [{ onde: "Correção automática", motivo: `${refeitas.size} questão(ões) tinham erro de conta, gabarito ou figura e foram refeitas antes de chegar a você.`, tipo: "corrigido", trecho: "" }] : []),
    ...(montadas.length ? [{ onde: "Questões do sistema", motivo: `${montadas.length} questão(ões) foram montadas pelo próprio EduGera (figura, conta e alternativas calculadas), no lugar de questões da IA que não passaram na conferência.`, tipo: "corrigido", trecho: "" }] : []),
    ...(ret.retiradas.length && atual.itens.length >= d.itens ? [{ onde: "Questões substituídas", motivo: `${ret.retiradas.length} questão(ões) não passaram na conferência e foram trocadas por questões novas, conferidas do mesmo jeito.`, tipo: "corrigido", trecho: "" }] : []),
    ...(atual.itens.length < d.itens ? [{ onde: "Questões retiradas", motivo: `Não foi possível completar ${d.itens} questões conferidas a tempo; a prova ficou com ${atual.itens.length}. Gere de novo se precisar de mais.`, tipo: "conferir", trecho: "" }] : []),
    ...(figurasFaltando ? [{ onde: "Figuras", motivo: `faltaram ${figurasFaltando} questão(ões) com figura para cumprir a cota pedida.`, tipo: "conferir", trecho: "" }] : []),
    ...fim.avisos,
  ];
  if (avaliacao.itens.length < Math.min(3, d.itens)) {
    await devolverGeracao(usuario.email, requestId);
    console.error("Avaliação: questões retiradas demais", { request_id: requestId, retiradas: ret.retiradas });
    return NextResponse.json(
      { error: "Não foi possível montar uma avaliação com questões conferidas. Tente gerar de novo.", ...(uso.admin ? { diagnostico: { modelo, retiradas: ret.retiradas, primeira: primeira.avisos, rodadas: diagRodadas } } : {}) },
      { status: 502 }
    );
  }
  avaliacao.geradaEm = new Date().toISOString();
  return NextResponse.json({ avaliacao, avisos, uso: { usados: uso.usados, limite: uso.limite, restantes: uso.restantes }, ...(uso.admin ? { diagnostico: { modelo, retiradas: ret.retiradas, rodadas: diagRodadas } } : {}) });
}

export const POST = comRequestId("/api/gerar-avaliacao", postRota);
