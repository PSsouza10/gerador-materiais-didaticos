// Conferências da Parte B (sem acesso a rede — testáveis): JSON canônico, SHA-256,
// inventário das listas e comparação Blob × banco. Só números e ids, nunca e-mail.
import { createHash } from "crypto";

export const sha256 = (dados) => createHash("sha256").update(dados).digest("hex");

// JSON canônico: chaves em ordem alfabética (o Postgres reordena campos do JSONB)
export function canonico(v) {
  if (Array.isArray(v)) return `[${v.map(canonico).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v)
      .sort()
      .filter((k) => v[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonico(v[k])}`)
      .join(",")}}`;
  return JSON.stringify(v);
}
export const hashConteudo = (obj) => sha256(canonico(obj));

// historicos: [{ itens, removidos }]; materiais: Set de ids com arquivo; lapides: Set de ids revogados no Blob
export function inventariar({ historicos = [], materiais = new Set(), lapides = new Set() }) {
  const vistos = new Map();
  let itens = 0, ativos = 0, revogados = 0, removidos = 0, quebrados = 0;
  for (const h of historicos) {
    for (const m of h?.itens || []) {
      if (!m?.id) continue;
      itens++;
      vistos.set(m.id, (vistos.get(m.id) || 0) + 1);
      const revogado = m.revogado === true || lapides.has(m.id);
      if (revogado) revogados++;
      else if (m.chave) ativos++;
      if (!revogado && !materiais.has(m.id)) quebrados++;
    }
    removidos += (h?.removidos || []).length;
  }
  const naListas = new Set(vistos.keys());
  return {
    listas: historicos.length,
    itens,
    ativos,
    revogados,
    removidos,
    quebrados,
    materiais: materiais.size,
    orfaos: [...materiais].filter((id) => !naListas.has(id)).length,
    emMaisDeUmaLista: [...vistos.values()].filter((n) => n > 1).length,
    lapides: lapides.size,
  };
}

// Compara a lista do Blob com as linhas do banco de UMA conta
// blob: { itens, removidos }; conteudos: Map id → {registro, meu}; banco: linhas de materiaisDaConta
export function compararConta({ blob = {}, conteudos = new Map(), banco = [] }) {
  const doBlob = (blob.itens || []).filter((m) => m?.id);
  const visiveis = banco.filter((l) => !l.removido);
  const idsBlob = new Set(doBlob.map((m) => m.id));
  const idsBanco = new Set(visiveis.map((l) => l.id));
  const faltandoNoBanco = [...idsBlob].filter((id) => !idsBanco.has(id));
  const sobrandoNoBanco = [...idsBanco].filter((id) => !idsBlob.has(id));
  const contagem = new Map();
  for (const l of banco) contagem.set(l.id, (contagem.get(l.id) || 0) + 1);
  const divergentes = [], semProva = [];
  let conteudosIguais = 0;
  for (const l of visiveis) {
    const c = conteudos.get(l.id);
    if (!c?.registro) continue;
    if (!c.meu) {
      semProva.push(l.id);
      continue;
    }
    const { chaveHash, ...conteudoBlob } = c.registro;
    const doBanco = typeof l.conteudo === "string" ? JSON.parse(l.conteudo) : l.conteudo;
    if (doBanco && hashConteudo(doBanco) === hashConteudo(conteudoBlob)) conteudosIguais++;
    else divergentes.push(l.id);
  }
  const ativoBlob = doBlob.filter((m) => m.chave && !m.revogado).length;
  const ativoBanco = visiveis.filter((l) => l.tem_chave && !l.revogado).length;
  return {
    itensBlob: doBlob.length,
    itensBanco: visiveis.length,
    idsIguais: faltandoNoBanco.length === 0 && sobrandoNoBanco.length === 0,
    faltandoNoBanco,
    sobrandoNoBanco,
    ativosBlob: ativoBlob,
    ativosBanco: ativoBanco,
    revogadosBlob: doBlob.filter((m) => m.revogado).length,
    revogadosBanco: visiveis.filter((l) => l.revogado).length,
    duplicados: [...contagem.values()].filter((n) => n > 1).length,
    conteudosIguais,
    divergentes,
    semProva,
  };
}
