import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consumirImagem, devolverImagem } from "@/lib/uso";
import { normalizarEstilo } from "@/lib/opcoes";
import { limparTexto, LIMITES } from "@/lib/validacao";

export const runtime = "nodejs";
// Task 1.1 — geração de imagem costuma levar 20–40 s: usa o teto do plano Hobby.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const LIMITE_IMAGEM_MS = 50_000;

// Qualidade da ilustração (custo aproximado por imagem 1024×1024 no gpt-image-2):
// low ~US$0,006 · medium ~US$0,05 · high ~US$0,21. Na folha a ilustração ocupa
// um quadro pequeno, então "medium" é o padrão. Troque com a variável
// QUALIDADE_IMAGEM na Vercel, sem mexer no código.
const QUALIDADE = ["low", "medium", "high"].includes(process.env.QUALIDADE_IMAGEM) ? process.env.QUALIDADE_IMAGEM : "medium";

// Mapeia o estilo escolhido no formulário para uma direção visual rica
const ESTILOS = {
  // Estilo descritivo, sem imitar estúdios ou personagens de terceiros
  "3D colorido":
    "ilustração 3D colorida e original, formas arredondadas e amigáveis, iluminação suave, cores vibrantes, alta qualidade",
  Isométrico:
    "ilustração isométrica limpa, perspectiva 3D em ângulo, cores planas e modernas, estilo infográfico educacional",
  "Vetor Ilustrado":
    "ilustração vetorial flat design, traços limpos, paleta amigável, estilo de material didático moderno",
  Realista:
    "ilustração realista detalhada, iluminação natural, fotorrealismo educacional, alta definição",
};

async function processar(request, ctx) {
  try {
    const body = await request.json();
    const tema = limparTexto(body.tema).slice(0, LIMITES.tema);
    const disciplina = limparTexto(body.disciplina).slice(0, 60);
    const estilo = normalizarEstilo(body.estilo);

    if (!tema) {
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

    if (!authConfigurado) {
      return NextResponse.json({ error: "Login não configurado." }, { status: 503 });
    }
    const usuario = await usuarioAtual();
    if (!usuario) return NextResponse.json({ error: "Entre com sua conta para gerar ilustrações." }, { status: 401 });
    const img = await consumirImagem(usuario.email);
    if (img?.ok) ctx.consumidoPor = usuario.email;
    if (!img?.ok) {
      return NextResponse.json({ error: "A ilustração acompanha uma geração de material; gere o material primeiro." }, { status: 429 });
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

    // 1) Gera a imagem com gpt-image-2 (upgrade do dall-e-3: modelo de
    // imagem atual da OpenAI, mesma família usada no protótipo "Criador
    // Visual BNCC"). Diferente do dall-e-3, retorna a imagem já em
    // base64 (b64_json), sem precisar buscar uma URL temporária depois.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LIMITE_IMAGEM_MS);
    let openaiResponse;
    try {
      openaiResponse = await fetch(
        `${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/images/generations`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-image-2",
            prompt,
            size: "1024x1024",
            quality: QUALIDADE,
          }),
        }
      );
    } catch (e) {
      if (controller.signal.aborted) {
        return NextResponse.json(
          { error: "A ilustração demorou demais para ser gerada (timeout). O material foi criado sem imagem; tente gerar de novo." },
          { status: 504 }
        );
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }

    if (!openaiResponse.ok) {
      const detalhe = await openaiResponse.text();
      console.error("Erro OpenAI (imagem):", detalhe);
      return NextResponse.json(
        { error: "Falha ao gerar a imagem na OpenAI." },
        { status: 502 }
      );
    }

    const data = await openaiResponse.json();
    const b64 = data.data?.[0]?.b64_json ?? null;

    if (!b64) {
      return NextResponse.json(
        { error: "A OpenAI não retornou nenhuma imagem." },
        { status: 502 }
      );
    }

    const imagemBuffer = Buffer.from(b64, "base64");

    // 2) Sobe para o Vercel Blob → URL permanente e com CORS liberado
    // (gpt-image-2 não expira como a URL temporária do dall-e-3, mas
    // mantemos o Blob pra ter uma cópia permanente e leve de servir)
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

    // 3) Retorna a URL permanente do nosso próprio storage
    return NextResponse.json({ urlImagem: blob.url });
  } catch (error) {
    console.error("Erro na rota gerar-imagem:", error);
    return NextResponse.json(
      { error: "Erro interno ao gerar a imagem." },
      { status: 500 }
    );
  }
}

// Se a ilustração falhar depois de reservada, devolve a vaga: o professor pode
// tentar de novo sem precisar gastar outra geração de material.
export async function POST(request) {
  const ctx = { consumidoPor: null };
  const res = await processar(request, ctx);
  if (res.status >= 400 && ctx.consumidoPor) await devolverImagem(ctx.consumidoPor);
  return res;
}
