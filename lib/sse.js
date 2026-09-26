// Task 1.1 — Leitura, no navegador, do stream SSE da rota /api/gerar-material.
// Eventos: { tipo: "progresso", caracteres } | { tipo: "concluido", material } | { tipo: "erro", mensagem }

export async function lerStreamMaterial(res, { onProgresso } = {}) {
  const tipo = res.headers.get("content-type") || "";

  // Erros de validação/configuração chegam como JSON comum, antes do stream começar
  if (!tipo.includes("text/event-stream")) {
    let data = {};
    try {
      data = await res.json();
    } catch {
      /* resposta vazia ou HTML de erro da plataforma */
    }
    if (res.status === 504) {
      throw new Error("O servidor demorou demais para responder (timeout). Tente novamente em instantes.");
    }
    throw new Error(data.error || `Erro ${res.status} ao gerar o conteúdo.`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let fim;
    while ((fim = buffer.indexOf("\n\n")) !== -1) {
      const bloco = buffer.slice(0, fim);
      buffer = buffer.slice(fim + 2);
      const linha = bloco.split("\n").find((l) => l.startsWith("data:"));
      if (!linha) continue;
      const evento = JSON.parse(linha.slice(5).trim());
      if (evento.tipo === "progresso") onProgresso?.(evento.caracteres);
      else if (evento.tipo === "concluido") return evento.material;
      else if (evento.tipo === "erro") throw new Error(evento.mensagem);
    }
  }
  throw new Error("A conexão foi encerrada antes de o material ficar pronto. Tente novamente.");
}
