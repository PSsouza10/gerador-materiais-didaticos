// Plano de aula em Word (.docx), montado no navegador (a biblioteca só carrega quando o professor clica)
export async function planoParaDocx(pl) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } = await import("docx");
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
