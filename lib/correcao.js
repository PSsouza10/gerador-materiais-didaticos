// Correção da avaliação pela turma: respostas de cada aluno → nota, acerto por questão,
// por habilidade/descritor, erro mais comum (com a explicação do distrator) e o que reforçar.
// Tudo calculado aqui, sem IA. Os dados dos alunos ficam só no navegador do professor.

export const LETRAS_CARTAO = ["A", "B", "C", "D"];
export const BRANCO = "-"; // questão sem marcação
export const DUPLA = "*"; // duas ou mais bolinhas pintadas (conta como erro)

// Faixas do relatório (mesma lógica das devolutivas da Prova Paulista: adequado / atenção / reforçar)
export const FAIXAS = [
  { id: "adequado", rotulo: "Adequado", min: 70 },
  { id: "atencao", rotulo: "Atenção", min: 50 },
  { id: "reforcar", rotulo: "Reforçar", min: 0 },
];
export const faixaDe = (pct) => FAIXAS.find((f) => pct >= f.min) || FAIXAS[FAIXAS.length - 1];

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const umaCasa = (v) => Math.round(v * 10) / 10;

// "a b c d", "ABCD", "1A 2B 3-", "A,B,,D" → ["A","B","C","D"] (só as n primeiras)
export function lerRespostasTexto(texto = "", n = 0) {
  const t = String(texto).toUpperCase();
  let marcas;
  if (/\d+\s*[-–:.)]?\s*[A-D*-]/.test(t) && /\d/.test(t)) {
    // formato numerado: "1A 2B 3- 4*"
    marcas = Array(n).fill(BRANCO);
    for (const m of t.matchAll(/(\d+)\s*[-–:.)]?\s*([A-D*]|-(?=\s|$|,))/g)) {
      const i = Number(m[1]) - 1;
      if (i >= 0 && i < n) marcas[i] = m[2] === "-" ? BRANCO : m[2];
    }
    return marcas;
  }
  if (/[,;]/.test(t)) marcas = t.split(/[,;]/).map((x) => x.trim().slice(0, 1) || BRANCO);
  else marcas = t.replace(/[^A-D*\-_. ]/g, "").replace(/\s+/g, "").split("");
  marcas = marcas.map((x) => (LETRAS_CARTAO.includes(x) || x === DUPLA ? x : BRANCO));
  return Array.from({ length: n }, (_, i) => marcas[i] || BRANCO);
}

export const respostasParaTexto = (r = []) => r.map((x) => x || BRANCO).join("");

// Correção de um aluno
export function corrigirAluno(avaliacao, respostas = []) {
  const itens = avaliacao?.itens || [];
  const porItem = itens.map((it, i) => {
    const marcada = respostas[i] || BRANCO;
    return { n: i + 1, marcada, correta: it.correta || null, certo: !!it.correta && marcada === it.correta };
  });
  const validos = porItem.filter((p) => p.correta);
  const acertos = validos.filter((p) => p.certo).length;
  return { porItem, acertos, total: validos.length, nota: validos.length ? umaCasa((acertos / validos.length) * 10) : 0, percentual: pct(acertos, validos.length) };
}

const codigosDo = (it) => {
  const l = (it.habilidades?.length ? it.habilidades : [it.habilidade]).map((h) => (typeof h === "string" ? h : h?.codigo)).filter(Boolean);
  return l.length ? l : ["—"];
};

// Relatório da turma
export function relatorioTurma(avaliacao, alunos = []) {
  const itens = avaliacao?.itens || [];
  const corrigidos = alunos.map((a) => ({ ...a, ...corrigirAluno(avaliacao, a.respostas) }));
  const n = corrigidos.length;

  const porQuestao = itens.map((it, i) => {
    const dist = { A: 0, B: 0, C: 0, D: 0, [BRANCO]: 0, [DUPLA]: 0 };
    corrigidos.forEach((a) => (dist[a.porItem[i].marcada] = (dist[a.porItem[i].marcada] || 0) + 1));
    const acertos = it.correta ? dist[it.correta] || 0 : 0;
    const erradas = LETRAS_CARTAO.filter((l) => l !== it.correta && dist[l] > 0).sort((x, y) => dist[y] - dist[x]);
    const comum = erradas[0] || null;
    return {
      n: i + 1,
      comando: it.comando,
      correta: it.correta || null,
      habilidades: codigosDo(it),
      descritor: it.descritor || "",
      acertos,
      percentual: pct(acertos, n),
      faixa: faixaDe(pct(acertos, n)).id,
      distribuicao: dist,
      erroMaisComum: comum ? { letra: comum, alunos: dist[comum], percentual: pct(dist[comum], n), explicacao: it.distratores?.[comum] || "" } : null,
    };
  });

  // por habilidade: soma os acertos de todos os itens dela
  const mapa = new Map();
  porQuestao.forEach((q, i) => {
    for (const c of q.habilidades) {
      if (!mapa.has(c)) mapa.set(c, { codigo: c, itens: [], descritores: [], acertos: 0, respostas: 0 });
      const h = mapa.get(c);
      h.itens.push(q.n);
      if (q.descritor && !h.descritores.includes(q.descritor)) h.descritores.push(q.descritor);
      if (itens[i].correta) {
        h.acertos += q.acertos;
        h.respostas += n;
      }
    }
  });
  const porHabilidade = [...mapa.values()]
    .map((h) => ({ ...h, percentual: pct(h.acertos, h.respostas), faixa: faixaDe(pct(h.acertos, h.respostas)).id }))
    .sort((a, b) => a.percentual - b.percentual);

  // por aluno: habilidades em que ele errou mais da metade dos itens
  const porAluno = corrigidos
    .map((a) => {
      const reforcar = porHabilidade
        .filter((h) => {
          const its = h.itens.filter((k) => itens[k - 1]?.correta);
          const certos = its.filter((k) => a.porItem[k - 1].certo).length;
          return its.length && certos / its.length < 0.5;
        })
        .map((h) => h.codigo);
      return { id: a.id, nome: a.nome, numero: a.numero, respostas: a.respostas, acertos: a.acertos, total: a.total, nota: a.nota, percentual: a.percentual, porItem: a.porItem, reforcar };
    })
    .sort((x, y) => (Number(x.numero) || 999) - (Number(y.numero) || 999) || String(x.nome).localeCompare(String(y.nome)));

  const notas = corrigidos.map((a) => a.nota);
  const media = n ? umaCasa(notas.reduce((s, v) => s + v, 0) / n) : 0;
  const faixasAlunos = Object.fromEntries(FAIXAS.map((f) => [f.id, corrigidos.filter((a) => faixaDe(a.percentual).id === f.id).length]));

  // o que fazer: habilidades abaixo de 70%, da pior para a melhor, com o erro mais comum
  const sugestoes = porHabilidade
    .filter((h) => h.faixa !== "adequado" && h.codigo !== "—")
    .map((h) => {
      const qs = porQuestao.filter((q) => h.itens.includes(q.n)).sort((a, b) => a.percentual - b.percentual);
      const pior = qs[0];
      return {
        codigo: h.codigo,
        faixa: h.faixa,
        percentual: h.percentual,
        descritor: h.descritores[0] || "",
        questao: pior?.n || null,
        erro: pior?.erroMaisComum?.explicacao ? `${pior.erroMaisComum.percentual}% marcaram ${pior.erroMaisComum.letra}: ${pior.erroMaisComum.explicacao}` : "",
        alunos: porAluno.filter((a) => a.reforcar.includes(h.codigo)).map((a) => a.nome || `Nº ${a.numero}`),
      };
    });

  return { alunos: n, media, faixasAlunos, porQuestao, porHabilidade, porAluno, sugestoes };
}

// Planilha (CSV com ; para abrir direto no Excel em português)
export function relatorioCsv(avaliacao, rel) {
  const q = (avaliacao?.itens || []).length;
  const esc = (v) => {
    const s = String(v ?? "");
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linhas = [
    ["Nº", "Nome", ...Array.from({ length: q }, (_, i) => `Q${i + 1}`), "Acertos", "Nota", "Reforçar"],
    ["", "Gabarito", ...(avaliacao?.itens || []).map((it) => it.correta || ""), "", "", ""],
    ...rel.porAluno.map((a) => [a.numero || "", a.nome || "", ...a.porItem.map((p) => p.marcada), `${a.acertos}/${a.total}`, String(a.nota).replace(".", ","), a.reforcar.join(" ")]),
    [],
    ["Questão", "Habilidade", "Descritor", "% acerto", "Erro mais comum"],
    ...rel.porQuestao.map((x) => [x.n, x.habilidades.join(" "), x.descritor, `${x.percentual}%`, x.erroMaisComum ? `${x.erroMaisComum.letra} (${x.erroMaisComum.percentual}%)` : ""]),
  ];
  return "﻿" + linhas.map((l) => l.map(esc).join(";")).join("\r\n");
}

// ---------- Leitura da foto do cartão-resposta (IA de visão) ----------
export function montarPromptLeituraCartao(n) {
  return `A imagem é a FOTO de um cartão-resposta de prova com ${n} questões (numeradas de 01 a ${String(n).padStart(2, "0")}) e as alternativas A, B, C e D em bolinhas.
Leia QUAL bolinha está pintada em cada questão.
- Uma bolinha pintada: a letra dela.
- Nenhuma pintada: null.
- Duas ou mais pintadas, ou rasura em que não dá para saber: "*".
- Na dúvida, prefira "?" para a questão (o professor confere).
Leia também o número de chamada ("Nº") se estiver escrito. Não precisa ler o nome.
Responda só com JSON: {"respostas": ["A", "C", null, "*", ...], "numero": "12", "legivel": true, "observacao": ""}
"respostas" tem exatamente ${n} posições, na ordem das questões. Se a foto não for de um cartão-resposta ou estiver ilegível, "legivel": false.`;
}

export function normalizarLeitura(json = {}, n = 0) {
  const bruto = Array.isArray(json?.respostas) ? json.respostas : [];
  const respostas = Array.from({ length: n }, (_, i) => {
    const v = bruto[i];
    if (v == null || v === "") return BRANCO;
    const s = String(v).trim().toUpperCase();
    if (LETRAS_CARTAO.includes(s)) return s;
    if (s === "*") return DUPLA;
    return "?";
  });
  return {
    respostas,
    duvidas: respostas.map((r, i) => (r === "?" ? i + 1 : null)).filter(Boolean),
    numero: json?.numero != null ? String(json.numero).replace(/\D/g, "").slice(0, 3) : "",
    legivel: json?.legivel !== false && bruto.length > 0,
    observacao: String(json?.observacao || "").slice(0, 200),
  };
}
