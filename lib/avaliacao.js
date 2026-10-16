// Avaliação no padrão das provas externas de SP (Prova Paulista / SARESP):
// itens de múltipla escolha com texto-base, comando, 4 alternativas (A–D),
// uma só correta e distratores que revelam erros típicos. Cada item traz a
// habilidade da BNCC e o descritor (o que o item avalia). A versão do professor
// tem gabarito, resolução e a análise de cada distrator (o que o aluno que marcou
// aquela letra provavelmente pensou), para planejar a retomada.
// Sem acesso a rede: testável.

import { limparTexto } from "./validacao.js";
import { etapaIncompativel } from "./coerencia.js";
import { normalizarFigura, citaFigura, numerosDaFigura, geometriaDaFigura, legendaPadrao, ladosDoContorno, ladoRotulado } from "./figuras.js";
import { valorNumerico } from "./gabarito.js";
import { contasDoTexto, operandos, valorAlcancado } from "./contaTexto.js";
import { unificarNomes } from "./material.js";

export const QUANTIDADES_ITENS = [5, 8, 10, 12];
export const LETRAS = ["A", "B", "C", "D"];
export const DIFICULDADES_ITEM = ["facil", "media", "dificil"];
export const ROTULO_DIFICULDADE = { facil: "Fácil", media: "Média", dificil: "Difícil" };
export const LIMITES_AVALIACAO = { professor: 120, escola: 120, turma: 60, tema: 200, observacoes: 1000, bncc: 20, habilidade: 2000 };
export const LIMITE_AVALIACOES_SALVAS = 50;
// Porcentagem mínima de questões com suporte visual (Prova Paulista, SAEB e CAEd usam muito)
export const PORCENTAGENS_FIGURA = [0, 40, 60, 100];
export const minimoComFigura = (itens, pct) => (pct > 0 ? Math.max(1, Math.ceil((itens * pct) / 100)) : 0);

// Suportes visuais que o sistema desenha, por área (orientação para a IA)
export function suportesDaDisciplina(disciplina = "") {
  const d = disciplina.toLowerCase();
  if (/matem/.test(d)) return "bloco retangular com medidas, polígono com medidas, ângulo, malha quadriculada (grade), reta numérica, fração, gráfico de barras, de linhas ou de setores, tabela, relógio, cédulas e moedas";
  if (/ci[eê]nc/.test(d)) return "esquema em etapas ou ciclo (fluxo: ciclo da água, cadeia alimentar, etapas de um experimento), gráfico de barras ou de linhas com resultados de experimento, tabela de dados, mapa conceitual";
  if (/geogr/.test(d)) return "gráfico de barras ou de linhas (população, temperatura, chuva mês a mês, como num climograma), gráfico de setores, tabela de dados, esquema em etapas";
  if (/hist/.test(d)) return "linha do tempo, tabela de dados históricos, gráfico de barras ou de linhas, mapa conceitual de causas e consequências";
  if (/portugu|ingl|l[ií]ngua/.test(d)) return "tabela (classificação de palavras, quadro de conjugação), mapa conceitual, esquema em etapas (estrutura de um gênero textual)";
  return "tabela, gráfico de barras, esquema em etapas (fluxo), mapa conceitual, linha do tempo";
}

const txt = (v) => (typeof v === "string" ? limparTexto(v) : "");
const lista = (v) => (Array.isArray(v) ? v : []);
const anoLegivel = (ano = "") => (!ano ? "" : ano.startsWith("EM") ? `${ano.slice(2)}ª série` : `${ano}º ano`);

// ---------- Pedido ----------
export function validarPedidoAvaliacao(body = {}, { temBase = false } = {}) {
  const d = {};
  for (const [campo, max] of Object.entries(LIMITES_AVALIACAO)) {
    const v = limparTexto(typeof body[campo] === "string" ? body[campo] : "");
    if (v.length > max) return { ok: false, erro: `O campo "${campo}" passou do limite de ${max} caracteres.` };
    d[campo] = v;
  }
  d.disciplina = limparTexto(typeof body.disciplina === "string" ? body.disciplina : "").slice(0, 60);
  d.nivel = limparTexto(typeof body.nivel === "string" ? body.nivel : "").slice(0, 60);
  d.ano = limparTexto(typeof body.ano === "string" ? body.ano : "").slice(0, 6);
  d.itens = QUANTIDADES_ITENS.includes(Number(body.itens)) ? Number(body.itens) : 8;
  d.figuras = PORCENTAGENS_FIGURA.includes(Number(body.figuras)) ? Number(body.figuras) : 40;
  if (!d.tema && temBase) {
    d.tema = "conforme a apostila";
    d.temaDoMaterial = true;
  }
  if (!d.disciplina || !d.nivel || !d.tema) return { ok: false, erro: "Preencha Disciplina, Nível e Tema." };
  if (!d.temaDoMaterial && d.tema.length < 3) return { ok: false, erro: "Escreva um tema com pelo menos 3 caracteres." };
  const etapa = etapaIncompativel(d);
  if (etapa) return { ok: false, erro: etapa.charAt(0).toUpperCase() + etapa.slice(1) };
  return { ok: true, dados: d };
}

// ---------- Pedido à IA ----------
export function montarPromptAvaliacao(d, habilidadeOficial = "", base = null, candidatas = []) {
  const n = d.itens;
  const faceis = Math.max(1, Math.round(n * 0.3));
  const dificeis = Math.max(1, Math.round(n * 0.3));
  const medias = n - faceis - dificeis;
  return `Monte uma AVALIAÇÃO DE MÚLTIPLA ESCOLHA no padrão das avaliações externas de São Paulo (Prova Paulista e SARESP).
${base?.texto ? `
MATERIAL BASE: uma apostila criada no EduGera e já trabalhada com a turma (texto abaixo).
Avalie o que a apostila ensina: os mesmos conceitos e habilidades, com situações NOVAS (não copie os exercícios da apostila).
Ignore nomes de alunos ou dados pessoais que apareçam no material.
---
${base.texto}
---
` : ""}
DADOS DO PROFESSOR
- Componente curricular: ${d.disciplina}
- Etapa: ${d.nivel}${d.ano ? ` — ${anoLegivel(d.ano)}` : ""}
- Tema: ${d.temaDoMaterial ? "o da apostila acima" : d.tema}
- Habilidade: ${
    habilidadeOficial ||
    (d.bncc
      ? `${d.bncc} — ${d.habilidade || "(sem texto)"}`
      : candidatas.length
        ? "não informada; use de 1 a 3 habilidades DA LISTA OFICIAL abaixo, as que mais combinam com o tema. Copie o código exatamente."
        : "não informada; use habilidades da BNCC adequadas à etapa e ao ano, com o código correto")
  }${candidatas.length && !habilidadeOficial && !d.bncc ? `
LISTA OFICIAL (BNCC):
${candidatas.join("\n")}` : ""}
- Orientações do professor: ${d.observacoes || "nenhuma"}

Retorne um JSON com esta estrutura EXATA:
{
  "titulo": "título curto da avaliação (ex.: \\"Avaliação — Volume de blocos retangulares\\")",
  "itens": [
    {
      "habilidades": ["código BNCC principal que o item avalia (ex.: EF07MA30)", "opcional: 2ª habilidade, só quando o item também cobra outra (ex.: leitura de gráfico ou tabela de Probabilidade e Estatística)"],
      "descritor": "o que o item avalia, começando por verbo, até 15 palavras (ex.: \\"Resolver problema de volume de bloco retangular em cm³\\")",
      "dificuldade": "facil" | "media" | "dificil",
      "textoBase": "texto de apoio: situação do cotidiano, notícia, receita, tabela descrita etc. (1 a 4 frases)",
      "figura": { UMA figura dos tipos abaixo } ou null,
      "leituraFigura": "quando há figura: qual informação da figura o aluno precisa ler para responder (1 frase); sem figura: \"\"",
      "comando": "pergunta direta que o aluno responde, terminando com ? ou :",
      "alternativas": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "resolucao": "resolução curta feita ANTES de escolher a letra; em cálculo, termine com = resultado e depois 'Portanto, ...'. Não cite letras.",
      "correta": "A" | "B" | "C" | "D",
      "distratores": { "LETRA_ERRADA": "o erro de raciocínio que leva o aluno a marcar essa alternativa (1 frase)" }
    }
  ]
}

SUPORTES VISUAIS (desenhados pelo sistema a partir destes dados, em preto e branco; "legenda" é OBRIGATÓRIA: um nome curto da figura, sem "Figura 1", ex.: "Planta do jardim"):
- { "tipo": "bloco", "comprimento": 30, "largura": 20, "altura": 10, "unidade": "cm", "legenda": "" }   (bloco retangular em perspectiva com as 3 medidas)
- { "tipo": "poligono", "forma": "retangulo" | "quadrado" | "triangulo", "base": 8, "altura": 5, "lado": 4, "hipotenusa": null, "unidade": "m", "legenda": "" }   (quadrado usa "lado"; triângulo é retângulo, com catetos base e altura)
- { "tipo": "contorno", "unidade": "m", "pontos": [[0,0],[8,0],[8,3],[3,3],[3,6],[0,6]], "cotas": [], "legenda": "" }   (FIGURA COMPOSTA pelos vértices, em unidades reais: forma em L, retângulo + triângulo como [[0,0],[10,0],[10,5],[5,8],[0,5]] com a cota { "de": [5,5], "ate": [5,8] } para a altura do triângulo; o sistema escreve a medida de cada lado)
- { "tipo": "angulo", "graus": 60, "mostrarMedida": true, "legenda": "" }
- { "tipo": "grade", "linhas": 3, "colunas": 4, "pintadas": 0, "legenda": "" }   (malha quadriculada; "pintadas" conta da esquerda para a direita, de cima para baixo)
- { "tipo": "reta", "inicio": 0, "fim": 1, "divisoes": 4, "rotulos": "extremos" | "todos" | "nenhum", "marcar": null ou número do tracinho a destacar com a letra A, "legenda": "" }
- { "tipo": "fracao", "forma": "barra" | "circulo", "partes": 5, "pintadas": 1, "legenda": "" }
- { "tipo": "barras", "titulo": "", "unidade": "", "itens": [{ "rotulo": "...", "valor": 10 }], "legenda": "" }   (até 8 barras)
- { "tipo": "linhas", "titulo": "", "unidade": "", "itens": [{ "rotulo": "jan", "valor": 12 }], "legenda": "" }   (evolução no tempo, até 12 pontos)
- { "tipo": "setores", "titulo": "", "itens": [{ "rotulo": "...", "valor": 25 }], "legenda": "" }   (até 6 fatias; o sistema escreve a porcentagem de cada uma)
- { "tipo": "tabela", "cabecalho": ["...", "..."], "linhas": [["...", "..."]], "legenda": "" }   (até 6 colunas e 8 linhas)
- { "tipo": "relogio", "hora": 9, "minuto": 30, "legenda": "" }   (relógio de ponteiros)
- { "tipo": "dinheiro", "itens": [{ "valor": 20, "quantidade": 2 }, { "valor": 0.5, "quantidade": 3 }], "legenda": "" }   (cédulas 200, 100, 50, 20, 10, 5, 2 e moedas 1, 0.5, 0.25, 0.1, 0.05)
- { "tipo": "linha_do_tempo", "eventos": [{ "data": "1500", "texto": "..." }], "legenda": "" }
- { "tipo": "fluxo", "etapas": ["...", "..."], "ciclo": false, "legenda": "" }   (esquema em etapas ou ciclo)
- { "tipo": "mapa", "centro": "ideia central", "ramos": ["...", "..."], "legenda": "" }   (mapa conceitual)
Suportes mais adequados para ${d.disciplina}: ${suportesDaDisciplina(d.disciplina)}.

REGRAS DO PADRÃO PROVA PAULISTA / SARESP:
- Exatamente ${n} itens. Dificuldade: ${faceis} "facil", ${medias} "media" e ${dificeis} "dificil", em ordem crescente.
- Dificuldade pela exigência real: "facil" = reconhecer ou aplicar diretamente um conceito ou fórmula num passo; "media" = aplicar com conversão ou comparação (2 passos); "dificil" = problema com várias etapas, interpretação de dados ou análise de um erro.
- Todo item tem texto-base contextualizado (situação real da faixa etária) e um comando claro e afirmativo. O comando NÃO usa "exceto", "incorreta", "falsa" nem "não é".
- Cada item avalia UMA habilidade principal e UM descritor; se ele também exige outra habilidade de verdade (ex.: ler um gráfico de linhas para resolver um problema de volume), inclua-a como 2ª em "habilidades", com o código oficial do mesmo ano ou de anos anteriores. Se só uma habilidade foi informada, todos os itens a avaliam, cobrindo aspectos diferentes dela (não repita o mesmo item com números trocados).
- Exatamente 4 alternativas (A, B, C, D) e só UMA correta. Nada de "todas as anteriores" ou "nenhuma das anteriores".
- Alternativas curtas, paralelas e de tamanho parecido; a correta não pode ser a mais longa. Alternativas numéricas em ordem crescente e TODAS com a unidade (ex.: "33 m²", "6 000 cm³", "2,5 kg", "26 °C").
- Distratores PLAUSÍVEIS: cada alternativa errada nasce de um ERRO TÍPICO de aluno feito com os MESMOS números da questão: somar em vez de multiplicar, calcular o perímetro em vez da área, esquecer de dividir por 2 a área do triângulo, esquecer uma das partes da figura composta, não converter a unidade, ler só parte do texto. PROIBIDO inventar contas com números que não estão na questão (ex.: "multiplicou por 7,5"). Em "distratores", explique as 3 letras erradas (nunca a correta), mostrando a conta errada que chega EXATAMENTE ao valor daquela alternativa (ex.: "Somou as medidas: 30 + 20 + 10 = 60"). Confira cada conta.
- Antes de preencher "correta", RESOLVA o item em "resolucao": a letra marcada TEM de ser a alternativa cujo valor é o resultado da resolução. Confira antes de terminar.
- Distribua as respostas corretas entre A, B, C e D (nenhuma letra com mais da metade dos itens).
${(d.figuras ?? 40) > 0 ? `- SUPORTE VISUAL: pelo menos ${minimoComFigura(n, d.figuras ?? 40)} dos ${n} itens TÊM "figura" (como nas provas do SAEB, da CAEd e da Prova Paulista). Nesses itens a resposta DEPENDE da leitura da figura: os dados necessários (medidas, valores do gráfico, horário, quantias) aparecem SÓ na figura, não no texto-base; o texto-base apresenta a situação e diz "observe a figura", "o gráfico mostra" etc. Os números da figura são os mesmos usados na resolução. Preencha "leituraFigura".` : "- Não use figuras nesta avaliação (\"figura\": null em todos os itens)."}
- Área, perímetro ou volume de figura composta (forma em L, retângulo com triângulo, terreno, fachada) TEM figura do tipo "contorno".
- NUNCA cite tabela, gráfico ou figura sem preencher "figura". A figura não entrega a resposta.
- Números e contextos adequados à faixa etária; unidades sempre explícitas e coerentes (área em unidades quadradas, volume em cúbicas ou litros).
- Use só conteúdos que a BNCC prevê até o ano escolhido; nunca antecipe conteúdo de anos seguintes. A habilidade é da etapa escolhida (EF = Ensino Fundamental, EM = Ensino Médio).
- Potências com ^ (ex.: 3^4); o sistema formata como expoente.
- Não escreva nomes de alunos reais; use nomes comuns e variados nos contextos.
- Português do Brasil revisado, texto direto, sem frases de enfeite.`;
}

// ---------- Normalização ----------
const semRotulo = (a) => String(a).replace(/^\s*\(?\s*[a-eA-E]\s*[).:\-–]\s*/, "").trim();
const letraValida = (v) => {
  const m = /^\s*\(?\s*([a-dA-D])\b/.exec(String(v || ""));
  return m ? m[1].toUpperCase() : null;
};

// Nível coerente com a conta: 1 operação não é "Difícil" (vira Fácil); 2 operações no máximo "Média"
export function passosDaConta(resolucao = "") {
  const { contas } = contasDoTexto(resolucao);
  return contas.reduce((s, c) => s + (c.expressao.replace(/^[-−–]/, "").match(/[+\-−–×*·÷/^]/g) || []).length, 0);
}
function nivelCoerente(nivel, resolucao) {
  const passos = passosDaConta(resolucao);
  if (!passos) return { dificuldade: nivel }; // sem conta (leitura, conceito): fica o nível da IA
  if (nivel === "dificil" && passos <= 1) return { dificuldade: "facil", nivelAjustado: "Difícil → Fácil (a conta tem 1 passo)" };
  if (nivel === "dificil" && passos === 2) return { dificuldade: "media", nivelAjustado: "Difícil → Média (a conta tem 2 passos)" };
  return { dificuldade: nivel };
}

// Toda figura tem nome ("Figura 1 – Nome"); tira um "Figura 1 –" que a IA já tenha escrito
function comLegenda(f) {
  if (!f) return null;
  const limpa = String(f.legenda || "").replace(/^\s*(figura|tabela|gr[aá]fico)\s*\d+\s*[–—:-]\s*/i, "").trim();
  return { ...f, legenda: limpa || legendaPadrao(f) };
}

export function normalizarItem(it = {}, resolverHabilidade = () => null, habilidadePadrao = null) {
  const alternativas = lista(it.alternativas).map((a) => semRotulo(txt(a))).filter(Boolean).slice(0, 5);
  let correta = letraValida(it.correta) || letraValida(it.resposta);
  if (correta && LETRAS.indexOf(correta) >= alternativas.length) correta = null;
  const distratores = {};
  // aceita { "A": "..." }, [{ "letra": "A", "explicacao": "..." }] ou ["...", "...", "..."] (na ordem das letras erradas)
  let brutos = it.distratores && typeof it.distratores === "object" && !Array.isArray(it.distratores) ? it.distratores : {};
  if (Array.isArray(it.distratores)) {
    const erradas = LETRAS.slice(0, alternativas.length).filter((l) => l !== correta);
    brutos = Object.fromEntries(
      it.distratores
        .map((x, i) => (x && typeof x === "object" ? [x.letra || x.alternativa || erradas[i], x.explicacao || x.erro || x.texto || ""] : [erradas[i], x]))
        .filter(([l]) => l)
    );
  }
  for (const [k, v] of Object.entries(brutos)) {
    const l = letraValida(k);
    if (l && LETRAS.indexOf(l) < alternativas.length && txt(v)) distratores[l] = txt(v); // a da correta sai depois da conferência
  }
  // até 2 habilidades: a principal primeiro; a 2ª quando o item também cobra outra (ex.: leitura de gráfico)
  const codigos = [...new Set((Array.isArray(it.habilidades) ? it.habilidades : [it.habilidade, ...String(it.habilidade || "").split(/[,;/]/)])
    .map((c) => txt(c).toUpperCase().replace(/\s+/g, ""))
    .filter((c) => /^[A-Z]{2}\d{2}[A-Z]{2,4}\d{2,3}[A-Z]?$/.test(c)))].slice(0, 2);
  const principal = codigos[0] || "";
  const oficial = principal ? resolverHabilidade(principal) : null;
  const habilidade = oficial
    ? { codigo: oficial.c, verificada: true }
    : habilidadePadrao
      ? { codigo: habilidadePadrao.c, verificada: true, substituida: principal || null }
      : principal
        ? { codigo: principal, verificada: false }
        : null;
  const extras = codigos.slice(1).map((c) => {
    const o = resolverHabilidade(c);
    return o ? { codigo: o.c, verificada: true } : { codigo: c, verificada: false };
  }).filter((h) => h.codigo !== habilidade?.codigo);
  return {
    habilidade,
    habilidades: [habilidade, ...extras].filter(Boolean),
    descritor: txt(it.descritor),
    ...nivelCoerente(DIFICULDADES_ITEM.includes(it.dificuldade) ? it.dificuldade : "media", txt(it.resolucao)),
    textoBase: txt(it.textoBase),
    figura: comLegenda(normalizarFigura(it.figura)),
    comando: txt(it.comando),
    alternativas,
    correta,
    resolucao: txt(it.resolucao),
    leituraFigura: normalizarFigura(it.figura) ? txt(it.leituraFigura) : "",
    distratores,
  };
}

// Alternativas só numéricas (com unidade no máximo) vão em ordem crescente, como nas provas oficiais
const UNIDADES = /\b(?:cm|dm|km|mm|m|l|ml|kg|g|reais|R\$|horas?|h|min|vez|minutos?|segundos?|anos?|dias?|semanas?|meses|vezes|metros?(?: c[uú]bicos?| quadrados?)?|cent[ií]metros?(?: c[uú]bicos?| quadrados?)?|litros?|mililitros?|quilos?|quilogramas?|gramas?|graus?|°C?|%)(?=[\s.,;]|$)/gi;
// Valor de uma alternativa: "26°C" = "26 °C" = 26; "9/10" e "9/10 do bolo" = 0,9; "1 1/2" = 1,5;
// "R$ 12,50" = 12,5. Com dois números ("2 h 30 min", "3 lados e 2 vértices") não é numérica.
export const numeroDaAlternativa = (t = "") => {
  const s = String(t).replace(/([a-z])[²³]/gi, "$1").replace(/R\$\s*/g, "").replace(/[−–]/g, "-").trim();
  const num = (x) => parseFloat(String(x).replace(/\s|\.(?=\d{3}\b)/g, "").replace(",", "."));
  let m;
  let v = null;
  let resto = "";
  if ((m = /^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)(?!\d)/.exec(s)) && Number(m[4]) > 0) {
    v = (m[1] ? -1 : 1) * (Number(m[2]) + Number(m[3]) / Number(m[4]));
    resto = s.slice(m[0].length);
  } else if ((m = /^(-?\d+(?:,\d+)?)\s*\/\s*(\d+(?:,\d+)?)(?![\d,])/.exec(s)) && num(m[2]) !== 0) {
    v = num(m[1]) / num(m[2]);
    resto = s.slice(m[0].length);
  } else if ((m = /^-?\d{1,3}(?:[ .]\d{3})+(?:,\d+)?(?![\d])|^-?\d+(?:[.,]\d+)?/.exec(s))) {
    // número simples (com milhar "6 000" ou "6.000" e vírgula decimal); potência escrita como 10^3 fica para o leitor geral
    if (/^\s*\^/.test(s.slice(m[0].length))) return valorNumerico(s.replace(UNIDADES, "").trim());
    v = num(m[0]);
    resto = s.slice(m[0].length);
  } else return null;
  if (/\d/.test(resto)) return null; // segundo número: não é alternativa de um valor só
  return Number.isFinite(v) ? Math.round(v * 1e9) / 1e9 : null;
};
const ehNumerica = (t) => numeroDaAlternativa(t) != null;

function reordenar(item, novaOrdem) {
  // novaOrdem[i] = índice antigo que vai para a posição i
  const alternativas = novaOrdem.map((k) => item.alternativas[k]);
  const de = (l) => LETRAS[novaOrdem.indexOf(LETRAS.indexOf(l))];
  const distratores = Object.fromEntries(Object.entries(item.distratores).map(([l, v]) => [de(l), v]));
  return { ...item, alternativas, correta: item.correta ? de(item.correta) : null, distratores };
}

export function ordenarNumericas(item) {
  if (item.alternativas.length < 2 || !item.alternativas.every(ehNumerica)) return item;
  const ordem = item.alternativas.map((a, i) => [numeroDaAlternativa(a), i]).sort((x, y) => x[0] - y[0]).map(([, i]) => i);
  if (ordem.every((k, i) => k === i)) return item;
  return reordenar(item, ordem);
}

// A IA concentra o gabarito em B e C. Se uma letra passa de 40% (com 5 itens ou mais),
// a correta vai para a letra menos usada (troca de lugar com a alternativa que estava lá).
// Numéricas: primeiro tenta inverter a ordem (decrescente), que mantém a sequência. Só mexe em itens cuja
// resolução e distratores não citam letras.
const citaLetra = (t = "") => /\b(?:alternativa|letra|op[cç][aã]o)\s+\(?[a-d]\b|\b[a-d]\)/i.test(t);

export function equilibrarGabarito(itens = []) {
  const cont = contarLetras(itens);
  const maior = Math.max(0, ...Object.values(cont));
  if (itens.length < 5 || maior / itens.length <= 0.4) return { itens, mexeu: false };
  const teto = Math.ceil(itens.length / 4);
  let mexeu = false;
  const novos = itens.map((it) => {
    if (!it.correta || it.alternativas.length !== 4) return it;
    if (citaLetra(it.resolucao) || Object.values(it.distratores).some(citaLetra)) return it;
    if (cont[it.correta] <= teto) return it;
    // numéricas ficam em ordem (crescente ou decrescente): só podem ir para a letra "espelho" (A↔D, B↔C)
    if (it.alternativas.every(ehNumerica)) {
      const espelho = LETRAS[3 - LETRAS.indexOf(it.correta)];
      if (cont[espelho] < cont[it.correta] - 1) {
        cont[it.correta]--;
        cont[espelho]++;
        mexeu = true;
        return reordenar(it, [3, 2, 1, 0]);
      }
      // espelho não resolve: troca livre, como nas alternativas de texto (o gabarito vale mais que a ordem)
    }
    const alvo = LETRAS.reduce((m, l) => (cont[l] < cont[m] ? l : m), LETRAS[0]);
    if (cont[alvo] >= cont[it.correta] - 1) return it;
    cont[it.correta]--;
    cont[alvo]++;
    // troca a correta com a alternativa que está na letra-alvo
    const a = LETRAS.indexOf(it.correta);
    const b = LETRAS.indexOf(alvo);
    const ordem = [0, 1, 2, 3];
    ordem[a] = b;
    ordem[b] = a;
    mexeu = true;
    return reordenar(it, ordem);
  });
  return { itens: novos, mexeu };
}

export function contarLetras(itens = []) {
  const c = { A: 0, B: 0, C: 0, D: 0 };
  for (const it of itens) if (c[it.correta] != null) c[it.correta]++;
  return c;
}

export function normalizarAvaliacao(json = {}, d = {}, oficial = null, resolverHabilidade = () => null) {
  const raiz = json?.avaliacao && typeof json.avaliacao === "object" ? json.avaliacao : json || {};
  // habilidade oficial informada pelo professor: item com código inventado volta para ela
  let itens = lista(raiz.itens)
    .filter((it) => it && (it.comando || it.textoBase))
    .slice(0, d.itens || 12)
    .map((it) => normalizarItem(unificarNomes(it), resolverHabilidade, oficial))
    .map(ordenarNumericas);
  // dificuldade crescente (fácil → média → difícil), mantendo a ordem da IA dentro de cada nível
  const peso = { facil: 0, media: 1, dificil: 2 };
  itens = itens.map((it, i) => [it, i]).sort((a, b) => peso[a[0].dificuldade] - peso[b[0].dificuldade] || a[1] - b[1]).map(([it]) => it);
  return {
    titulo: txt(raiz.titulo) || `Avaliação — ${d.tema || ""}`.trim(),
    identificacao: {
      professor: d.professor || "",
      escola: d.escola || "",
      turma: d.turma || "",
      componente: d.disciplina || "",
      etapa: [d.nivel, anoLegivel(d.ano)].filter(Boolean).join(" — "),
      tema: d.temaDoMaterial ? txt(raiz.tema) || txt(raiz.titulo).replace(/^avalia[cç][aã]o\s*[—–-]\s*/i, "") : d.tema,
    },
    itens,
    metaFiguras: minimoComFigura(itens.length, d.figuras ?? 40),
  };
}

// ---------- Conferências (determinísticas, sem IA) ----------
const aviso = (n, motivo, tipo = "conferir", trecho = "") => ({ onde: `Item ${n}`, motivo, tipo, trecho });

// ---------- Conferência das contas (feitas pelo próprio sistema) ----------
const numerosDoTexto = (t = "") =>
  [...String(t).replace(/(\d)\s(?=\d{3}\b)/g, "$1").matchAll(/\d+(?:,\d+)?/g)].map((m) => parseFloat(m[0].replace(",", ".")));
const CONSTANTES = new Set([0, 1, 2, 3, 4, 10, 12, 24, 60, 100, 1000]); // conversões e contas comuns
// nas explicações dos erros, só vale número da questão ou conversão/dobro/metade de verdade
const PERMITIDOS_NO_ERRO = new Set([1, 2, 60, 3600, 24]); // dobro, metade, horas e minutos
const potenciaDe10 = (x) => x > 0 && Math.abs(Math.log10(x) - Math.round(Math.log10(x))) < 1e-9; // conversões (10, 1 000, 0,001…)
const permitidoNoErro = (x) => PERMITIDOS_NO_ERRO.has(x) || potenciaDe10(x);
const mesmo = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
const contem = (lista, v) => lista.some((x) => mesmo(x, v));
const br = (v) => String(Math.round(v * 1e6) / 1e6).replace(".", ",");

// Mantido para compatibilidade: números usados como dados na resolução
export const operandosDaResolucao = (resolucao = "") => operandos(resolucao);

// O que a figura "diz" sobre a pergunta: área, perímetro ou volume calculados pelo sistema
export function esperadoDaFigura(item) {
  const g = geometriaDaFigura(item.figura);
  if (!g) return null;
  const pergunta = `${item.comando}`.toLowerCase();
  const un = (item.figura.unidade || "").toLowerCase();
  const alts = item.alternativas.join(" ").toLowerCase();
  // só compara quando as alternativas estão na mesma unidade da figura (m → m², cm → cm³…)
  const mesmaUnidade = (exp) => !un || new RegExp(`\\b${un}\\s*(?:${exp}|\\^\\s*${exp === "²" ? 2 : 3})`).test(alts.replace(/\s+/g, " ")) || new RegExp(`\\b${un}${exp}`).test(alts);
  if (/per[ií]metro|cerca|moldura|rodap[eé]/.test(pergunta) && g.perimetro != null && (!un || alts.includes(un))) return { grandeza: "perímetro", valor: g.perimetro };
  if (/(^|[^a-zà-ú])[áa]rea([^a-zà-ú]|$)|piso|azulej|grama\b|ladrilh|cobrir|pintar/.test(pergunta) && g.area != null && mesmaUnidade("²")) return { grandeza: "área", valor: g.area };
  if (/volume|capacidade|cabe|cabem/.test(pergunta) && g.volume != null && mesmaUnidade("³")) return { grandeza: "volume", valor: g.volume };
  return null;
}

const COMPOSTA = /\b(em\s+(forma\s+de\s+)?l\b|formato\s+de\s+l\b|figura\s+composta|compost[ao]\s+por|ret[aâ]ngulo\s+e\s+(um\s+)?tri[aâ]ngulo|tri[aâ]ngulo\s+(sobre|em cima)|telhado|fachada)/i;

export function conferirFigura(it, n) {
  const avisos = [];
  const problemas = [];
  let item = it;
  const fig = item.figura;
  // bloco: as 3 medidas da resolução (c × l × h) mandam; se a figura discorda, a figura é ajustada
  if (fig.tipo === "bloco") {
    const m = /(\d+(?:,\d+)?)\s*[×x*·]\s*(\d+(?:,\d+)?)\s*[×x*·]\s*(\d+(?:,\d+)?)/.exec(String(item.resolucao).replace(/(\d)\s(?=\d{3}\b)/g, "$1"));
    if (m) {
      const [c, l, a] = m.slice(1, 4).map((x) => parseFloat(x.replace(",", ".")));
      const naFigura = [fig.comprimento, fig.largura, fig.altura].sort((x, y) => x - y);
      const naConta = [c, l, a].sort((x, y) => x - y);
      if (!naFigura.every((v, i) => mesmo(v, naConta[i]))) {
        item = { ...item, figura: { ...fig, comprimento: c, largura: l, altura: a } };
        avisos.push(aviso(n, `as medidas do bloco na figura (${naFigura.map(br).join(", ")}) não eram as da resolução; a figura foi ajustada para ${br(c)}, ${br(l)} e ${br(a)}${fig.unidade ? ` ${fig.unidade}` : ""}.`, "corrigido"));
      }
    }
  }
  const daFigura = numerosDaFigura(item.figura);
  const doTexto = [...numerosDoTexto(item.textoBase), ...numerosDoTexto(item.comando), ...item.alternativas.flatMap(numerosDoTexto)];
  const soltos = [...new Set(operandos(item.resolucao))].filter((v) => !CONSTANTES.has(v) && !contem(daFigura, v) && !contem(doTexto, v));
  if (soltos.length) {
    avisos.push(aviso(n, `a resolução usa ${soltos.map(br).join(", ")}, que não aparece na figura nem no texto; confira a figura.`));
    problemas.push(`a resolução usa ${soltos.map(br).join(", ")}, que não está na figura nem no texto`);
  }
  // a questão precisa depender da figura: as medidas/valores não podem estar também no texto-base
  const chave = ["bloco", "poligono", "contorno", "barras", "linhas", "setores", "relogio", "dinheiro", "angulo"].includes(item.figura.tipo) ? [...new Set(daFigura)].filter((v) => !CONSTANTES.has(v)) : [];
  const noTexto = numerosDoTexto(`${item.textoBase}`);
  const repetidos = chave.filter((v) => contem(noTexto, v));
  if (repetidos.length >= Math.min(2, chave.length) && repetidos.length > 0) {
    avisos.push(aviso(n, `as medidas da figura (${repetidos.map(br).join(", ")}) também estão no texto; a questão não depende da leitura da figura.`));
    problemas.push(`o texto-base repete as medidas da figura (${repetidos.map(br).join(", ")}); tire-as do texto e diga "observe a figura"`);
  }
  if (item.figura.tipo === "contorno" && item.figura.simples === false) {
    avisos.push(aviso(n, "a figura composta se cruza ou não fecha; a área dela não pode ser usada."));
    problemas.push("os vértices de \"contorno\" formam uma figura que se cruza: liste os vértices em ordem, contornando a figura (ex.: L = [[0,0],[8,0],[8,3],[3,3],[3,6],[0,6]])");
  }
  if (item.figura.tipo === "contorno" && item.figura.cotas.some((c) => !ladoRotulado(Math.hypot(c.ate[0] - c.de[0], c.ate[1] - c.de[1])))) {
    avisos.push(aviso(n, "uma cota da figura não tem medida exata (sairia como ≈)."));
    problemas.push("toda cota de \"contorno\" precisa ter medida exata (inteira ou com 1 casa decimal); use cotas verticais ou horizontais");
  }
  if (item.figura.tipo === "contorno") {
    const semMedida = ladosDoContorno(item.figura).filter((v) => !ladoRotulado(v)).length;
    if (semMedida && !item.figura.cotas.length) {
      avisos.push(aviso(n, "a figura composta tem lados sem medida e nenhuma cota (ex.: a altura do triângulo); o aluno não consegue calcular."));
      problemas.push("a figura de contorno tem lado sem medida: use vértices com medidas inteiras ou inclua em \"cotas\" a medida que falta (ex.: altura do triângulo)");
    }
  }
  if (!item.leituraFigura) avisos.push(aviso(n, "falta dizer ao professor qual informação da figura o aluno precisa ler.", "conferir"));
  return { item, avisos, problemas };
}

// Unidade escrita depois do número ("33 m²" → "m²"; "26 °C" → "°C"; "R$ 12" → "R$")
const UNIDADES_CONHECIDAS = /^(m²|cm²|mm²|km²|dm²|m³|cm³|dm³|mm³|km|m|cm|mm|dm|L|l|mL|ml|litros?|kg|g|mg|t|toneladas?|°C|ºC|°|graus?|h|horas?|min|minutos?|s|segundos?|dias?|anos?|reais|%)$/;
export function unidadeDaAlternativa(t = "") {
  const s = String(t).trim();
  if (/^R\$/.test(s)) return "R$";
  const m = /^-?[\d\s.,/]+\s*(.*)$/.exec(s);
  const resto = (m ? m[1] : "").trim().split(/\s+/)[0] || "";
  return UNIDADES_CONHECIDAS.test(resto) ? resto : "";
}
const PEDE_MEDIDA = /\b(área|area|perímetro|perimetro|volume|capacidade|comprimento|largura|altura|distância|distancia|massa|peso|temperatura|quantos?\s+(metros|centímetros|litros|quilos|gramas|graus|reais|minutos|horas)|quanto\s+(mede|custa|pesa))/i;
function conferirUnidades(it, n) {
  const avisos = [];
  const problemas = [];
  let item = it;
  if (item.alternativas.length < 2 || !item.alternativas.every(ehNumerica)) return { item, avisos, problemas };
  const un = item.alternativas.map(unidadeDaAlternativa);
  const comUn = un.filter(Boolean);
  if (comUn.length === un.length) return { item, avisos, problemas };
  // a unidade que falta: a das outras alternativas, ou a do resultado da resolução ("= 33 m²")
  const daResolucao = (/(-?\d[\d\s.,]*)\s*(m²|cm²|mm²|km²|m³|cm³|dm³|km|cm|mm|dm|m|mL|L|litros|kg|g|°C|ºC|graus|reais|minutos|horas|h|min)(?![a-zà-ú])/i.exec(String(item.resolucao).split(/portanto/i).slice(-1)[0]) || [])[2];
  const alvo = comUn.length ? comUn.sort((a, b) => comUn.filter((x) => x === b).length - comUn.filter((x) => x === a).length)[0] : daResolucao;
  if (alvo) {
    item = { ...item, alternativas: item.alternativas.map((a, i) => (un[i] ? a : alvo === "R$" ? `R$ ${a}` : `${a} ${alvo}`)) };
    avisos.push(aviso(n, `alternativas sem unidade receberam "${alvo}".`, "corrigido"));
  } else if (PEDE_MEDIDA.test(item.comando)) {
    avisos.push(aviso(n, "as alternativas numéricas estão sem unidade (m², cm³, kg…)."));
    problemas.push("as alternativas numéricas precisam da unidade (ex.: 33 m², 6 000 cm³, 2 kg)");
  }
  return { item, avisos, problemas };
}

// Valor de cada alternativa (null quando não é numérica)
const valoresDasAlternativas = (item) => (item.alternativas.length >= 2 && item.alternativas.every(ehNumerica) ? item.alternativas.map(numeroDaAlternativa) : null);
const rotuloAlt = (item, l) => `"${item.alternativas[LETRAS.indexOf(l)] || ""}"`;

export function conferirItem(it, n) {
  const avisos = [];
  const problemas = []; // o que pede refazer a questão (vai para a IA na 2ª tentativa)
  let item = { ...it, semGabarito: false };
  if (item.alternativas.length !== 4) avisos.push(aviso(n, `tem ${item.alternativas.length} alternativas; o padrão é 4 (A a D).`));
  const limpas = item.alternativas.map((a) => a.toLowerCase().replace(/[\s.;]+/g, ""));
  if (new Set(limpas).size !== limpas.length) {
    avisos.push(aviso(n, "tem alternativas repetidas."));
    problemas.push("há alternativas repetidas");
  }
  if (/\b(todas as anteriores|nenhuma das anteriores)\b/i.test(item.alternativas.join(" "))) avisos.push(aviso(n, "usa \"todas/nenhuma das anteriores\", fora do padrão das provas oficiais."));
  if (/\b(exceto|incorreta|falsa|n[aã]o [eé])\b/i.test(item.comando)) avisos.push(aviso(n, "o comando está na forma negativa (exceto, incorreta…); as provas oficiais usam comando afirmativo.", "conferir", item.comando));
  if (!item.figura && (citaFigura(item.comando) || citaFigura(item.textoBase)) && /\b(tabela|gr[aá]fico|figura|reta|malha|linha do tempo|esquema)\b/i.test(`${item.textoBase} ${item.comando}`)) {
    avisos.push(aviso(n, "cita uma tabela, gráfico ou figura que não veio no item."));
    problemas.push("o texto cita uma figura, tabela ou gráfico que não veio: preencha \"figura\"");
  }
  if (!item.figura && COMPOSTA.test(`${item.textoBase} ${item.comando}`)) {
    avisos.push(aviso(n, "é uma figura composta (forma em L, retângulo com triângulo…) e veio sem desenho."));
    problemas.push("é figura composta e precisa do desenho: use \"figura\" do tipo \"contorno\" com os vértices e as cotas");
  }
  if (item.figura) {
    const r = conferirFigura(item, n);
    item = r.item;
    avisos.push(...r.avisos);
    problemas.push(...r.problemas);
  }
  for (const h of item.habilidades || (item.habilidade ? [item.habilidade] : []))
    if (!h.verificada) avisos.push(aviso(n, `a habilidade ${h.codigo} não foi localizada na BNCC.`));
  if (item.habilidade?.substituida) avisos.push(aviso(n, `a IA indicou o código ${item.habilidade.substituida}, inexistente; foi usada a habilidade informada (${item.habilidade.codigo}).`, "corrigido"));

  if (item.nivelAjustado) avisos.push(aviso(n, `nível ajustado: ${item.nivelAjustado}.`, "corrigido"));
  // ----- alternativas numéricas sempre com unidade -----
  const u = conferirUnidades(item, n);
  item = u.item;
  avisos.push(...u.avisos);
  problemas.push(...u.problemas);

  // ----- gabarito: a conta é refeita pelo sistema -----
  const res = contasDoTexto(item.resolucao);
  for (const c of res.erradas) {
    avisos.push(aviso(n, `a resolução tem uma conta errada: ${c.expressao} dá ${br(c.calculado)}, não ${br(c.escrito)}.`));
    problemas.push(`a resolução erra a conta ${c.expressao} (dá ${br(c.calculado)}, não ${br(c.escrito)})`);
  }
  const valores = valoresDasAlternativas(item);
  const daFigura = item.figura ? esperadoDaFigura(item) : null;
  let referencia = res.final;
  if (referencia == null) {
    // resolução sem conta reconhecível: usa o número depois do último "=" (com m² lido como unidade)
    const fim = String(item.resolucao).replace(/([a-zA-Z])\s*[²³]/g, "$1").split("=").slice(-1)[0];
    referencia = String(item.resolucao).includes("=") ? valorNumerico(fim.split(/[.;](?:\s|$)|\s(?:portanto|logo)\b/i)[0]) : null;
  }
  // figura × resolução discordando: a questão é refeita (nunca o gabarito é trocado pela figura)
  if (daFigura && referencia != null && !mesmo(referencia, daFigura.valor)) {
    avisos.push(aviso(n, `a figura e a resolução não combinam: a ${daFigura.grandeza} da figura, calculada pelo sistema, é ${br(daFigura.valor)}, e a resolução chega a ${br(referencia)}; confira as medidas da figura.`));
    problemas.push(`a figura e a resolução não combinam: com as medidas da figura a ${daFigura.grandeza} é ${br(daFigura.valor)}, mas a resolução chega a ${br(referencia)}. Ajuste a FIGURA para as medidas do problema`);
  }
  if (daFigura && referencia == null) referencia = daFigura.valor; // resolução sem conta: a figura é a única fonte
  if (valores && referencia != null) {
    const batem = LETRAS.slice(0, valores.length).filter((l, i) => valores[i] != null && mesmo(valores[i], referencia));
    if (batem.length === 1 && batem[0] !== item.correta) {
      const antes = item.correta;
      item = { ...item, correta: batem[0] };
      avisos.push(aviso(n, `gabarito corrigido para ${rotuloAlt(item, batem[0])}: a conta da resolução dá ${br(referencia)}${antes ? ` (a IA tinha marcado ${rotuloAlt(item, antes)})` : ""}.`, "corrigido"));
    } else if (batem.length === 0 && LETRAS.some((l, i) => i < item.alternativas.length && contem(numerosDoTexto(item.alternativas[i]), referencia))) {
      // o valor aparece escrito numa alternativa (ex.: "26°C", "9/10 do bolo"): não apaga o gabarito; o professor confere
      avisos.push(aviso(n, `confira o gabarito: o resultado da resolução (${br(referencia)}) aparece numa alternativa, mas não foi possível comparar com segurança.`));
    } else if (batem.length === 0) {
      item = { ...item, correta: null, semGabarito: true };
      avisos.push(aviso(n, `nenhuma alternativa tem o resultado correto (${br(referencia)}); a questão ficou SEM GABARITO e precisa ser refeita ou corrigida antes de aplicar.`, "erro"));
      problemas.push(`o resultado correto é ${br(referencia)} e nenhuma alternativa tem esse valor`);
    }
  }
  if (!item.correta && !item.semGabarito) avisos.push(aviso(n, "está sem a letra correta no gabarito.", "erro"));

  // ----- explicações das alternativas erradas -----
  if (item.correta && item.distratores[item.correta]) {
    const distratores = { ...item.distratores };
    delete distratores[item.correta];
    item = { ...item, distratores };
  }
  if (item.correta && valores) item = remapearExplicacoes(item, n, avisos);
  if (item.correta) {
    // dados da questão (figura, texto e contas da resolução); o valor das alternativas NÃO conta como dado
    const dados = [...daFiguraNums(item), ...doTextoNums(item), ...operandos(item.resolucao), ...contasDoTexto(item.resolucao).contas.map((c) => c.calculado)];
    // números intermediários: soma e diferença de duas medidas (ex.: 3 + 3 = 6 no jardim em L, 8 − 3 = 5)
    const diretos = [...dados];
    const medidas = [...new Set([...daFiguraNums(item), ...doTextoNums(item)])].slice(0, 20);
    for (const a of medidas) for (const b of medidas) dados.push(a + b, Math.abs(a - b));
    // número de lados do quadrado (perímetro = 4 × lado) é dado da própria figura
    if (item.figura?.forma === "quadrado" || /quadrad/i.test(`${item.textoBase} ${item.comando}`)) dados.push(4);
    for (const l of LETRAS.slice(0, item.alternativas.length)) {
      if (l === item.correta) continue;
      const exp = item.distratores[l];
      if (!exp) {
        avisos.push(aviso(n, `falta explicar o erro que leva à alternativa ${rotuloAlt(item, l)}.`));
        problemas.push(`falta a explicação da alternativa ${rotuloAlt(item, l)}`);
        continue;
      }
      if (!valores) continue; // alternativas de texto: não há conta para conferir
      const v = valores[LETRAS.indexOf(l)];
      const contas = contasDoTexto(exp);
      for (const c of contas.erradas) {
        avisos.push(aviso(n, `a explicação da alternativa ${rotuloAlt(item, l)} tem conta errada: ${c.expressao} dá ${br(c.calculado)}, não ${br(c.escrito)}.`));
        problemas.push(`na explicação de ${rotuloAlt(item, l)}, ${c.expressao} dá ${br(c.calculado)}, não ${br(c.escrito)}`);
      }
      // explicação sem conta (erro conceitual ou de leitura) é aceita; com conta — com ou sem "=" —
      // ela tem de chegar ao valor da letra. Se não chega, a alternativa é SEMPRE refeita.
      const alcancado = valorAlcancado(exp);
      if (alcancado != null && v != null && !mesmo(alcancado, v)) {
        const outra = LETRAS.find((x, i) => x !== l && valores[i] != null && mesmo(valores[i], alcancado));
        const extra = outra ? ` (esse é o valor da alternativa ${rotuloAlt(item, outra)})` : "";
        avisos.push(aviso(n, `a explicação da alternativa ${rotuloAlt(item, l)} chega a ${br(alcancado)}, não ao valor dela (${br(v)})${extra}.`));
        problemas.push(`a explicação de ${rotuloAlt(item, l)} chega a ${br(alcancado)}${extra}, e não a ${br(v)}: refaça essa alternativa e a explicação dela`);
      }
      const inventados = [...new Set(operandos(exp))].filter((x) => !permitidoNoErro(x) && !contem(dados, x));
      for (const m of exp.matchAll(/\b(?:multiplic|divid|dividi)\w*(?:\s+\S+){0,4}?\s+por\s+(\d+(?:,\d+)?)/gi)) {
        const x = parseFloat(m[1].replace(",", "."));
        // "multiplicou por N": N tem de ser um número da própria questão (não um intermediário)
        if (!permitidoNoErro(x) && !contem(diretos, x)) inventados.push(x);
      }
      if (inventados.length) {
        avisos.push(aviso(n, `a explicação da alternativa ${rotuloAlt(item, l)} usa ${[...new Set(inventados)].map(br).join(", ")}, que não aparece na questão (erro inventado, não é erro típico de aluno).`));
        problemas.push(`a explicação de ${rotuloAlt(item, l)} usa ${[...new Set(inventados)].map(br).join(", ")}, que não está na questão: troque por um erro típico de aluno`);
      }
    }
  }
  return { item: { ...item, problemas }, avisos };
}

// A IA às vezes troca as letras das explicações: se uma explicação chega exatamente ao valor de
// OUTRA alternativa errada (que não tem explicação certa), ela passa para essa letra.
function remapearExplicacoes(item, n, avisos) {
  const valores = valoresDasAlternativas(item);
  const erradas = LETRAS.slice(0, item.alternativas.length).filter((l) => l !== item.correta);
  const alcance = Object.fromEntries(erradas.map((l) => [l, item.distratores[l] ? valorAlcancado(item.distratores[l]) : null]));
  const certa = (l) => alcance[l] != null && mesmo(alcance[l], valores[LETRAS.indexOf(l)]);
  const novos = { ...item.distratores };
  let mexeu = false;
  for (const l of erradas) {
    if (!item.distratores[l] || certa(l) || alcance[l] == null) continue;
    const destino = erradas.find((x) => x !== l && mesmo(valores[LETRAS.indexOf(x)], alcance[l]) && !certa(x));
    if (destino) {
      if (novos[destino] === item.distratores[destino]) delete novos[destino];
      novos[destino] = item.distratores[l];
      if (novos[l] === item.distratores[l]) delete novos[l];
      mexeu = true;
    }
  }
  if (!mexeu) return item;
  avisos.push(aviso(n, "explicações dos erros estavam nas letras trocadas e foram reorganizadas pela conta de cada uma.", "corrigido"));
  return { ...item, distratores: novos };
}

const daFiguraNums = (item) => (item.figura ? numerosDaFigura(item.figura) : []);
const doTextoNums = (item) => [...numerosDoTexto(item.textoBase), ...numerosDoTexto(item.comando)];

export function conferirAvaliacao(av = {}) {
  const avisos = [];
  const itens = lista(av.itens).map((it, i) => {
    const r = conferirItem(it, i + 1);
    avisos.push(...r.avisos);
    return r.item;
  });
  const comFigura = itens.filter((it) => it.figura).length;
  if (av.metaFiguras && comFigura < av.metaFiguras)
    avisos.push({ onde: "Suporte visual", motivo: `só ${comFigura} de ${itens.length} questões têm figura; o pedido era pelo menos ${av.metaFiguras}.`, tipo: "conferir", trecho: "" });
  if (itens.length >= 5) {
    const c = contarLetras(itens);
    const [letra, qtd] = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    if (qtd / itens.length > 0.5) avisos.push({ onde: "Gabarito", motivo: `${qtd} de ${itens.length} respostas são ${letra}; espalhe as respostas entre A, B, C e D.`, tipo: "conferir", trecho: "" });
  }
  return { avaliacao: { ...av, itens }, avisos };
}

// Questões que precisam ser refeitas pela IA (gabarito fora das alternativas, conta errada…)
export const itensParaRefazer = (av) => lista(av.itens).map((it, i) => (it.problemas?.length ? i : -1)).filter((i) => i >= 0);

// Pedido de 2ª tentativa só para as questões com problema
export function montarPromptRefazer(av, indices, d = {}) {
  const itens = indices.map((i) => {
    const it = av.itens[i];
    const { problemas, semGabarito, ...resto } = it;
    return { numero: i + 1, problemas, questao: { ...resto, habilidades: (it.habilidades || []).map((h) => h.codigo) } };
  });
  return `Algumas questões de uma avaliação (padrão Prova Paulista/SARESP) têm erros encontrados pela conferência automática.
Reescreva SÓ estas questões, corrigindo TODOS os problemas listados. Mantenha o tema, a habilidade, a dificuldade e o tipo de figura.
Componente: ${d.disciplina || ""}. Etapa: ${d.nivel || ""}${d.ano ? `, ${anoLegivel(d.ano)}` : ""}.

${JSON.stringify(itens, null, 1)}

Regras que a conferência cobra:
- Resolva a questão com contas explícitas ("10 × 5 = 50"); a alternativa marcada em "correta" TEM o valor final da resolução.
- Cada alternativa errada nasce de um ERRO TÍPICO de aluno com os MESMOS números da questão: somar em vez de multiplicar, calcular o perímetro em vez da área, esquecer de dividir por 2 a área do triângulo, esquecer uma parte da figura composta, não converter a unidade. Nada de multiplicar por um número que não está na questão.
- Em "distratores", cada explicação mostra a conta errada e termina EXATAMENTE no valor da sua alternativa (ex.: "Calculou o perímetro: 2 × (10 + 5) = 30"). Confira cada conta.
- Quando há figura, as medidas ficam SÓ na figura (não repita no texto-base). Figura composta usa { "tipo": "contorno", "unidade": "m", "pontos": [[x,y], ...], "cotas": [{ "de": [x,y], "ate": [x,y] }], "legenda": "nome curto" }.
- Se a figura e a resolução discordam, ajuste a FIGURA para as medidas do problema (o gabarito vem da resolução).
- Figura de contorno: todo lado com medida inteira ou com 1 casa decimal; lado inclinado sem medida exige uma cota (ex.: a altura do triângulo).
- Explicação de erro conceitual ou de leitura pode ser só uma frase; explicação com conta termina no valor da sua alternativa.
- 4 alternativas numéricas em ordem crescente, uma só correta.

Retorne JSON: { "itensRefeitos": [ { "numero": 4, ...questão completa no mesmo formato ("habilidades", "descritor", "dificuldade", "textoBase", "figura", "leituraFigura", "comando", "alternativas", "resolucao", "correta", "distratores") } ] }
OBRIGATÓRIO em cada questão: "distratores" é um OBJETO com as 3 letras ERRADAS, ex.: { "A": "Somou: 5 + 4 = 9.", "B": "...", "D": "..." }; a explicação de cada letra termina no valor DAQUELA alternativa. Nunca devolva "distratores" vazio.`;
}

// Última chance: questões NOVAS no lugar das que não passaram depois de 2 tentativas
export function montarPromptTrocar(av, indices, d = {}) {
  const pedidos = indices.map((i) => {
    const it = av.itens[i];
    return { numero: i + 1, habilidades: (it.habilidades || []).map((h) => h.codigo), descritor: it.descritor, dificuldade: it.dificuldade, motivoDaTroca: it.problemas };
  });
  return `Algumas questões de uma avaliação (padrão Prova Paulista/SARESP) não passaram na conferência depois de 2 correções.
Escreva questões NOVAS, DIFERENTES das anteriores, para estes lugares (mesma habilidade, descritor e dificuldade).
Componente: ${d.disciplina || ""}. Etapa: ${d.nivel || ""}${d.ano ? `, ${anoLegivel(d.ano)}` : ""}. Tema: ${d.tema || ""}.

${JSON.stringify(pedidos, null, 1)}

Prefira uma situação simples e segura: conta direta com números inteiros e, se usar figura, um retângulo, quadrado ou triângulo retângulo ("poligono") ou um gráfico, em vez de figura composta.
Regras: resolução com contas explícitas; "correta" com o valor final da resolução; 4 alternativas numéricas em ordem crescente e com unidade; cada explicação de erro com os números da questão terminando no valor da sua alternativa; medidas só na figura.

Retorne JSON: { "itensRefeitos": [ { "numero": 4, ...questão completa ("habilidades", "descritor", "dificuldade", "textoBase", "figura", "leituraFigura", "comando", "alternativas", "resolucao", "correta", "distratores") } ] }
OBRIGATÓRIO: "distratores" é um OBJETO com as 3 letras ERRADAS ({ "A": "...", "B": "...", "D": "..." }), cada explicação terminando no valor da sua alternativa.`;
}

// O que não passou depois de todas as tentativas NÃO é entregue: sai da prova
export function retirarComProblema(av) {
  const retiradas = [];
  const itens = av.itens.filter((it, i) => {
    if (it.problemas?.length || it.semGabarito) {
      retiradas.push({ numero: i + 1, motivo: (it.problemas || [])[0] || "sem gabarito", problemas: it.problemas || [], questao: { textoBase: it.textoBase, comando: it.comando, figura: it.figura, alternativas: it.alternativas, correta: it.correta, resolucao: it.resolucao, distratores: it.distratores, refeita: !!it.refeita } });
      return false;
    }
    return true;
  });
  return { avaliacao: { ...av, itens }, retiradas };
}

// ---------- Reparo pelo próprio sistema (sem IA) ----------
// Quando só as alternativas erradas/explicações estão ruins (número inventado, conta que não
// chega ao valor, explicação faltando), o sistema troca essas alternativas por ERROS TÍPICOS
// calculados com as medidas da questão: somar as medidas, perímetro no lugar da área,
// esquecer de dividir por 2, usar só duas dimensões etc. A conta é feita pelo sistema.
const ehProblemaDeDistrator = (p) => /^(a explicação de|na explicação de|falta a explicação)/.test(p);
const fmtConta = (v) => br(v);

function medidasDoItem(item) {
  const f = item.figura;
  if (f?.tipo === "bloco") return { tipo: "bloco", m: [f.comprimento, f.largura, f.altura] };
  if (f?.tipo === "poligono") return f.forma === "quadrado" ? { tipo: "quadrado", m: [f.lado] } : { tipo: f.forma, m: [f.base, f.altura] };
  const t = `${item.textoBase} ${item.comando}`.toLowerCase();
  const nums = numerosDoTexto(item.textoBase).filter((x) => x > 0 && x < 10000).slice(0, 3);
  if (/quadrad/.test(t) && nums.length === 1) return { tipo: "quadrado", m: nums };
  if (/tri[aâ]ngul/.test(t) && nums.length === 2) return { tipo: "triangulo", m: nums };
  if (/(ret[aâ]ngul|retangular)/.test(t) && nums.length === 2) return { tipo: "retangulo", m: nums };
  if (/(bloco|caixa|paralelep[ií]pedo|tanque|aqu[aá]rio|piscina)/.test(t) && nums.length === 3) return { tipo: "bloco", m: nums };
  return null;
}

export function errosTipicos(item) {
  const md = medidasDoItem(item);
  if (!md) return [];
  const pergunta = item.comando.toLowerCase();
  const [a, b, c] = md.m;
  const e = [];
  const add = (v, txt) => Number.isFinite(v) && v > 0 && e.push({ v: Math.round(v * 1000) / 1000, txt });
  if (/(^|[^a-zà-ú])[áa]rea([^a-zà-ú]|$)/.test(pergunta)) {
    if (md.tipo === "quadrado") {
      add(a + a, `Somou dois lados: ${fmtConta(a)} + ${fmtConta(a)} = ${fmtConta(a + a)}.`);
      add(4 * a, `Calculou o perímetro: 4 × ${fmtConta(a)} = ${fmtConta(4 * a)}.`);
      add(2 * a * a, `Dobrou a área: 2 × ${fmtConta(a)} × ${fmtConta(a)} = ${fmtConta(2 * a * a)}.`);
      add((a * a) / 2, `Dividiu por 2, como se fosse um triângulo: ${fmtConta(a)} × ${fmtConta(a)} ÷ 2 = ${fmtConta((a * a) / 2)}.`);
    } else if (md.tipo === "triangulo") {
      add(a * b, `Esqueceu de dividir por 2: ${fmtConta(a)} × ${fmtConta(b)} = ${fmtConta(a * b)}.`);
      add(a + b, `Somou base e altura: ${fmtConta(a)} + ${fmtConta(b)} = ${fmtConta(a + b)}.`);
      add(2 * (a + b), `Calculou 2 × (${fmtConta(a)} + ${fmtConta(b)}) = ${fmtConta(2 * (a + b))}, como o perímetro de um retângulo.`);
      add(a * b * 2, `Multiplicou por 2 em vez de dividir: ${fmtConta(a)} × ${fmtConta(b)} × 2 = ${fmtConta(a * b * 2)}.`);
    } else if (md.tipo === "retangulo") {
      add(a + b, `Somou as medidas: ${fmtConta(a)} + ${fmtConta(b)} = ${fmtConta(a + b)}.`);
      add(2 * (a + b), `Calculou o perímetro: 2 × (${fmtConta(a)} + ${fmtConta(b)}) = ${fmtConta(2 * (a + b))}.`);
      add((a * b) / 2, `Dividiu por 2, como se fosse um triângulo: ${fmtConta(a)} × ${fmtConta(b)} ÷ 2 = ${fmtConta((a * b) / 2)}.`);
      const M = Math.max(a, b);
      add(M * M, `Multiplicou a maior medida por ela mesma: ${fmtConta(M)} × ${fmtConta(M)} = ${fmtConta(M * M)}.`);
    }
  } else if (/per[ií]metro|cerca|moldura|contorno|rodap/.test(pergunta) && md.tipo !== "bloco") {
    if (md.tipo === "quadrado") {
      add(a * a, `Calculou a área: ${fmtConta(a)} × ${fmtConta(a)} = ${fmtConta(a * a)}.`);
      add(2 * a, `Somou só dois lados: ${fmtConta(a)} + ${fmtConta(a)} = ${fmtConta(2 * a)}.`);
      add(3 * a, `Esqueceu um lado: ${fmtConta(a)} + ${fmtConta(a)} + ${fmtConta(a)} = ${fmtConta(3 * a)}.`);
    } else if (md.tipo === "retangulo") {
      add(a * b, `Calculou a área: ${fmtConta(a)} × ${fmtConta(b)} = ${fmtConta(a * b)}.`);
      add(a + b, `Somou só dois lados: ${fmtConta(a)} + ${fmtConta(b)} = ${fmtConta(a + b)}.`);
      add(2 * a + b, `Esqueceu um lado: ${fmtConta(a)} + ${fmtConta(a)} + ${fmtConta(b)} = ${fmtConta(2 * a + b)}.`);
    }
  } else if (/volume|cabe|capacidade/.test(pergunta) && md.tipo === "bloco" && c != null) {
    add(a * b, `Usou só duas medidas: ${fmtConta(a)} × ${fmtConta(b)} = ${fmtConta(a * b)}.`);
    add(a + b + c, `Somou as medidas: ${fmtConta(a)} + ${fmtConta(b)} + ${fmtConta(c)} = ${fmtConta(a + b + c)}.`);
    add(a * b + c, `Multiplicou duas medidas e somou a terceira: ${fmtConta(a)} × ${fmtConta(b)} + ${fmtConta(c)} = ${fmtConta(a * b + c)}.`);
    add(2 * (a * b + a * c + b * c), `Calculou a área de todas as faces: 2 × (${fmtConta(a)} × ${fmtConta(b)} + ${fmtConta(a)} × ${fmtConta(c)} + ${fmtConta(b)} × ${fmtConta(c)}) = ${fmtConta(2 * (a * b + a * c + b * c))}.`);
  }
  return e;
}

export function repararDistratores(item) {
  if (!item.correta || !item.problemas?.length || !item.problemas.every(ehProblemaDeDistrator)) return null;
  const valores = valoresDasAlternativas(item);
  if (!valores) return null;
  const iC = LETRAS.indexOf(item.correta);
  const V = valores[iC];
  const unidade = unidadeDaAlternativa(item.alternativas[iC]);
  // letras com problema: as citadas nos problemas
  const ruins = new Set(LETRAS.slice(0, item.alternativas.length).filter((l, i) => l !== item.correta && item.problemas.some((p) => p.includes(`"${item.alternativas[i]}"`))));
  if (!ruins.size) return null;
  const mantidos = valores.filter((v, i) => !ruins.has(LETRAS[i]));
  const candidatos = errosTipicos(item).filter((e) => !mesmo(e.v, V) && !mantidos.some((m) => mesmo(m, e.v)));
  const usados = [];
  for (const e of candidatos) if (usados.length < ruins.size && !usados.some((u) => mesmo(u.v, e.v))) usados.push(e);
  if (usados.length < ruins.size) return null; // não há erros típicos suficientes: fica para a IA
  const alternativas = [...item.alternativas];
  const distratores = { ...item.distratores };
  [...ruins].forEach((l, k) => {
    const i = LETRAS.indexOf(l);
    alternativas[i] = unidade === "R$" ? `R$ ${br(usados[k].v)}` : `${br(usados[k].v)}${unidade ? ` ${unidade}` : ""}`;
    distratores[l] = usados[k].txt;
  });
  return ordenarNumericas({ ...item, alternativas, distratores, reparada: true });
}

// Aplica o reparo às questões que só têm problema de alternativa errada; confere de novo
export function repararAvaliacao(av) {
  const reparadas = [];
  const itens = av.itens.map((it, i) => {
    const r = repararDistratores(it);
    if (!r) return it;
    const novo = conferirItem({ ...r, problemas: undefined }, i + 1).item;
    if ((novo.problemas || []).length < it.problemas.length) {
      reparadas.push(i + 1);
      return novo;
    }
    return it;
  });
  return { avaliacao: { ...av, itens }, reparadas };
}

// Junta a 2ª tentativa: a questão refeita só entra se ficou melhor (menos problemas, e com gabarito)
export function aplicarRefeitos(av, json = {}, resolverHabilidade = () => null, oficial = null) {
  const refeitos = lista(json?.itensRefeitos);
  const trocados = [];
  const itens = av.itens.map((velho, i) => {
    const novoBruto = refeitos.find((r) => Number(r?.numero) === i + 1);
    if (!novoBruto || !velho.problemas?.length) return velho;
    const novo = conferirItem(ordenarNumericas(normalizarItem(unificarNomes(novoBruto), resolverHabilidade, oficial)), i + 1).item;
    const pior = (x) => (x.semGabarito ? 100 : 0) + (x.problemas?.length || 0);
    if (pior(novo) < pior(velho)) {
      trocados.push(i + 1);
      return { ...novo, dificuldade: nivelCoerente(velho.dificuldade, novo.resolucao).dificuldade, refeita: true };
    }
    return velho;
  });
  return { avaliacao: { ...av, itens }, trocados };
}

// Passo final: espalha o gabarito (depois das correções) e confere de novo para os avisos
export function finalizarAvaliacao(av) {
  const eq = equilibrarGabarito(av.itens);
  const r = conferirAvaliacao({ ...av, itens: eq.itens });
  return { avaliacao: { ...r.avaliacao, gabaritoEquilibrado: eq.mexeu }, avisos: r.avisos };
}

// Mapa habilidade → itens (versão do professor)
export function mapaHabilidades(itens = []) {
  const m = new Map();
  itens.forEach((it, i) => {
    const lista = (it.habilidades?.length ? it.habilidades : [it.habilidade]).map((h) => h?.codigo || "—");
    for (const c of lista) {
      if (!m.has(c)) m.set(c, { codigo: c, itens: [], descritores: [] });
      const e = m.get(c);
      e.itens.push(i + 1);
      if (it.descritor && !e.descritores.includes(it.descritor)) e.descritores.push(it.descritor);
    }
  });
  return [...m.values()];
}

// Texto de uma apostila do EduGera para servir de base (sem dados do professor nem gabarito)
export function resumoParaAvaliacao(registro = {}) {
  const m = registro.material || {};
  const f = registro.form || {};
  const l = [];
  l.push(`Título: ${m.tituloDidatico || f.tema || ""}`);
  if (f.tema) l.push(`Tema: ${f.tema}`);
  if (m.bncc?.codigo) l.push(`Habilidade: ${m.bncc.codigo}${m.bncc.texto ? ` — ${m.bncc.texto}` : ""}`);
  if (m.resumoPedagogico) l.push(`Resumo: ${m.resumoPedagogico}`);
  for (const c of lista(m.conceitos).slice(0, 8)) if (c?.termo && c.termo !== "—") l.push(`Conceito: ${c.termo} — ${c.definicao || ""}`);
  for (const fo of lista(m.formulas).slice(0, 6)) l.push(`Regra: ${fo?.nome || ""} ${fo?.expressao || ""}`.trim());
  lista(m.exercicios).slice(0, 10).forEach((e, i) => e?.enunciado && l.push(`Exercício trabalhado ${i + 1}: ${e.enunciado}`));
  return l.join("\n").slice(0, 8000);
}

export function adicionarAvaliacaoNaLista(listaAtual = [], avaliacao, origem = null) {
  const item = { id: `av-${Date.now().toString(36)}`, criadoEm: new Date().toISOString(), origem, avaliacao };
  return [item, ...(Array.isArray(listaAtual) ? listaAtual : [])].slice(0, LIMITE_AVALIACOES_SALVAS);
}
