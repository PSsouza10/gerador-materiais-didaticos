// Plano de aula em Word (.docx), montado no navegador (a biblioteca só carrega quando o professor clica)
// Converte a ilustração (webp/png) em PNG no navegador, porque o Word não lê webp
async function ilustracaoPng(url) {
  try {
    const r = await fetch(url, { cache: "force-cache" });
    if (!r.ok) return null;
    const bmp = await createImageBitmap(await r.blob());
    const largura = Math.min(1000, bmp.width);
    const altura = Math.round((bmp.height * largura) / bmp.width);
    const c = document.createElement("canvas");
    c.width = largura;
    c.height = altura;
    c.getContext("2d").drawImage(bmp, 0, 0, largura, altura);
    const png = await new Promise((ok) => c.toBlob(ok, "image/png"));
    return png ? { dados: new Uint8Array(await png.arrayBuffer()), largura, altura } : null;
  } catch {
    return null; // sem a imagem, o Word sai só com o texto
  }
}

export async function planoParaDocx(pl) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun } = await import("docx");
  const img = pl.ilustracao ? await ilustracaoPng(pl.ilustracao) : null;
  const i = pl.identificacao;
  const p = (texto, opc = {}) => new Paragraph({ children: [new TextRun({ text: String(texto || ""), ...opc })], spacing: { after: 80 } });
  const titulo = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } });
  const itens = (xs) => (xs || []).map((x) => new Paragraph({ text: String(x), bullet: { level: 0 } }));
  const rotulado = (r, v) => new Paragraph({ children: [new TextRun({ text: `${r}: `, bold: true }), new TextRun(String(v || ""))], spacing: { after: 80 } });
  const linhas = [["Professor(a)", i.professor], ["Escola", i.escola], ["Turma", i.turma], ["Componente curricular", i.componente], ["Etapa / ano", i.etapa], ["Período", i.periodo], ["Número de aulas", String(i.aulas)], ["Tema", i.tema]].filter(([, v]) => v);
  const tabela = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: linhas.map(([r, v]) => new TableRow({ children: [new TableCell({ width: { size: 32, type: WidthType.PERCENTAGE }, children: [p(r, { bold: true })] }), new TableCell({ children: [p(v)] })] })),
  });
  const filhos = [
    new Paragraph({ text: "PLANO DE AULA", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
    ...(img
      ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: "png", data: img.dados, transformation: { width: 420, height: Math.round((img.altura * 420) / img.largura) } })], spacing: { after: 120 } })]
      : []),
    tabela,
    titulo("Unidade temática"), p(pl.unidadeTematica),
    titulo("Objeto de conhecimento"), p(pl.objetoConhecimento),
    titulo("Habilidade(s)"), ...itens(pl.habilidades.map((h) => [h.codigo, h.descricao].filter(Boolean).join(" — "))),
    titulo("Objetivos"), ...itens(pl.objetivos),
    titulo("Desenvolvimento"),
    ...pl.aulas.flatMap((a) => [
      new Paragraph({ children: [new TextRun({ text: `Aula ${a.numero}${a.titulo ? ` — ${a.titulo}` : ""}`, bold: true })], spacing: { before: 120, after: 60 } }),
      rotulado("Introdução", a.introducao),
      rotulado("Desenvolvimento", a.desenvolvimento),
      rotulado("Fechamento", a.fechamento),
    ]),
    titulo("Recursos"), ...itens(pl.recursos),
    titulo("Avaliação"), p("Critérios:", { bold: true }), ...itens(pl.avaliacao.criterios), p("Instrumentos:", { bold: true }), ...itens(pl.avaliacao.instrumentos),
    titulo("Recuperação contínua"), p(pl.recuperacao),
    titulo("Adaptações / inclusão"), p(pl.adaptacoes),
    p("Plano gerado com apoio de IA no EduGera — revise antes de entregar.", { italics: true, size: 18 }),
  ];
  const doc = new Document({ sections: [{ children: filhos }] });
  return Packer.toBlob(doc);
}
