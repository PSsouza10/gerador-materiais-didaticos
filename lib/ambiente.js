// Em que ambiente o EduGera está rodando — base do isolamento da Fase 0.
//   producao: site publicado (VERCEL_ENV=production). NADA de teste liga aqui:
//             sem banco de teste, sem IA simulada, caminhos do Blob iguais aos de sempre.
//   teste:    site de teste da Vercel (Preview, branch fase-0) ou APP_ENV=teste.
//   local:    computador do desenvolvedor (next dev / next start).
// Recebe o env por parâmetro para os testes poderem simular cada caso.

export function ambiente(env = process.env) {
  if (env.VERCEL_ENV === "production") return "producao";
  if (env.APP_ENV === "teste" || env.VERCEL_ENV === "preview") return "teste";
  return "local";
}

export const ehProducao = (env = process.env) => ambiente(env) === "producao";
export const ehTeste = (env = process.env) => ambiente(env) === "teste";

// Fora da produção, tudo o que o site grava no Vercel Blob vai para a pasta "teste/".
// Assim, mesmo que o site de teste use por engano o mesmo Blob da produção,
// ele nunca lê nem sobrescreve um arquivo real (histórico, uso, apostila, imagem).
export const PREFIXO_TESTE = "teste/";
export function caminhoBlob(caminho, env = process.env) {
  const c = String(caminho);
  if (ehProducao(env) || c.startsWith(PREFIXO_TESTE)) return c;
  return PREFIXO_TESTE + c;
}

// IA simulada: no teste, a "IA" devolve uma apostila fixa (sem custo e sem dados reais).
// Liga com IA_SIMULADA=1 e NUNCA liga em produção, mesmo que a variável exista lá.
export const iaSimulada = (env = process.env) => !ehProducao(env) && env.IA_SIMULADA === "1";
