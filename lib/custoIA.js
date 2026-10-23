// Custo de IA por pedido: cada chamada à OpenAI ou ao Gemini anota os tokens usados e o
// custo estimado em dólar, ligado ao request_id da rota (comRequestId). Serve para saber o
// custo médio de uma geração e de uma correção antes de dar preço para escola ou rede.
// Não grava conta, e-mail, texto do material nem dado de aluno: só rota, modelo e números.
import { AsyncLocalStorage } from "node:async_hooks";
import { bancoLigado, consultar } from "./banco.js";

const als = new AsyncLocalStorage();

// US$ por 1 milhão de tokens [entrada, saída]. Preço do plano pago (Gemini: ai.google.dev/pricing,
// consultado em 22/10/2026; OpenAI: tabela pública). PRECOS_IA na Vercel (JSON no mesmo formato)
// substitui ou acrescenta modelos sem mexer no código. O modelo casa pelo começo do nome.
export const PRECOS_PADRAO = {
  "gemini-3.1-flash-lite": [0.25, 1.5],
  "gemini-3.5-flash-lite": [0.3, 2.5],
  "gemini-3.8-flash": [0.75, 3.75],
  "gemini-3.6-flash": [0.75, 3.75],
  "gpt-4o-mini": [0.15, 0.6],
  "gpt-4o": [2.5, 10],
  "o4-mini": [1.1, 4.4],
};

// Ilustração (gpt-image): custo por imagem 1024×1024, conforme a qualidade
export const PRECO_IMAGEM = { low: 0.006, medium: 0.05, high: 0.21 };

export function tabelaDePrecos(env = process.env) {
  let extra = {};
  try {
    extra = env.PRECOS_IA ? JSON.parse(env.PRECOS_IA) : {};
  } catch {
    extra = {};
  }
  return { ...PRECOS_PADRAO, ...extra };
}

export function precoDoModelo(modelo = "", tabela = tabelaDePrecos()) {
  const nome = String(modelo).toLowerCase();
  const chave = Object.keys(tabela)
    .filter((k) => nome.startsWith(k.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0];
  return chave ? tabela[chave] : null;
}

export function custoUsd({ modelo, entrada = 0, saida = 0 }, tabela) {
  const p = precoDoModelo(modelo, tabela);
  if (!p) return null; // modelo sem preço conhecido: fica registrado, sem custo
  return (entrada * p[0] + saida * p[1]) / 1e6;
}

// Tokens de cada resposta, no formato de cada provedor
export const usoOpenAI = (dados) =>
  dados?.usage ? { entrada: dados.usage.prompt_tokens || 0, saida: dados.usage.completion_tokens || 0 } : null;

// Gemini: o "pensamento" é cobrado como saída
export const usoGemini = (dados) => {
  const u = dados?.usageMetadata;
  if (!u) return null;
  return { entrada: u.promptTokenCount || 0, saida: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0) };
};

// Abre a medição de um pedido (chamado por comRequestId)
export const comMedicao = (contexto, fn) => als.run({ ...contexto }, fn);
export const medicaoAtual = () => als.getStore() || null;

// Anota uma chamada. `medicao` permite anotar fora do contexto (fim de um stream).
// Nunca lança erro: medir custo não pode derrubar a geração do professor.
export async function anotarUso({ provedor, modelo, entrada = 0, saida = 0, imagens = 0, custo = null }, medicao = medicaoAtual()) {
  if (!medicao?.request_id || !bancoLigado()) return;
  const valor = custo ?? custoUsd({ modelo, entrada, saida });
  try {
    await consultar(
      "INSERT INTO custos_ia (request_id, rota, provedor, modelo, tokens_entrada, tokens_saida, imagens, custo_usd) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [medicao.request_id, medicao.rota || "", provedor || "", modelo || "", entrada, saida, imagens, valor]
    );
  } catch (e) {
    console.error("custo de IA não registrado:", String(e?.message || e).slice(0, 120));
  }
}

// Custo médio POR PEDIDO, por rota (um pedido pode fazer várias chamadas: gerar, conferir, refazer)
export async function resumoDeCustos(dias = 30) {
  return consultar(
    `SELECT rota,
            count(*)::int AS pedidos,
            avg(chamadas)::float AS chamadas_media,
            avg(entrada)::float AS entrada_media,
            avg(saida)::float AS saida_media,
            avg(custo)::float AS custo_medio,
            percentile_cont(0.9) WITHIN GROUP (ORDER BY custo)::float AS custo_p90,
            sum(custo)::float AS custo_total,
            bool_or(sem_preco) AS tem_modelo_sem_preco
       FROM (SELECT request_id, rota, count(*) AS chamadas, sum(tokens_entrada) AS entrada, sum(tokens_saida) AS saida,
                    coalesce(sum(custo_usd), 0) AS custo, bool_or(custo_usd IS NULL) AS sem_preco
               FROM custos_ia
              WHERE criado_em > now() - make_interval(days => $1)
              GROUP BY request_id, rota) p
      GROUP BY rota
      ORDER BY rota`,
    [dias]
  );
}
