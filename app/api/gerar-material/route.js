import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

// Mapeia o estilo escolhido no formulário para uma direção visual rica
const ESTILOS = {
  "3D Pixar/Disney":
    "estilo 3D render no estilo Pixar/Disney, personagens fofos, iluminação suave, cores vibrantes, alta qualidade",
  Isométrico:
    "ilustração isométrica limpa, perspectiva 3D em ângulo, cores planas e modernas, estilo infográfico educacional",
  "Vetor Ilustrado":
    "ilustração vetorial flat design, traços limpos, paleta amigável, estilo de material didático moderno",
  Realista:
    "ilustração realista detalhada, iluminação natural, fotorrealismo educacional, alta definição",
};

export async function POST(request) {
  try {
    const { tema, estilo, disciplina } = await request.json();

    if (!tema?.trim()) {
      return NextResponse.json(
        { error: "O tema é obrigatório para gerar a imagem." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Chave da OpenAI não configurada no servidor." },
        { status: 500 }
      );
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "Storage de imagens (Vercel Blob) não configurado." },
        { status: 500 }
      );
    }

    const direcaoVisual =
      ESTILOS[estilo] || "ilustração educacional colorida e amigável";

    const prompt = `Ilustração educacional sobre o tema "${tema}"${
      disciplina ? ` da disciplina de ${disciplina}` : ""
    }, voltada para material didático escolar brasileiro. ${direcaoVisual}. Sem texto, sem letras e sem números na imagem. Composição central, fundo limpo.`;

    // 1) Gera a imagem no DALL-E 3
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
        }),
      }
    );

    if (!openaiResponse.ok) {
      const detalhe = await openaiResponse.text();
      console.error("Erro OpenAI (imagem):", detalhe);
      return NextResponse.json(
        { error: "Falha ao gerar a imagem na OpenAI." },
        { status: 502 }
      );
    }

    const data = await openaiResponse.json();
    const urlTemporaria = data.data?.[0]?.url ?? null;

    if (!urlTemporaria) {
      return NextResponse.json(
        { error: "A OpenAI não retornou nenhuma imagem." },
        { status: 502 }
      );
    }

    // 2) Baixa os bytes da URL temporária da OpenAI (expira em ~1h)
    const imagemResp = await fetch(urlTemporaria);
    if (!imagemResp.ok) {
      return NextResponse.json(
        { error: "Não foi possível baixar a imagem gerada." },
        { status: 502 }
      );
    }
    const imagemBuffer = Buffer.from(await imagemResp.arrayBuffer());

    // 3) Sobe para o Vercel Blob → URL permanente e com CORS liberado
    const slug = tema
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const nomeArquivo = `apostilas/${slug || "ilustracao"}-${Date.now()}.png`;

    const blob = await put(nomeArquivo, imagemBuffer, {
      access: "public",
      contentType: "image/png",
    });

    // 4) Retorna a URL permanente do nosso próprio storage
    return NextResponse.json({ urlImagem: blob.url });
  } catch (error) {
    console.error("Erro na rota gerar-imagem:", error);
    return NextResponse.json(
      { error: "Erro interno ao gerar a imagem." },
      { status: 500 }
    );
  }
}