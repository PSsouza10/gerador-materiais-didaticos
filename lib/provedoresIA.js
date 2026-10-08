// Chamadas de IA que devolvem JSON, por provedor (só no servidor).
//   OpenAI: OPENAI_API_KEY (+ OPENAI_BASE_URL opcional)
//   Gemini: GEMINI_API_KEY (+ MODELO_GEMINI, padrão gemini-3.5-flash)
// Cada função devolve { ok, json, status, erro } e nunca lança erro.

import { iaSimulada } from "./ambiente.js";
import { respostaSimulada } from "./iaSimulada.js";

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

// Ambiente de TESTE com IA_SIMULADA=1: nenhuma chamada real à OpenAI ou ao Gemini
async function* trechoUnico(texto) {
  yield texto;
}
const simulado = (prompt) => ({ ok: true, json: respostaSimulada(prompt), simulado: true });
const simuladoStream = (prompt) => ({ ok: true, partes: trechoUnico(JSON.stringify(respostaSimulada(prompt))), info: { simulado: true } });

export const temGemini = () => iaSimulada() || !!process.env.GEMINI_API_KEY;
export const temOpenAI = () => iaSimulada() || !!process.env.OPENAI_API_KEY;

function lerJson(texto = "") {
  // alguns modelos devolvem ```json ... ``` mesmo pedindo JSON puro
  const limpo = String(texto).replace(/^\s*```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(limpo || "{}");
}

export async function openaiJson({ sistema, prompt, modelo = "gpt-4o", temperatura = 0.2 }) {
  if (iaSimulada()) return simulado(prompt);
  if (!temOpenAI()) return { ok: false, status: 500, erro: "OPENAI_API_KEY ausente" };
  let r;
  for (let tentativa = 0; ; tentativa++) {
    try {
      r = await fetch(`${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: modelo,
          temperature: temperatura,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sistema },
            { role: "user", content: prompt },
          ],
        }),
      });
    } catch (e) {
      return { ok: false, status: 0, erro: String(e) };
    }
    if (r.status !== 429 || tentativa >= 2) break;
    const corpo = await r.text();
    // crédito esgotado: esperar não resolve, passa logo para a reserva
    if (/insufficient_quota/.test(corpo)) return { ok: false, status: 429, erro: "insufficient_quota", semCredito: true };
    await espera(5000 * (tentativa + 1));
  }
  if (!r.ok) return { ok: false, status: r.status, erro: (await r.text()).slice(0, 300) };
  try {
    const dados = await r.json();
    return { ok: true, json: lerJson(dados.choices?.[0]?.message?.content) };
  } catch (e) {
    return { ok: false, status: 502, erro: `JSON inválido: ${e}` };
  }
}

export const MODELO_GEMINI = () => process.env.MODELO_GEMINI || "gemini-3.5-flash";
const urlGemini = (modelo, metodo) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:${metodo}`;

// Corpo do pedido ao Gemini. "pensar pouco" (thinkingLevel low) deixa a resposta bem mais
// rápida; se o modelo não aceitar esse campo (400), quem chama tenta de novo sem ele.
const corpoGemini = ({ sistema, prompt, temperatura, pensarPouco }) =>
  JSON.stringify({
    systemInstruction: { parts: [{ text: sistema }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: temperatura,
      responseMimeType: "application/json",
      ...(pensarPouco ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
    },
  });

// Modelos do Gemini em ordem de preferência: quando um está lotado (503 "high demand",
// comum no plano grátis) ou no limite (429), passa logo para o próximo em vez de esperar.
// MODELOS_GEMINI na Vercel (separados por vírgula) troca a lista sem mexer no código.
export const modelosGemini = (preferido) => {
  const lista = (process.env.MODELOS_GEMINI || "gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set([preferido, ...lista].filter(Boolean))];
};

async function pedirGemini({ metodo, sistema, prompt, modelo, temperatura, signal }) {
  let r;
  for (const m of modelosGemini(modelo)) {
    let pensarPouco = true;
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      r = await fetch(urlGemini(m, metodo), {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: corpoGemini({ sistema, prompt, temperatura, pensarPouco }),
      });
      // modelo que não aceita "thinkingLevel": tenta de novo sem o campo
      if (r.status === 400 && pensarPouco) {
        const t = await r.text();
        if (/thinking/i.test(t)) {
          pensarPouco = false;
          continue;
        }
        return { r: new Response(t, { status: 400 }), modelo: m };
      }
      break;
    }
    if (r.ok) return { r, modelo: m };
    // lotado, no limite ou modelo inexistente: próximo da lista
    if ([429, 503, 404, 500].includes(r.status)) {
      console.error(`Gemini ${m} indisponível (${r.status}); tentando o próximo modelo.`);
      await r.body?.cancel?.();
      continue;
    }
    return { r, modelo: m };
  }
  // todos falharam: devolve a última resposta (já lida) como erro
  return { r: new Response(JSON.stringify({ error: { code: r?.status, message: "todos os modelos Gemini indisponíveis" } }), { status: r?.status || 503 }) };
}

export async function geminiJson({ sistema, prompt, modelo = MODELO_GEMINI(), temperatura = 0.2 }) {
  if (iaSimulada()) return simulado(prompt);
  if (!temGemini()) return { ok: false, status: 500, erro: "GEMINI_API_KEY ausente" };
  let r;
  try {
    ({ r } = await pedirGemini({ metodo: "generateContent", sistema, prompt, modelo, temperatura }));
  } catch (e) {
    return { ok: false, status: 0, erro: String(e) };
  }
  if (!r.ok) return { ok: false, status: r.status, erro: (await r.text()).slice(0, 300) };
  try {
    const dados = await r.json();
    const texto = (dados.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("");
    return { ok: true, json: lerJson(texto) };
  } catch (e) {
    return { ok: false, status: 502, erro: `JSON inválido: ${e}` };
  }
}

// Qual provedor revisa por padrão: REVISOR_PROVEDOR=gemini|openai na Vercel.
// Sem a variável, fica a OpenAI (o Gemini entra depois de comparado na bateria).
export function provedorRevisorPadrao() {
  const p = process.env.REVISOR_PROVEDOR;
  if (p === "gemini" && temGemini()) return "gemini";
  if (p === "openai" && temOpenAI()) return "openai";
  return temOpenAI() ? "openai" : temGemini() ? "gemini" : null;
}

// Texto em partes (stream), para a geração da apostila mostrar o progresso.
// Devolve { ok, status, erro, partes } — "partes" é um iterador assíncrono de trechos de texto.
export async function openaiStream({ sistema, prompt, modelo = "gpt-4o", temperatura = 0.7, signal }) {
  if (iaSimulada()) return simuladoStream(prompt);
  if (!temOpenAI()) return { ok: false, status: 500, erro: "OPENAI_API_KEY ausente" };
  let r;
  for (let tentativa = 0; ; tentativa++) {
    r = await fetch(`${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/chat/completions`, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: modelo,
        temperature: temperatura,
        stream: true,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sistema },
          { role: "user", content: prompt },
        ],
      }),
    });
    // limite por minuto (429): espera o tempo indicado e tenta de novo; cota esgotada não adianta esperar
    if (r.status !== 429 || tentativa >= 2) break;
    const corpo = await r.text();
    if (/insufficient_quota/.test(corpo)) return { ok: false, status: 429, erro: "insufficient_quota", semCredito: true };
    const s = Math.min(12, Math.max(2, parseFloat(r.headers.get("retry-after") || "") || 6 * (tentativa + 1)));
    await espera(s * 1000);
  }
  if (!r.ok) {
    const erro = (await r.text()).slice(0, 400);
    return { ok: false, status: r.status, erro, semCredito: /insufficient_quota/.test(erro) };
  }
  return { ok: true, partes: lerSSE(r.body, (d) => d.choices?.[0]?.delta?.content ?? "") };
}

// Gemini: o stream (streamGenerateContent) terminava antes da hora na Vercel (05/10:
// parava com ~20 caracteres, sem finishReason). Aqui o texto vem inteiro de uma vez
// (generateContent) e é entregue como um único trecho — mesmo formato do stream da OpenAI.
export async function geminiStream({ sistema, prompt, modelo = MODELO_GEMINI(), temperatura = 0.7, signal }) {
  if (iaSimulada()) return simuladoStream(prompt);
  if (!temGemini()) return { ok: false, status: 500, erro: "GEMINI_API_KEY ausente" };
  const { r } = await pedirGemini({ metodo: "generateContent", sistema, prompt, modelo, temperatura, signal });
  if (!r.ok) return { ok: false, status: r.status, erro: (await r.text()).slice(0, 400) };
  const dados = await r.json();
  const c = dados.candidates?.[0];
  const info = { finishReason: c?.finishReason || null, bloqueio: dados.promptFeedback?.blockReason || null };
  const texto = (c?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("");
  if (!texto) return { ok: false, status: 502, erro: `Gemini sem texto (${info.finishReason || info.bloqueio || "?"})`, info };
  async function* umTrecho() {
    yield texto;
  }
  return { ok: true, partes: umTrecho(), info };
}

async function* lerSSE(corpo, extrair) {
  const reader = corpo.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const linhas = buffer.split("\n");
    buffer = linhas.pop();
    for (const l of linhas) {
      if (!l.startsWith("data:")) continue;
      const dado = l.slice(5).trim();
      if (!dado || dado === "[DONE]") continue;
      try {
        const t = extrair(JSON.parse(dado));
        if (t) yield t;
      } catch {
        /* linha parcial — ignorada */
      }
    }
  }
  // último evento sem quebra de linha no fim
  const resto = buffer.trim();
  if (resto.startsWith("data:")) {
    try {
      const t = extrair(JSON.parse(resto.slice(5).trim()));
      if (t) yield t;
    } catch {
      /* ignora */
    }
  }
}

// Limpa ```json ... ``` em volta do JSON (alguns modelos mandam mesmo pedindo JSON puro)
export const textoParaJson = (t) => lerJson(t);
