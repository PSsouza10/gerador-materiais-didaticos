import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { professor, bncc, disciplina, nivel, tema, conteudo } =
      await request.json();

    // Validação dos campos obrigatórios
    if (!disciplina || !nivel || !tema?.trim()) {
      return NextResponse.json(
        { error: "Disciplina, Nível de Ensino e Tema Principal são obrigatórios." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Chave da OpenAI não configurada no servidor." },
        { status: 500 }
      );
    }

    const systemPrompt =
      "Você é um especialista em produção de material didático alinhado à BNCC brasileira. Responda sempre em português do Brasil e com rigor pedagógico.";

    const userPrompt = `Gere o conteúdo de uma apostila visual com base nestes parâmetros:

- Professor: ${professor || "não informado"}
- Código BNCC: ${bncc || "não informado"}
- Disciplina: ${disciplina}
- Nível de Ensino: ${nivel}
- Tema Principal: ${tema}
- Orientações do professor: ${conteudo || "nenhuma"}

Retorne um JSON com exatamente estas chaves:
- "tituloDidatico": título chamativo em caixa alta, curto e impactante (string)
- "resumoPedagogico": 2 a 3 frases introdutórias sobre o tema, alinhadas à habilidade da BNCC e adequadas ao nível de ensino (string)
- "dicaResolucao": uma dica prática de resolução, máximo 2 frases (string)
- "lembreteImportante": um lembrete conceitual importante, máximo 2 frases (string)
- "aplicacaoPratica": um problema contextualizado do cotidiano relacionado ao tema (string)
- "tabelaConceitos": array de exatamente 3 pares, cada um no formato ["conceito","definição ou fórmula"]`;

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!openaiResponse.ok) {
      const detalhe = await openaiResponse.text();
      console.error("Erro OpenAI (texto):", detalhe);
      return NextResponse.json(
        { error: "Falha ao gerar conteúdo na OpenAI." },
        { status: 502 }
      );
    }

    const data = await openaiResponse.json();
    const conteudoBruto = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(conteudoBruto);

    // Normaliza a tabela para garantir o formato esperado pelo front
    const tabelaConceitos =
      Array.isArray(parsed.tabelaConceitos) && parsed.tabelaConceitos.length
        ? parsed.tabelaConceitos
        : [["—", "—"]];

    return NextResponse.json({
      tituloDidatico: parsed.tituloDidatico || tema.toUpperCase(),
      resumoPedagogico: parsed.resumoPedagogico || "",
      dicaResolucao: parsed.dicaResolucao || "",
      lembreteImportante: parsed.lembreteImportante || "",
      aplicacaoPratica: parsed.aplicacaoPratica || "",
      tabelaConceitos,
    });
  } catch (error) {
    console.error("Erro na rota gerar-material:", error);
    return NextResponse.json(
      { error: "Erro interno ao gerar o material." },
      { status: 500 }
    );
  }
}