// Ciclo de Recomposição: regras puras (lib/ciclo.js) e banco (lib/cadernos.js, PGlite)
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { definirClienteTeste } from "../lib/banco.js";
import { listarMigracoes, lerInstrucoes } from "../lib/migracoes.js";
import * as Ciclo from "../lib/ciclo.js";
import * as Cad from "../lib/cadernos.js";
import { relatorioTurma } from "../lib/correcao.js";

const db = new PGlite();
before(async () => {
  for (const m of listarMigracoes(new URL("../db/migracoes", import.meta.url).pathname)) for (const i of lerInstrucoes(m.up)) await db.query(i);
  definirClienteTeste({
    consultar: async (t, p = []) => (await db.query(t, p)).rows,
    transacao: (lista) =>
      db.transaction(async (tx) => {
        const r = [];
        for (const [t, p = []] of lista) r.push((await tx.query(t, p)).rows);
        return r;
      }),
  });
});

// prova com 3 habilidades: H1 (q1,q2), H2 (q3,q4), H3 (q5,q6)
const item = (hab, correta, descritor) => ({ comando: `Questão ${hab} ${descritor}`, correta, habilidades: [{ codigo: hab }], descritor, alternativas: { A: "1", B: "2", C: "3", D: "4" }, distratores: { A: "erro A", B: "erro B", C: "erro C", D: "erro D" } });
const AV = {
  titulo: "Diagnóstico 7º ano",
  identificacao: { componente: "Matemática", etapa: "7º ano" },
  pedido: { disciplina: "Matemática", nivel: "Ensino Fundamental", ano: "7", tema: "números" },
  itens: [item("EF07MA01", "A", "D1"), item("EF07MA01", "B", "D2"), item("EF07MA02", "C", "D3"), item("EF07MA02", "D", "D4"), item("EF07MA03", "A", "D5"), item("EF07MA03", "B", "D6")],
};
// turma de n alunos em que cada aluno responde `respostas`
const turma = (n, respostas) => Array.from({ length: n }, (_, k) => ({ id: `a${k}`, nome: `Aluno ${k}`, numero: String(k + 1), respostas }));

test("contagem da turma não leva nome e soma o número de alunos", () => {
  const c = Ciclo.contagensDaTurma(AV, turma(6, ["A", "B", "A", "A", "-", "*"]));
  assert.equal(c.length, 6);
  assert.deepEqual(c[0], { A: 6, B: 0, C: 0, D: 0, "-": 0, "*": 0 });
  assert.deepEqual(c[4], { A: 0, B: 0, C: 0, D: 0, "-": 6, "*": 0 });
  assert.ok(!JSON.stringify(c).includes("Aluno"));
});

test("envio: escola da lista, contagem coerente e sem campos estranhos", () => {
  const caderno = { avaliacao: AV, escolas: ["EE Alfa", "EE Beta"] };
  const contagens = Ciclo.contagensDaTurma(AV, turma(5, ["A", "B", "C", "D", "A", "B"]));
  const ok = Ciclo.validarEnvio(caderno, { escola: "ee alfa", turma: "7º A", alunos: 5, contagens });
  assert.equal(ok.ok, true);
  assert.equal(ok.dados.escola, "EE Alfa");
  assert.equal(Ciclo.validarEnvio(caderno, { escola: "Outra", turma: "7A", alunos: 5, contagens }).ok, false);
  assert.equal(Ciclo.validarEnvio(caderno, { escola: "EE Alfa", turma: "7A", alunos: 6, contagens }).ok, false, "soma diferente do nº de alunos");
  const comNome = contagens.map((q, i) => (i === 0 ? { ...q, nome: "Ana" } : q));
  assert.equal(Ciclo.validarEnvio(caderno, { escola: "EE Alfa", turma: "7A", alunos: 5, contagens: comNome }).ok, false, "campo extra recusado");
});

test("painel: agrega por escola e habilidade e esconde escola com menos de 5 alunos", () => {
  const r1 = { escola: "EE Alfa", turma: "7A", alunos: 10, contagens: Ciclo.contagensDaTurma(AV, turma(10, ["A", "B", "A", "A", "A", "B"])) }; // H1 100, H2 0, H3 100
  const r2 = { escola: "EE Beta", turma: "7B", alunos: 3, contagens: Ciclo.contagensDaTurma(AV, turma(3, ["A", "A", "C", "D", "A", "B"])) };
  const ag = Ciclo.agregar(AV, [r1, r2]);
  assert.equal(ag.porHabilidade, true);
  assert.equal(ag.rede.alunos, 13);
  assert.equal(ag.escolas.find((e) => e.escola === "EE Alfa").grupos.EF07MA02.percentual, 0);
  assert.equal(ag.escolas.find((e) => e.escola === "EE Beta").visivel, false);
  assert.equal(ag.escolas.find((e) => e.escola === "EE Beta").grupos.EF07MA01, null);
  // rede: H2 = (0 + 3*2)/(13*2) = 23%
  assert.equal(ag.rede.grupos.EF07MA02.percentual, 23);
  const fracos = Ciclo.gruposMaisFracos(ag);
  assert.equal(fracos[0].chave, "EF07MA02");
});

test("prova de uma habilidade só agrupa por descritor", () => {
  const av = { ...AV, itens: AV.itens.map((it) => ({ ...it, habilidades: [{ codigo: "EF07MA01" }] })) };
  const g = Ciclo.gruposDaAvaliacao(av);
  assert.equal(g.porHabilidade, false);
  assert.deepEqual(g.grupos.map((x) => x.chave), ["D1", "D2", "D3", "D4", "D5", "D6"]);
});

test("reavaliação: só grupos abaixo de 70%, repetindo a origem até 6 vagas", () => {
  const r = { escola: "EE Alfa", turma: "7A", alunos: 10, contagens: Ciclo.contagensDaTurma(AV, turma(10, ["A", "C", "A", "A", "C", "B"])) }; // H1 50, H2 0, H3 50
  const ag = Ciclo.agregar(AV, [r]);
  assert.deepEqual(Ciclo.itensParaReavaliacao(AV, ag), [2, 3, 0, 1, 4, 5]);
  const ag2 = Ciclo.agregar(AV, [{ ...r, contagens: Ciclo.contagensDaTurma(AV, turma(10, ["A", "B", "A", "A", "A", "B"])) }]); // só H2 fraco
  assert.deepEqual(Ciclo.itensParaReavaliacao(AV, ag2), [2, 3, 2, 3, 2, 3]);
  const tudoBem = Ciclo.agregar(AV, [{ ...r, contagens: Ciclo.contagensDaTurma(AV, turma(10, ["A", "B", "C", "D", "A", "B"])) }]);
  assert.equal(Ciclo.itensParaReavaliacao(AV, tudoBem).length, 6, "sem grupo fraco: usa o mais fraco");
});

test("antes × depois compara o mesmo grupo nas questões de origem", () => {
  const antes = [{ escola: "EE Alfa", turma: "7A", alunos: 10, contagens: Ciclo.contagensDaTurma(AV, turma(10, ["A", "B", "A", "A", "A", "B"])) }]; // H2 = 0%
  const novos = [
    { origem: 2, item: { ...item("EF07MA02", "B", "D3"), comando: "nova 3" } },
    { origem: 3, item: { ...item("EF07MA02", "C", "D4"), comando: "nova 4" } },
  ];
  const reav = Ciclo.montarReavaliacao(AV, novos);
  assert.deepEqual(reav.itens.map((i) => i.origem), [2, 3]);
  const depois = [{ escola: "EE Alfa", turma: "7A", alunos: 10, contagens: Ciclo.contagensDaTurma(reav, turma(10, ["B", "A"])) }]; // 50%
  const cmp = Ciclo.compararAntesDepois(AV, antes, reav, depois);
  assert.equal(cmp.grupos.length, 1);
  assert.deepEqual(cmp.grupos[0].rede, { antes: 0, depois: 50, diferenca: 50 });
  assert.equal(cmp.grupos[0].escolas[0].diferenca, 50);
});

test("recomposição da turma: 2–3 habilidades mais fracas, ou descritores numa prova de habilidade única", () => {
  const rel = relatorioTurma(AV, turma(6, ["A", "B", "A", "A", "C", "C"])); // H2 0, H3 0, H1 100
  const r = Ciclo.recomposicaoDaTurma(rel);
  assert.deepEqual(r.map((x) => x.habilidade).sort(), ["EF07MA02", "EF07MA03"]);
  const unica = { ...AV, itens: AV.itens.map((it) => ({ ...it, habilidades: [{ codigo: "EF07MA01" }] })) };
  const r2 = Ciclo.recomposicaoDaTurma(relatorioTurma(unica, turma(6, ["A", "B", "A", "A", "C", "C"])));
  assert.equal(r2.length, 3);
  assert.ok(r2.every((x) => x.habilidade === "EF07MA01" && x.tema));
});

test("banco: coordenador cria caderno, professor envia, reenvio substitui, painel sem professor", async () => {
  assert.equal(await Cad.ehCoordenador("coord@x.br"), false);
  await Cad.marcarCoordenador("coord@x.br", true);
  assert.equal(await Cad.ehCoordenador("coord@x.br"), true);
  const r = await Cad.criarCaderno("coord@x.br", { titulo: "Diag", escolas: "EE Alfa\nEE Beta\nee alfa", avaliacao: AV });
  assert.equal(r.ok, true);
  assert.ok(Ciclo.codigoValido(r.codigo));
  const c = await Cad.lerCaderno(r.codigo);
  assert.deepEqual(c.escolas, ["EE Alfa", "EE Beta"]);
  assert.equal(await Cad.podeGerir("prof@x.br", c), false);
  assert.equal(await Cad.podeGerir("coord@x.br", c), true);

  const cont = (resp) => Ciclo.contagensDaTurma(AV, turma(5, resp));
  await Cad.gravarResultado("prof@x.br", r.codigo, { escola: "EE Alfa", turma: "7A", alunos: 5, contagens: cont(["A", "B", "C", "D", "A", "B"]) });
  await Cad.gravarResultado("prof@x.br", r.codigo, { escola: "EE Alfa", turma: "7A", alunos: 5, contagens: cont(["B", "B", "C", "D", "A", "B"]) });
  const res = await Cad.resultadosDoCaderno(r.codigo);
  assert.equal(res.length, 1, "reenvio da mesma turma substitui");
  assert.equal(res[0].contagens[0].B, 5);
  assert.ok(!("professor_id" in res[0]) && !("professorId" in res[0]));
  const tudo = JSON.stringify((await db.query("SELECT * FROM resultados_turma")).rows);
  assert.ok(!/@|Aluno/.test(tudo), "nem e-mail nem nome no banco");

  // reavaliação só a partir de um diagnóstico do mesmo dono; herda as escolas
  const reav = Ciclo.montarReavaliacao(AV, [{ origem: 0, item: { ...AV.itens[0], comando: "nova" } }]);
  assert.equal((await Cad.criarCaderno("outro@x.br", { avaliacao: reav, tipo: "reavaliacao", origem: r.codigo })).ok, false);
  const r2 = await Cad.criarCaderno("coord@x.br", { avaliacao: reav, tipo: "reavaliacao", origem: r.codigo });
  assert.equal(r2.ok, true);
  const lista = await Cad.reavaliacoesDe(r.codigo);
  assert.equal(lista.length, 1);
  assert.deepEqual(lista[0].escolas, ["EE Alfa", "EE Beta"]);
  const meus = await Cad.cadernosDoUsuario("coord@x.br");
  assert.equal(meus.length, 2);
});

test("caderno recusa questão sem gabarito", async () => {
  const ruim = { ...AV, itens: [{ ...AV.itens[0], correta: null }] };
  const r = await Cad.criarCaderno("coord@x.br", { escolas: ["EE Alfa"], avaliacao: ruim });
  assert.equal(r.ok, false);
});
