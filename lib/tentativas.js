// Repetir com espera crescente (Parte B): o Blob pode levar alguns instantes para
// mostrar a versão nova logo depois de uma gravação.
export const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

export async function comTentativas(fn, { tentativas = 5, espera = 250 } = {}) {
  let ultimo;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn(i);
    } catch (e) {
      ultimo = e;
      if (i < tentativas - 1) await esperar(espera * 2 ** i);
    }
  }
  throw ultimo;
}

// A lista do Blob espelha a do banco? (ids, revogado, link ativo)
export function listaConfere(blobItens = [], bancoItens = []) {
  const chave = (m) => `${m.id}|${m.revogado ? "r" : m.chave ? "a" : "s"}`;
  const a = new Set(blobItens.map(chave));
  const b = new Set(bancoItens.map(chave));
  const divergencias = [...b].filter((x) => !a.has(x)).length + [...a].filter((x) => !b.has(x)).length;
  return { ok: divergencias === 0, divergencias };
}
