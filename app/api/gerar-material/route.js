import { NextResponse } from "next/server";
import bnccDados from "@/data/bncc-habilidades.json";
import { indexar, resolverCodigo, rotuloAno } from "@/lib/bncc";
import { verificarUnidades } from "@/lib/unidades";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consumirGeracao, devolverGeracao } from "@/lib/uso";
import { obterNivel } from "@/lib/niveis";
import { normalizarMaterial } from "@/lib/material";

// Task 1.1 — Vercel: limite de duração da função e sem cache.
// No plano Hobby o teto é 60 s; o streaming entrega o primeiro byte na hora,
// então a requisição não "morre" esperando a resposta completa do modelo.
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Encerramos a chamada à OpenAI um pouco antes do limite da Vercel,
// para ainda conseguir avisar o front com uma mensagem clara.
const LIMITE_IA_MS = 55_000;

const BNCC = indexar(bnccDados.habilidades);

const erroJson = (mensagem, status) => NextResponse.json({ error: mensagem }, { status });

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return erroJson("Requisição inválida.", 400);
  }

  const { professor, bncc, habilidade, disciplina, nivel, ano, tema, conteudo, dificuldade } = body;

  if (!disciplina || !nivel || !tema?.trim()) {
    return erroJson("Disciplina, Nível de Ensino e Tema Principal são obrigatórios.", 400);
  }
  if (!process.env.OPENAI_API_KEY) {
    return erroJson("Chave da OpenAI não configurada no servidor.", 500);
  }

  // Login obrigatório + limite mensal: protege o crédito da OpenAI
  if (!authConfigurado) return erroJson("O login ainda não foi configurado neste site. A geração está desativada.", 503);
  const usuario = await usuarioAtual();
  if (!usuario) return erroJson("Entre com sua conta para gerar materiais.", 401);
  let uso;
  try {
    uso = await consumirGeracao(usuario.email);
  } catch (e) {
    console.error("Erro ao registrar uso:", e);
    return erroJson("Não foi possível verificar seu limite agora. Tente de novo.", 503);
  }
  if (!uso.ok) {
    return NextResponse.json(
      { error: `Você usou as ${uso.limite} gerações grátis deste mês. O limite renova no dia 1º.`, uso },
      { status: 429 }
    );
  }
  const devolver = () => devolverGeracao(usuario.email);

  // Task 3.1 — o texto oficial da habilidade vem da base, não do navegador.
  const oficial = bncc ? resolverCodigo(BNCC, bncc) : null;
  const linhaBncc = oficial
    ? `${oficial.c} — "${oficial.t}" (texto oficial da BNCC; componente: ${oficial.d})`
    : bncc
    ? `${bncc}${habilidade ? ` — ${habilidade}` : ""} (habilidade informada pelo docente, não localizada na BNCC nacional)`
    : "não informado";

  // Task 3.2 — nível de dificuldade / adaptação
  const nivelDif = obterNivel(dificuldade);

  const systemPrompt =
    "Você é um especialista em produção de material didático alinhado à BNCC brasileira. Responda sempre em português do Brasil e com rigor pedagógico. Retorne APENAS JSON válido, sem markdown, sem comentários.";

  const userPrompt = `Gere o conteúdo de uma apostila visual com base nestes parâmetros:

- Professor: ${professor || "não informado"}
- Habilidade BNCC: ${linhaBncc}
- Disciplina: ${disciplina}
- Nível de Ensino: ${nivel}${typeof ano === "string" && ano ? `\n- Ano/Série: ${rotuloAno(ano)}` : ""}
- Tema Principal: ${tema}
- Orientações do professor: ${conteudo || "nenhuma"}

${nivelDif.prompt}

Retorne um JSON com esta estrutura EXATA:
{
  "tituloDidatico": "título chamativo, curto e impactante, máx 6 palavras",
  "resumoPedagogico": "2-3 frases introdutórias sobre o tema, alinhadas à habilidade da BNCC e adequadas ao nível",
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
  },
  "exercicios": [
    { "enunciado": "enunciado completo da questão", "alternativas": ["a) ...", "b) ...", "c) ...", "d) ..."], "resposta": "resposta correta com breve justificativa" }
  ]
}

Regras:
- Entre 4 e 6 conceitos.
- Entre 2 e 4 fórmulas (se a disciplina não usa fórmulas, use "regras" ou "princípios" com notação simbólica ou palavras-chave).
- Entre 3 e 5 dicas.
- Entre 2 e 4 exemplos práticos.
- Entre 4 e 6 exercícios; misture questões abertas ("alternativas": []) e de múltipla escolha.
- Fórmulas: apresente primeiro a forma GERAL e depois os casos particulares, dizendo quando se aplicam (ex.: volume do bloco retangular V = c × l × h; cubo V = a³ é um caso particular). Nunca apresente um caso particular como regra geral.
- Múltipla escolha: exatamente uma alternativa correta; distratores plausíveis, baseados em erros comuns dos alunos (ex.: esquecer de converter unidades), sem "todas/nenhuma das anteriores".
- Antes de responder, RESOLVA cada exercício e confira o resultado; a "resposta" deve trazer a alternativa correta e o cálculo/justificativa curta.
- Números e contextos adequados à faixa etária; unidades sempre explícitas.
- Consistência de unidades: comprimento em cm/m (1 dimensão), área em cm²/m² (2 dimensões), volume em cm³/dm³/m³ ou litros (3 dimensões). Nunca chame área de algo medido em unidade cúbica, nem volume de algo em unidade quadrada; revise isso nas respostas e no gabarito.
- Conteúdo tecnicamente correto e adequado ao nível ${nivel}${oficial ? ` e à habilidade ${oficial.c}` : ""}.`;

  // Aborta se passar do limite OU se o professor fechar a página
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("timeout")), LIMITE_IA_MS);
  request.signal?.addEventListener?.("abort", () => controller.abort(new Error("cliente")));

  let openaiResponse;
  try {
    openaiResponse = await fetch(`${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.7,
        stream: true,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
  } catch (e) {
    clearTimeout(timer);
    await devolver();
    const timeout = controller.signal.aborted;
    console.error("Erro de conexão com a OpenAI:", e);
    return erroJson(
      timeout
        ? "A IA demorou demais para começar a responder. Tente novamente em instantes."
        : "Não foi possível conectar ao serviço de IA.",
      timeout ? 504 : 502
    );
  }

  if (!openaiResponse.ok) {
    clearTimeout(timer);
    await devolver();
    const detalhe = await openaiResponse.text();
    console.error("Erro OpenAI (texto):", openaiResponse.status, detalhe);
    const msg =
      openaiResponse.status === 429
        ? "Limite de uso da IA atingido no momento. Aguarde um pouco e tente novamente."
        : "Falha ao gerar conteúdo na OpenAI.";
    return erroJson(msg, 502);
  }

  // Stream SSE para o navegador: progresso enquanto o modelo escreve,
  // material normalizado no final, ou um evento de erro legível.
  const encoder = new TextEncoder();
  const enviar = (ctrl, evento) => ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(evento)}\n\n`));

  const stream = new ReadableStream({
    async start(ctrl) {
      enviar(ctrl, { tipo: "progresso", caracteres: 0 });
      const reader = openaiResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acumulado = "";
      let ultimoEnvio = 0;

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const linhas = buffer.split("\n");
          buffer = linhas.pop();
          for (const l of linhas) {
            if (!l.startsWith("data:")) continue;
            const dado = l.slice(5).trim();
            if (dado === "[DONE]") continue;
            try {
              acumulado += JSON.parse(dado).choices?.[0]?.delta?.content ?? "";
            } catch {
              /* linha parcial — ignorada */
            }
          }
          if (acumulado.length - ultimoEnvio > 150) {
            ultimoEnvio = acumulado.length;
            enviar(ctrl, { tipo: "progresso", caracteres: acumulado.length });
          }
        }

        let parsed;
        try {
          parsed = JSON.parse(acumulado);
        } catch {
          throw new Error("json");
        }
        const material = normalizarMaterial(parsed, tema);
        material.bncc = oficial
          ? { codigo: oficial.c, texto: oficial.t, verificada: true }
          : bncc
          ? { codigo: bncc, texto: habilidade || "", verificada: false }
          : null;
        material.dificuldade = nivelDif.id;
        material.alertas = verificarUnidades(material);
        enviar(ctrl, { tipo: "concluido", material, uso: { usados: uso.usados, limite: uso.limite, restantes: uso.restantes } });
      } catch (e) {
        const motivo = controller.signal.aborted
          ? "A geração passou do tempo limite do servidor (60 s). Tente um tema mais específico ou gere novamente."
          : e.message === "json"
          ? "A IA devolveu uma resposta incompleta. Clique em gerar novamente."
          : "A conexão com a IA foi interrompida. Tente novamente.";
        console.error("Erro no stream gerar-material:", e);
        await devolver();
        enviar(ctrl, { tipo: "erro", mensagem: motivo });
      } finally {
        clearTimeout(timer);
        ctrl.close();
      }
    },
    cancel() {
      controller.abort(new Error("cliente"));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
