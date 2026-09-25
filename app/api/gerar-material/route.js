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
      "Você é um especialista em produção de material didático alinhado à BNCC brasileira. Responda sempre em português do Brasil e com rigor pedagógico. Retorne APENAS JSON válido, sem markdown, sem comentários.";

    // Schema enriquecido (conceitos, fórmulas, dicas e exemplos em listas,
    // em vez de um único item cada) — mesma profundidade de conteúdo do
    // protótipo "Criador Visual BNCC", pra apostila ficar mais completa,
    // com mais material por tema e sem pular etapas.
    const userPrompt = `Gere o conteúdo de uma apostila visual com base nestes parâmetros:

- Professor: ${professor || "não informado"}
- Código BNCC: ${bncc || "não informado"}
- Disciplina: ${disciplina}
- Nível de Ensino: ${nivel}
- Tema Principal: ${tema}
- Orientações do professor: ${conteudo || "nenhuma"}

Retorne um JSON com esta estrutura EXATA:
{
  "tituloDidatico": "título chamativo, curto e impactante, máx 6 palavras",
  "resumoPedagogico": "2-3 frases introdutórias sobre o tema, alinhadas à habilidade da BNCC e adequadas ao nível de ensino",
  "conceitos": [
    { "termo": "nome do conceito", "definicao": "definição clara em 1 frase" }
  ],
  "formulas": [
    { "nome": "nome da fórmula ou regra", "expressao": "expressão/notação", "descricao": "para que serve em 1 frase curta" }
  ],
  "dicas": ["dica prática de resolução ou memorização", "..."],
  "lembreteImportante": "um lembrete conceitual importante, máximo 2 frases",
  "aplicacaoPratica": {
    "titulo": "título curto da aplicação no cotidiano",
    "situacao": "situação real do dia a dia relacionada ao tema (2-3 frases)",
    "exemplos": ["exemplo prático curto", "..."]
  }
}

Regras:
- Entre 4 e 6 conceitos.
- Entre 2 e 4 fórmulas (se a disciplina não usa fórmulas, use "regras" ou "princípios" com notação simbólica ou palavras-chave).
- Entre 3 e 5 dicas.
- Entre 2 e 4 exemplos práticos.
- Conteúdo tecnicamente correto e adequado ao nível ${nivel}.`;

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

    // Normaliza pra garantir o formato esperado pelo front mesmo se o
    // modelo devolver algum campo faltando.
    const conceitos = Array.isArray(parsed.conceitos) && parsed.conceitos.length
      ? parsed.conceitos
      : [{ termo: "—", definicao: "—" }];
    const formulas = Array.isArray(parsed.formulas) && parsed.formulas.length
      ? parsed.formulas
      : [];
    const dicas = Array.isArray(parsed.dicas) && parsed.dicas.length
      ? parsed.dicas
      : [""];
    const aplicacaoPratica = parsed.aplicacaoPratica && typeof parsed.aplicacaoPratica === "object"
      ? {
          titulo: parsed.aplicacaoPratica.titulo || "",
          situacao: parsed.aplicacaoPratica.situacao || "",
          exemplos: Array.isArray(parsed.aplicacaoPratica.exemplos)
            ? parsed.aplicacaoPratica.exemplos
            : [],
        }
      : { titulo: "", situacao: "", exemplos: [] };

    return NextResponse.json({
      tituloDidatico: parsed.tituloDidatico || tema.toUpperCase(),
      resumoPedagogico: parsed.resumoPedagogico || "",
      conceitos,
      formulas,
      dicas,
      lembreteImportante: parsed.lembreteImportante || "",
      aplicacaoPratica,
    });
  } catch (error) {
    console.error("Erro na rota gerar-material:", error);
    return NextResponse.json(
      { error: "Erro interno ao gerar o material." },
      { status: 500 }
    );
  }
}
