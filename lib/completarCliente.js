// No navegador: pede as questões que faltaram, uma por vez (/api/completar-avaliacao).
// Para quando completa, quando o servidor recusa (prazo, já completa) ou depois de 2 falhas seguidas.
export async function completarAvaliacao(avaliacao, completar, { aoProgresso = () => {} } = {}) {
  let av = avaliacao;
  const meta = Number(av?.pedido?.itens) || av.itens.length;
  let falhas = 0;
  while (completar?.token && av.itens.length < meta && falhas < 2) {
    aoProgresso({ atual: av.itens.length + 1, meta });
    let r;
    let j = {};
    try {
      r = await fetch("/api/completar-avaliacao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avaliacao: av, token: completar.token }) });
      j = await r.json().catch(() => ({}));
    } catch {
      falhas++;
      continue;
    }
    if (r.ok && j.item) {
      av = { ...av, itens: [...av.itens, j.item] };
      falhas = 0;
    } else if (r.status === 403 || r.status === 409 || r.status === 401) break;
    else falhas++;
  }
  return { avaliacao: av, completa: av.itens.length >= meta, faltam: Math.max(0, meta - av.itens.length) };
}
