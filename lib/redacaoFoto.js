// Correção na foto da redação manuscrita (spec, Fase 2, item 10.1), parte pura:
//   1) a IA transcreve a folha linha a linha, com a caixa de cada linha na foto;
//   2) o aluno/professor confere e edita o texto (nunca corrigir sem essa confirmação);
//   3) a correção do texto (lib/redacao.js) devolve os erros com o trecho exato;
//   4) aqui achamos cada trecho nas linhas lidas e calculamos onde marcar na foto.
// Caixas no padrão do Gemini: [ymin, xmin, ymax, xmax], de 0 a 1000. Sem rede: testável.

export const MAX_FOTOS = { gratis: 2, pro: 4 };
export const MAX_LINHAS_FOTO = 60;
export const MAX_BYTES_FOTO = 4 * 1024 * 1024;

export const SISTEMA_TRANSCRICAO = "Você transcreve redações manuscritas de estudantes brasileiros com fidelidade absoluta. Responda só com JSON válido.";

export function montarPromptTranscricao() {
  return [
    "Transcreva a redação manuscrita desta foto EXATAMENTE como o aluno escreveu.",
    "- NÃO corrija nada: mantenha erros de grafia, acentuação, concordância e pontuação.",
    "- Uma entrada por linha escrita da folha, de cima para baixo, na ordem.",
    "- Para cada linha, dê a caixa que envolve o que está escrito: [ymin, xmin, ymax, xmax] de 0 a 1000.",
    '- novoParagrafo: true quando a linha começa um parágrafo (recuo ou início do texto).',
    "- Palavra que você não consegue ler: escreva [ilegível]. Texto riscado pelo aluno: não transcreva.",
    "- Ignore cabeçalho impresso, número das linhas e margens.",
    "- legivel: false se a foto não for de uma redação ou estiver ilegível.",
    'Esquema: {"legivel":true,"linhasDaFoto":[{"texto":"string","caixa":[0,0,0,0],"novoParagrafo":true}]}',
  ].join("\n");
}

const limitar = (n) => Math.min(1000, Math.max(0, Math.round(Number(n) || 0)));

// JSON da IA → { ok, linhas: [{ texto, caixa, novoParagrafo }] }
export function normalizarTranscricao(json) {
  if (!json || typeof json !== "object") return { ok: false, erro: "Resposta vazia." };
  if (json.legivel === false) return { ok: false, erro: "Não foi possível ler a redação nesta foto. Tire outra, de frente, com boa luz e sem sombra." };
  const linhas = (Array.isArray(json.linhasDaFoto) ? json.linhasDaFoto : [])
    .map((l, i) => {
      const texto = String(l?.texto ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
      let [y1, x1, y2, x2] = Array.isArray(l?.caixa) && l.caixa.length === 4 ? l.caixa.map(limitar) : [0, 0, 0, 0];
      if (y2 < y1) [y1, y2] = [y2, y1];
      if (x2 < x1) [x1, x2] = [x2, x1];
      return { texto, caixa: [y1, x1, y2, x2], novoParagrafo: i === 0 || l?.novoParagrafo === true };
    })
    .filter((l) => l.texto)
    .slice(0, MAX_LINHAS_FOTO);
  if (!linhas.length) return { ok: false, erro: "Não encontrei texto escrito nesta foto." };
  return { ok: true, linhas };
}

// Linhas de todas as páginas → texto corrido (parágrafos com linha em branco; hífen de fim de linha junta a palavra)
export function textoDasLinhas(paginas = []) {
  let texto = "";
  for (const linhas of paginas)
    for (const l of linhas) {
      if (!texto) texto = l.texto;
      else if (l.novoParagrafo) texto += `\n\n${l.texto}`;
      else if (/[\p{L}]-$/u.test(texto)) texto = texto.slice(0, -1) + l.texto;
      else texto += ` ${l.texto}`;
    }
  return texto;
}

// Comparação tolerante: minúsculas, sem acento e sem pontuação; mantém 1 caractere por caractere
// (o índice no texto normalizado vale como posição aproximada na linha)
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, " ");
const palavrasDe = (s) => norm(s).split(/\s+/).filter(Boolean);

// Onde marcar cada erro: { erro (índice), pagina, linha, x1, x2, y1, y2, aproximado }
// Procura o trecho numa linha ou na junção de duas linhas; se não achar, pela 1ª palavras do trecho;
// se não achar de jeito nenhum, o erro fica só na lista (sem marca na foto).
export function localizarErros(paginas = [], erros = []) {
  const todas = paginas.flatMap((linhas, p) => linhas.map((l, i) => ({ ...l, pagina: p, indice: i, n: norm(l.texto) })));
  const marcas = [];
  erros.forEach((e, k) => {
    const alvo = palavrasDe(e.trecho).join(" ");
    if (!alvo) return;
    const tentativas = [alvo, palavrasDe(e.trecho).slice(0, 3).join(" "), palavrasDe(e.trecho)[0] && palavrasDe(e.trecho).sort((a, b) => b.length - a.length)[0]].filter(Boolean);
    for (const [t, busca] of tentativas.entries()) {
      const achou = achar(todas, busca, marcas);
      if (achou) {
        marcas.push({ erro: k, ...achou, aproximado: t > 0 });
        return;
      }
    }
  });
  return marcas;
}

function achar(todas, busca, marcas) {
  const re = new RegExp(`(^|\\s)${busca.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")}(?=\\s|$)`);
  for (let i = 0; i < todas.length; i++) {
    const l = todas[i];
    const compacta = l.n.replace(/\s+/g, " ");
    const m = re.exec(compacta);
    if (m) {
      const ini = m.index + m[1].length;
      const fim = ini + m[0].length - m[1].length;
      const ocupada = marcas.some((x) => x.pagina === l.pagina && x.linha === l.indice && Math.abs(x.ini - ini) < 2);
      if (ocupada) continue;
      return caixaDoTrecho(l, ini, fim, compacta.length);
    }
    // trecho que quebra entre esta linha e a seguinte (mesma página): marca o começo nesta linha
    const prox = todas[i + 1];
    if (prox && prox.pagina === l.pagina) {
      const junta = `${compacta} ${prox.n.replace(/\s+/g, " ")}`;
      const m2 = re.exec(junta);
      if (m2 && m2.index + m2[1].length < compacta.length) return caixaDoTrecho(l, m2.index + m2[1].length, compacta.length, compacta.length);
    }
  }
  return null;
}

function caixaDoTrecho(l, ini, fim, total) {
  const [y1, x1, y2, x2] = l.caixa;
  const largura = x2 - x1;
  const t = Math.max(total, 1);
  return { pagina: l.pagina, linha: l.indice, ini, x1: Math.round(x1 + (largura * ini) / t), x2: Math.round(x1 + (largura * Math.min(fim, t)) / t), y1, y2 };
}
