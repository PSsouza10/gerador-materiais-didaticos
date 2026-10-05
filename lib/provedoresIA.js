// Chamadas de IA que devolvem JSON, por provedor (só no servidor).
//   OpenAI: OPENAI_API_KEY (+ OPENAI_BASE_URL opcional)
//   Gemini: GEMINI_API_KEY (+ MODELO_GEMINI, padrão gemini-3.5-flash)
// Cada função devolve { ok, json, status, erro } e nunca lança erro.

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

export const temGemini = () => !!process.env.GEMINI_API_KEY;
export const temOpenAI = () => !!process.env.OPENAI_API_KEY;

function lerJson(texto = "") {
  // alguns modelos devolvem ```json ... ``` mesmo pedindo JSON puro
  const limpo = String(texto).replace(/^\s*```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(limpo || "{}");
}

export async function openaiJson({ sistema, prompt, modelo = "gpt-4o", temperatura = 0.2 }) {
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

async function pedirGemini({ metodo, sistema, prompt, modelo, temperatura, signal }) {
  let r;
  let pensarPouco = true;
  for (let tentativa = 0; ; tentativa++) {
    r = await fetch(urlGemini(modelo, metodo), {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: corpoGemini({ sistema, prompt, temperatura, pensarPouco }),
    });
    if (r.status === 400 && pensarPouco) {
      const t = await r.text();
      if (/thinking/i.test(t)) {
        pensarPouco = false;
        continue;
      }
      return { r: new Response(t, { status: 400 }) };
    }
    if ((r.status !== 429 && r.status !== 503) || tentativa >= 2) break;
    await r.body?.cancel?.();
    await espera(5000 * (tentativa + 1));
  }
  return { r };
}

export async function geminiJson({ sistema, prompt, modelo = MODELO_GEMINI(), temperatura = 0.2 }) {
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

export async function geminiStream({ sistema, prompt, modelo = MODELO_GEMINI(), temperatura = 0.7, signal }) {
  if (!temGemini()) return { ok: false, status: 500, erro: "GEMINI_API_KEY ausente" };
  const { r } = await pedirGemini({ metodo: "streamGenerateContent?alt=sse", sistema, prompt, modelo, temperatura, signal });
  if (!r.ok) return { ok: false, status: r.status, erro: (await r.text()).slice(0, 400) };
  // partes com "thought" são o raciocínio interno do modelo, não a resposta
  return { ok: true, partes: lerSSE(r.body, (d) => (d.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("")) };
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
}

// Limpa ```json ... ``` em volta do JSON (alguns modelos mandam mesmo pedindo JSON puro)
export const textoParaJson = (t) => lerJson(t);
