import { conferirCoerencia } from "@/lib/coerencia";
import { NextResponse } from "next/server";
import bnccDados from "@/data/bncc-habilidades.json";
import { indexar, resolverCodigo, rotuloAno } from "@/lib/bncc";
import { verificarUnidades } from "@/lib/unidades";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { consumirGeracao, devolverGeracao } from "@/lib/uso";
import { obterNivel } from "@/lib/niveis";
import { normalizarMaterial } from "@/lib/material";
import { validarPedido } from "@/lib/validacao";
import { conferirGabarito } from "@/lib/gabarito";
import { revisarMaterial } from "@/lib/revisao";
import { conferirQualidade } from "@/lib/qualidade";

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

  // Validação no servidor (não confia no navegador): obrigatórios, limites, controle
  const v = validarPedido(body);
  if (!v.ok) return erroJson(v.erro, 400);
  const { bncc, habilidade, disciplina, nivel, ano, tema, conteudo, dificuldade, questoes } = v.dados;
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
  "cena": {
    "titulo": "nome curto da situação (máx. 6 palavras)",
    "lugar": "cozinha" | "mercado" | "escola" | "parque" | "casa" | "rua" | "feira" | "laboratorio" | "biblioteca" | "quadra",
    "falas": [ { "quem": "lia" | "theo" | "vo" | "edu", "texto": "fala curta" } ],
    "figura": { UMA figura dos tipos abaixo, sobre a qual os personagens conversam },
    "pergunta": "pergunta que a cena deixa para o aluno responder"
  },
  "conceitos": [
    { "termo": "nome do conceito", "definicao": "definição clara em 1 frase" }
  ],
  "formulas": [
    { "nome": "nome da fórmula ou regra", "expressao": "expressão/notação", "descricao": "para que serve em 1 frase curta" }
  ],
  "dicas": ["ponto de atenção curto e direto (máx. 1 frase), adequado à disciplina", "..."],
  "lembreteImportante": "um lembrete conceitual importante, máximo 2 frases",
  "aplicacaoPratica": {
    "titulo": "título curto da aplicação no cotidiano",
    "situacao": "situação real do dia a dia relacionada ao tema (2-3 frases)",
    "exemplos": ["exemplo prático curto", "..."]
  },
  "exercicios": [
    { "enunciado": "enunciado completo da questão", "tipo": "multipla_escolha" | "aberta" | "completar" | "verdadeiro_falso" | "associar" | "explicar", "exigencia": "lembrar" | "compreender" | "aplicar" | "analisar" | "avaliar" | "criar", "alternativas": ["a) ...", "b) ...", "c) ...", "d) ..."], "figura": null, "resolucao": "cálculo ou justificativa curta, feito ANTES de escolher a alternativa, com a conta terminando em = resultado e depois uma frase natural de conclusão ('Portanto, ...')", "resposta": "letra e texto da alternativa que contém o resultado da resolução (ou a resposta da questão aberta)" }
  ],
  "figuraExplicativa": null
}

FIGURAS (desenhadas pelo sistema a partir destes dados; use em QUALQUER disciplina quando ajudar a entender):
- { "tipo": "reta", "inicio": 0, "fim": 1, "divisoes": 4, "rotulos": "extremos" | "todos" | "nenhum", "marcar": null ou o número do tracinho (0 a divisoes) a destacar com a letra A, "legenda": "" }
- { "tipo": "fracao", "forma": "barra" | "circulo", "partes": 5, "pintadas": 1, "legenda": "" }
- { "tipo": "grade", "linhas": 3, "colunas": 4, "pintadas": 0, "legenda": "" }   (disposição retangular, área)
- { "tipo": "tabela", "cabecalho": ["...", "..."], "linhas": [["...", "..."]], "legenda": "" }   (até 6 colunas e 8 linhas)
- { "tipo": "barras", "titulo": "", "unidade": "", "itens": [{ "rotulo": "...", "valor": 10 }], "legenda": "" }   (até 8 barras)
- { "tipo": "linha_do_tempo", "eventos": [{ "data": "1500", "texto": "..." }], "legenda": "" }   (até 6 eventos)
- { "tipo": "fluxo", "etapas": ["...", "..."], "ciclo": false, "legenda": "" }   (2 a 6 etapas com setas; "ciclo": true para ciclos como o da água)
- { "tipo": "mapa", "centro": "ideia central", "ramos": ["...", "..."], "legenda": "" }   (mapa conceitual, 2 a 6 ramos)

CENA DO COTIDIANO (obrigatória em TODA disciplina — é o diferencial da apostila):
- Personagens fixos: "lia" (Lia, estudante curiosa), "theo" (Théo, estudante que às vezes se confunde), "vo" (Vó Ana, avó que usa o assunto no dia a dia), "edu" (Prof. Edu, professor que pergunta e não entrega a resposta). Use 2 ou 3 deles.
- Uma situação real do dia a dia da faixa etária (receita, compras, jogo, passeio, notícia, conta de luz, horta...), contada em 4 a 6 falas curtas (até 25 palavras cada), em linguagem natural de conversa.
- A conversa usa o conteúdo de verdade: alguém tem uma dúvida ou comete um erro comum, outro personagem questiona, e os dois olham para a "figura" da cena (ex.: "Olha a reta: entre 0 e 1 tem 4 partes iguais"). A figura é a ilustração da situação e precisa combinar com as falas.
- Não resolva tudo na cena: termine com "pergunta" para o aluno, ligada ao conteúdo.
- Pelo menos 1 exercício retoma a cena pelo nome dos personagens (ex.: "Ajude o Théo: ...").

Regras:
- Situações do cotidiano em todo o material: a "aplicacaoPratica" e pelo menos metade dos exercícios partem de um contexto real (compras, receitas, esportes, viagens, natureza, tecnologia), nunca só contas soltas.
- Apostila ENXUTA: no máximo 4 conceitos e no máximo 2 fórmulas/regras (se a disciplina não usa fórmulas, use "regras" ou "princípios" com notação simbólica ou palavras-chave).
- Exatamente 3 dicas curtas (uma frase de até 20 palavras cada), adequadas à disciplina: em Matemática podem ser de resolução; em outras áreas, de atenção, segurança ou leitura.
- Entre 2 e 3 exemplos práticos.
- Texto direto: definições de 1 frase, enunciados objetivos e nada de frases de enfeite ("vamos mergulhar", "fascinante mundo", "é muito importante destacar").
- Exatamente ${questoes} exercícios, do mais fácil ao mais difícil.
- Tipos de questão VARIADOS: use pelo menos 3 tipos diferentes entre "multipla_escolha", "aberta", "completar", "verdadeiro_falso", "associar" e "explicar" (explicar o raciocínio). Em "completar", marque as lacunas com ____ no enunciado. Em "verdadeiro_falso", liste as afirmações no enunciado, numeradas, para o aluno marcar V ou F. Em "associar", escreva as duas colunas no enunciado (1, 2, 3… e A, B, C…) usando só textos ou números; não descreva figuras ("meio círculo pintado") sem preencher "figura". Só "multipla_escolha" tem alternativas; nos outros tipos use "alternativas": [].
- Exigência: classifique cada exercício em "exigencia" e inclua ${questoes > 5 ? "pelo menos 2 questões" : "pelo menos 1 questão"} de "analisar", "avaliar" ou "criar" (ex.: encontrar o erro numa resolução, comparar estratégias, justificar uma escolha, criar um exemplo próprio). Verdadeiro ou falso, completar, associar e múltipla escolha direta NÃO são "analisar", "avaliar" nem "criar": a questão exigente tem de pedir que o aluno explique, justifique, encontre o erro, compare ou crie.
- Fórmulas: apresente primeiro a forma GERAL e depois os casos particulares, dizendo quando se aplicam (ex.: volume do bloco retangular V = c × l × h; cubo V = a³ é um caso particular). Nunca apresente um caso particular como regra geral.
- Múltipla escolha: exatamente uma alternativa correta; distratores plausíveis, baseados em erros comuns dos alunos (ex.: esquecer de converter unidades), sem "todas/nenhuma das anteriores".
- Antes de responder, RESOLVA cada exercício em "resolucao" e só então preencha "resposta": a letra marcada TEM de ser a alternativa cujo valor é igual ao resultado final da resolução. Confira letra e valor antes de terminar.
- Figuras: se um enunciado depende de algo visual (figura, parte colorida, reta numérica, tabela, gráfico, malha, linha do tempo), preencha "figura" desse exercício com UM dos tipos acima; senão use null. NUNCA cite figura, reta, tabela ou gráfico no enunciado sem preencher "figura". A figura não pode entregar a resposta: em "localize 1/3 na reta" não use "marcar" nem rótulos "todos"; use "marcar" só quando a pergunta é sobre o ponto destacado (ex.: "que fração o ponto A representa?"). "figuraExplicativa" é OBRIGATÓRIA em toda disciplina: escolha o tipo que melhor representa o conceito principal (ex.: Matemática → reta, fração, grade ou barras; História → linha do tempo; Ciências → fluxo/ciclo; Geografia → barras ou tabela; Português, Arte, Inglês e outras → mapa conceitual, tabela ou fluxo). Além dela, use figura em pelo menos 2 exercícios, sempre que a questão ficar melhor com ela.
- Regras matemáticas com as condições completas e na linguagem da faixa etária (ex.: no 4º ano, "entre frações unitárias, quanto maior o denominador, menor a fração"). Comparar frações pelo denominador SÓ vale para frações unitárias ou com o mesmo numerador; comparar pelo numerador SÓ vale com o mesmo denominador. Sempre escreva a condição junto da regra.
- Potências: escreva sempre com ^ (ex.: 3^4, 10^-3, (2^3)^2, a^(m+n)); o sistema formata como expoente.
- Notação científica: use SEMPRE a convenção N × 10^n, com 1 ≤ N < 10 e n inteiro, na teoria, nas fórmulas, nos exemplos, nos exercícios e no gabarito. Nunca escreva "N = a × 10^n" nem use outra letra para a mantissa.
- Números e contextos adequados à faixa etária; unidades sempre explícitas.
- Consistência de unidades: comprimento em cm/m (1 dimensão), área em cm²/m² (2 dimensões), volume em cm³/dm³/m³ ou litros (3 dimensões). Nunca chame área de algo medido em unidade cúbica, nem volume de algo em unidade quadrada; revise isso nas respostas e no gabarito.
- NENHUM bloco se repete: o que está em "formulas" não reaparece em "exemplos", "dicas" ou "lembreteImportante". Se não houver nada novo, deixe a lista mais curta ou o lembrete vazio.
- Todo termo de "conceitos" precisa ser usado em pelo menos uma fórmula, exemplo ou exercício. Não defina termo decorativo.
- A habilidade BNCC é da etapa do nível escolhido (EF = Ensino Fundamental, EM = Ensino Médio). Nunca adapte o conteúdo a um código de outra etapa.
- Português do Brasil revisado: confira a grafia de títulos e enunciados (ex.: "Exemplos", "Explique") antes de terminar.
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
        // confere letra × resolução do gabarito (corrige quando a própria resolução prova o erro)
        // revisão determinística: typos conhecidos, blocos repetidos, conceitos órfãos
        const { material: revisado, avisos: avisosRevisao } = revisarMaterial(normalizarMaterial(parsed, tema));
        const { material, avisos: avisosGabarito } = conferirGabarito(revisado);
        material.bncc = oficial
          ? { codigo: oficial.c, texto: oficial.t, verificada: true }
          : bncc
          ? { codigo: bncc, texto: habilidade || "", verificada: false }
          : null;
        material.dificuldade = nivelDif.id;
        material.avisosGabarito = avisosGabarito;
        material.avisosRevisao = avisosRevisao;
        material.alertas = [...conferirCoerencia({ nivel, bncc }, material), ...verificarUnidades(material), ...avisosGabarito, ...avisosRevisao, ...conferirQualidade(material)];
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
