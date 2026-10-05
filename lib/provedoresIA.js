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

export async function geminiJson({ sistema, prompt, modelo = process.env.MODELO_GEMINI || "gemini-3.5-flash", temperatura = 0.2 }) {
  if (!temGemini()) return { ok: false, status: 500, erro: "GEMINI_API_KEY ausente" };
  let r;
  for (let tentativa = 0; ; tentativa++) {
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sistema }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: temperatura, responseMimeType: "application/json" },
        }),
      });
    } catch (e) {
      return { ok: false, status: 0, erro: String(e) };
    }
    if ((r.status !== 429 && r.status !== 503) || tentativa >= 2) break;
    await espera(5000 * (tentativa + 1));
  }
  if (!r.ok) return { ok: false, status: r.status, erro: (await r.text()).slice(0, 300) };
  try {
    const dados = await r.json();
    const texto = (dados.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
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
