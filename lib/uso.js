import { caminhoBlob } from "@/lib/ambiente";
import { createHmac } from "crypto";
import { SEGREDO } from "@/lib/segredo";
import { head, put } from "@vercel/blob";
import { bancoLigado } from "@/lib/banco";
import * as Banco from "@/lib/contas";
import { esperar } from "@/lib/tentativas";
import { lerJsonEstrito } from "@/lib/leituraBlob";
import { PLANOS, PLANO_ADMIN, obterPlano, teto, mensagemLimite, contagensDoArquivo, resumoDoUso, motivoBloqueio } from "@/lib/planos";
import { simulacaoAssinatura } from "@/lib/ambiente";

// Com banco ligado (site de teste na Fase 1), o uso vira eventos no banco (lib/contas.js);
// sem banco, segue o arquivo no Blob como sempre.
const importar = async (email) => (await import("@/lib/importacao")).garantirImportacao(email);
// campo do arquivo no Blob → tipo no banco → limite do plano (lib/planos.js)
const TIPO_DO_CAMPO = { geracoes: "geracao", correcoes: "correcao", revisoes: "revisao", imagens: "imagem" };
const LIMITE_DO_CAMPO = { correcoes: "correcoesMes", revisoes: "revisoesMes" };
// Dupla gravação (Parte B): com banco ligado, cada uso também vai para o arquivo do Blob,
// para que desligar o banco (rollback) não perca nada. Nunca derruba a rota.
async function espelharBlob(email, campo, acao = "acrescentar") {
  try {
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      if (tentativa) await esperar(250 * 2 ** (tentativa - 1));
      const { dados, etag } = await ler(email);
      const lista = [...(dados[campo] || [])];
      if (acao === "acrescentar") lista.push(new Date().toISOString());
      else lista.pop();
      try {
        await put(caminho(email), JSON.stringify({ ...dados, [campo]: lista.slice(-301) }), {
          access: "public",
          contentType: "application/json",
          addRandomSuffix: false,
          allowOverwrite: true,
          cacheControlMaxAge: 60,
          ...(etag ? { ifMatch: etag } : {}),
        });
        return true;
      } catch {
        /* conflito: tenta de novo */
      }
    }
  } catch (e) {
    console.error(`Espelho do uso no Blob falhou (${campo}):`, e?.message || e);
  }
  return false;
}

// Controle de uso por conta. O registro NÃO guarda e-mail nem nome:
// o caminho é um HMAC do e-mail com a chave secreta do servidor (impossível
// de adivinhar sem ela) e o conteúdo tem só as datas dos usos.
// Limites: vêm do plano da conta (lib/planos.js), não de valores soltos no código.
//   ADMIN_EMAILS    — e-mails sem limite, separados por vírgula (também têm o Premium)
//   PREMIUM_EMAILS  — e-mails com o visual Premium (capa pôster 3D + páginas no mesmo estilo)
//   PRO_EMAILS      — e-mails liberados no plano Pro sem cobrança (liberação manual)

const mesAtual = () => new Date().toISOString().slice(0, 7); // "2026-09"
const naLista = (variavel, email) =>
  (process.env[variavel] || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(String(email).toLowerCase());

export const ehAdmin = (email) => naLista("ADMIN_EMAILS", email);

// Premium: visual pôster 3D. Enquanto não há cobrança, vale para quem está na lista.
export const ehPremium = (email) => ehAdmin(email) || naLista("PREMIUM_EMAILS", email);

// Plano da conta: assinatura ativa (banco) > administrador > lista PRO_EMAILS > Grátis.
// Nenhuma assinatura vem de pagamento: só simulação (site de teste) ou liberação manual.
// Assinatura "simulada" só vale fora da produção; é ela que deixa o administrador testar
// os limites de um plano no site de teste (em produção o administrador é sempre sem limite).
export async function planoDaConta(email) {
  const admin = ehAdmin(email);
  if (bancoLigado()) {
    try {
      const a = await Banco.assinaturaAtiva(email);
      const simulada = a?.origem === "simulada";
      if (a && (simulada ? simulacaoAssinatura() : !admin)) return { plano: obterPlano(a.plano), assinatura: a };
    } catch (e) {
      // tabela ainda não migrada ou banco instável: segue a regra sem assinatura (nunca libera a mais)
      console.error("Assinatura indisponível:", e?.message || e);
    }
  }
  if (admin) return { plano: PLANO_ADMIN, assinatura: null };
  if (naLista("PRO_EMAILS", email)) return { plano: PLANOS.pro_mensal, assinatura: { plano: "pro_mensal", origem: "manual", inicio: null, fim: null } };
  return { plano: PLANOS.gratis, assinatura: null };
}

export const montarResumo = (c, email, p) => resumoDoUso(c, { ...p, admin: ehAdmin(email), premium: ehPremium(email) });

const caminho = (email) =>
  caminhoBlob(
  `usuarios/${createHmac("sha256", SEGREDO || "sem-segredo").update(String(email).toLowerCase()).digest("hex").slice(0, 40)}.json`);

async function ler(email) {
  try {
    const meta = await head(caminho(email));
    // ?v= evita a cópia de até 60 s guardada na CDN do Blob (contagem desatualizada)
    const res = await fetch(`${meta.url}?v=${Date.now()}`, { cache: "no-store" });
    return { dados: await res.json(), etag: meta.etag };
  } catch {
    return { dados: { versao: 1, plano: "gratis", geracoes: [] }, etag: null };
  }
}

export const caminhoUso = (email) => caminho(email);
// Caminho SEM o prefixo teste/ (o arquivo real). Só para backup/ensaio de administrador.
export const caminhoUsoBruto = (email) =>
  `usuarios/${createHmac("sha256", SEGREDO || "sem-segredo").update(String(email).toLowerCase()).digest("hex").slice(0, 40)}.json`;
// Estrito (importação/conferência): falha de leitura vira erro, não uso zerado
export async function lerUsoBlob(email) {
  return (await lerJsonEstrito(caminho(email))) || { versao: 1, plano: "gratis", geracoes: [] };
}

export async function consultarUso(email) {
  const p = await planoDaConta(email);
  if (bancoLigado()) {
    await importar(email);
    return montarResumo(await Banco.contagens(email), email, p);
  }
  const { dados } = await ler(email);
  return montarResumo(contagensDoArquivo(dados), email, p);
}

// Últimos usos com request_id (só com banco; sem banco, lista vazia)
export async function ultimosUsos(email, n = 10) {
  if (!bancoLigado()) return [];
  try {
    return await Banco.ultimosUsos(email, n);
  } catch {
    return [];
  }
}

const comMensagem = (r, plano) => {
  const motivo = motivoBloqueio(r);
  return { ...r, motivo, mensagem: mensagemLimite(motivo, plano, motivo === "dia" ? r.hoje.limite : r.limite) };
};

// Reserva uma geração antes de chamar a IA, com o limite do MÊS e do DIA do plano.
// Escrita condicional (ETag no Blob, trava no banco) evita que duas abas passem do limite.
// requestId fica gravado junto do uso (registro e devolução exata).
export async function consumirGeracao(email, requestId = null) {
  const p = await planoDaConta(email);
  const L = p.plano.limites;
  if (bancoLigado()) {
    await importar(email);
    const { ok } = await Banco.consumir(email, "geracao", teto(L.geracoesMes), { limiteDia: teto(L.geracoesDia), requestId });
    if (ok) await espelharBlob(email, "geracoes");
    const r = montarResumo(await Banco.contagens(email), email, p);
    return ok ? { ok, ...r } : { ok, ...comMensagem(r, p.plano) };
  }
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const { dados, etag } = await ler(email);
    const r = montarResumo(contagensDoArquivo(dados), email, p);
    if (r.restantes === 0) return { ok: false, ...comMensagem(r, p.plano) };
    const novo = { ...dados, geracoes: [...(dados.geracoes || []).slice(-300), new Date().toISOString()] };
    try {
      await put(caminho(email), JSON.stringify(novo), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60,
        ...(etag ? { ifMatch: etag } : {}),
      });
      return { ok: true, ...montarResumo(contagensDoArquivo(novo), email, p) };
    } catch (e) {
      if (tentativa === 3) throw e; // conflito persistente: deixa a rota responder erro
    }
  }
}

// Correção de um exercício e revisão de conteúdo: limite mensal do plano (lib/planos.js)
export const consumirCorrecao = (email, requestId) => consumirExtra(email, "correcoes", requestId);
export const consumirRevisao = (email, requestId) => consumirExtra(email, "revisoes", requestId);

async function consumirExtra(email, campo, requestId = null) {
  const { plano } = await planoDaConta(email);
  const limite = teto(plano.limites[LIMITE_DO_CAMPO[campo]]);
  if (bancoLigado()) {
    const { ok } = await Banco.consumir(email, TIPO_DO_CAMPO[campo], limite, { requestId });
    if (ok) await espelharBlob(email, campo);
    return ok ? { ok } : { ok, limite, plano: plano.nome };
  }
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const { dados, etag } = await ler(email);
    const usadas = (dados[campo] || []).filter((g) => g.startsWith(mesAtual())).length;
    if (usadas >= limite) return { ok: false, limite, plano: plano.nome };
    const novo = { ...dados, [campo]: [...(dados[campo] || []).slice(-300), new Date().toISOString()] };
    try {
      await put(caminho(email), JSON.stringify(novo), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60,
        ...(etag ? { ifMatch: etag } : {}),
      });
      return { ok: true };
    } catch (e) {
      if (tentativa === 3) throw e;
    }
  }
}

// Ilustração: até "imagensPorGeracao" do plano por geração de texto feita no mês
export async function consumirImagem(email, requestId = null) {
  const { plano } = await planoDaConta(email);
  const fator = teto(plano.limites.imagensPorGeracao);
  if (bancoLigado()) {
    const r = await Banco.consumir(email, "imagem", Infinity, { porGeracao: fator, requestId });
    if (r.ok) await espelharBlob(email, "imagens");
    return r;
  }
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const { dados, etag } = await ler(email);
    const mes = mesAtual();
    const ger = (dados.geracoes || []).filter((g) => g.startsWith(mes)).length;
    const img = (dados.imagens || []).filter((g) => g.startsWith(mes)).length;
    // folga de 1: se a leitura ainda não enxergar a geração que acabou de ser registrada,
    // a ilustração não é recusada (antes, isso fazia o material sair sem imagem)
    if (img > ger * fator) return { ok: false };
    const novo = { ...dados, imagens: [...(dados.imagens || []).slice(-300), new Date().toISOString()] };
    try {
      await put(caminho(email), JSON.stringify(novo), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60,
        ...(etag ? { ifMatch: etag } : {}),
      });
      return { ok: true };
    } catch (e) {
      if (tentativa === 3) throw e;
    }
  }
}

// Devolve a geração se a IA falhou (o professor não perde crédito por erro nosso)
export const devolverGeracao = (email, requestId) => devolver(email, "geracoes", requestId);
// Idem para a ilustração: se ela falhar, o professor pode tentar de novo
export const devolverImagem = (email, requestId) => devolver(email, "imagens", requestId);

async function devolver(email, campo, requestId = null) {
  if (bancoLigado()) {
    try {
      await Banco.devolver(email, TIPO_DO_CAMPO[campo], requestId);
      await espelharBlob(email, campo, "devolver");
    } catch (e) {
      console.error(`Não foi possível devolver (${campo}):`, e);
    }
    return;
  }
  try {
    const { dados, etag } = await ler(email);
    const g = [...(dados[campo] || [])];
    g.pop();
    await put(caminho(email), JSON.stringify({ ...dados, [campo]: g }), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      ...(etag ? { ifMatch: etag } : {}),
    });
  } catch (e) {
    console.error(`Não foi possível devolver (${campo}):`, e);
  }
}
