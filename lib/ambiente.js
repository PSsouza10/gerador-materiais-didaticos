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

// Marcador que o banco precisa ter para ser usado neste ambiente (Parte B)
export const marcadorEsperado = (env = process.env) => (ehProducao(env) ? "producao" : "teste");

// Interruptores da Parte B, só em produção. Fora da produção não se aplicam.
export const bancoProducaoLigado = (env = process.env) => ehProducao(env) && env.BANCO_PRODUCAO === "1";
// Exclusão de conta: no site real só com EXCLUSAO_CONTA=1 (decisão do Paulo após a validação)
export const exclusaoPermitida = (env = process.env) => !ehProducao(env) || env.EXCLUSAO_CONTA === "1";

// Fora da produção, tudo o que o site grava no Vercel Blob vai para a pasta "teste/".
// Assim, mesmo que o site de teste use por engano o mesmo Blob da produção,
// ele nunca lê nem sobrescreve um arquivo real (histórico, uso, apostila, imagem).
export const PREFIXO_TESTE = "teste/";
export function caminhoBlob(caminho, env = process.env) {
  const c = String(caminho);
  if (ehProducao(env) || c.startsWith(PREFIXO_TESTE)) return c;
  return PREFIXO_TESTE + c;
}

// Endereço do login no Preview: o endereço fixo do branch (ex.: edugera-git-fase-0-...vercel.app).
// Em produção devolve null (lá vale o NEXTAUTH_URL de sempre).
export function urlLoginPreview(env = process.env) {
  if (env.VERCEL_ENV !== "preview" || !env.VERCEL_BRANCH_URL) return null;
  return "https://" + env.VERCEL_BRANCH_URL;
}

// IA simulada: no teste, a "IA" devolve uma apostila fixa (sem custo e sem dados reais).
// Liga com IA_SIMULADA=1 e NUNCA liga em produção, mesmo que a variável exista lá.
export const iaSimulada = (env = process.env) => !ehProducao(env) && env.IA_SIMULADA === "1";
