// Planos e limites — configuração única (lib/planos.js) e contas de uso
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import {
  PLANOS, ORDEM_PLANOS, PLANO_ADMIN, obterPlano, teto, formatarPreco, suporteEmail, SUPORTE_EMAIL_PADRAO,
  inicioDoDia, mensagemLimite, contagensDoArquivo, resumoDoUso, motivoBloqueio, proximoMes,
} from "../lib/planos.js";

test("valores provisórios pedidos pelo Paulo", () => {
  const g = PLANOS.gratis.limites;
  assert.equal(g.geracoesMes, 2);
  assert.equal(g.biblioteca, 5);
  assert.equal(PLANOS.pro_mensal.limites.geracoesMes, 30);
  assert.equal(PLANOS.pro_anual.limites.geracoesMes, 30);
  assert.equal(PLANOS.pro_mensal.limites.biblioteca, null, "Pro: biblioteca completa");
  assert.equal(PLANOS.pro_mensal.prioridade, true);
  assert.equal(PLANOS.gratis.prioridade, false);
  assert.ok(PLANOS.pro_mensal.limites.revisoesMes > g.revisoesMes, "Pro: mais revisões");
  assert.ok(PLANOS.pro_mensal.limites.imagensPorGeracao > g.imagensPorGeracao, "Pro: mais imagens");
  assert.equal(formatarPreco(PLANOS.gratis), "R$ 0");
  assert.equal(formatarPreco(PLANOS.pro_mensal), "R$ 29,90");
  assert.equal(formatarPreco(PLANOS.pro_anual), "R$ 299");
  assert.equal(formatarPreco(PLANOS.escola), "A definir");
  assert.equal(PLANOS.escola.contratavel, false, "Escola sem cobrança");
  assert.deepEqual(ORDEM_PLANOS, ["gratis", "pro_mensal", "pro_anual", "escola"]);
  for (const r of ["PDF do aluno", "PDF do professor", "Exercícios e gabarito", "Revisão básica", "Biblioteca com até 5 materiais"])
    assert.ok(PLANOS.gratis.recursos.includes(r), r);
});

test("limites ficam só em lib/planos.js (sem número solto nas rotas)", () => {
  const uso = readFileSync(new URL("../lib/uso.js", import.meta.url), "utf8");
  assert.doesNotMatch(uso, /LIMITE_(GERACOES|REVISOES|CORRECOES)_MES/, "variáveis antigas não decidem mais o limite");
  assert.doesNotMatch(uso, /\|\|\s*"?\d+"?\s*,\s*10\)/, "sem padrão numérico escondido");
  for (const rota of ["gerar-material", "corrigir-exercicio", "revisar-conteudo", "gerar-imagem"]) {
    const s = readFileSync(new URL(`../app/api/${rota}/route.js`, import.meta.url), "utf8");
    assert.doesNotMatch(s, /gerações grátis|LIMITE_\w+_MES/, rota);
  }
});

test("suporte: sem e-mail inventado; placeholder até o Paulo informar", () => {
  assert.equal(SUPORTE_EMAIL_PADRAO, "[COLOCAREI O E-MAIL AQUI]");
  assert.equal(suporteEmail({}), null);
  assert.equal(suporteEmail({ SUPORTE_EMAIL: "não é e-mail" }), null);
  assert.equal(suporteEmail({ SUPORTE_EMAIL: " suporte@escola.br " }), "suporte@escola.br");
});

test("dia começa à meia-noite de Brasília", () => {
  assert.equal(inicioDoDia(new Date("2026-10-10T14:00:00Z")), "2026-10-10T03:00:00.000Z");
  // 23h30 em Brasília do dia 9 = 02h30 UTC do dia 10: ainda é o dia 9
  assert.equal(inicioDoDia(new Date("2026-10-10T02:30:00Z")), "2026-10-09T03:00:00.000Z");
  assert.equal(proximoMes(new Date("2026-12-15T00:00:00Z")), "2027-01-01T00:00:00.000Z");
});

test("contagem do arquivo antigo (Blob): mês e dia", () => {
  const agora = new Date("2026-10-10T15:00:00Z");
  const c = contagensDoArquivo(
    { geracoes: ["2026-09-30T10:00:00Z", "2026-10-02T10:00:00Z", "2026-10-10T04:00:00Z", "2026-10-10T14:00:00Z"], imagens: ["2026-10-10T14:01:00Z"] },
    agora
  );
  assert.equal(c.mes.geracao, 3);
  assert.equal(c.dia.geracao, 2);
  assert.equal(c.mes.imagem, 1);
  assert.equal(c.mes.revisao, 0);
});

test("resumo: Grátis bloqueia na 3ª geração do mês; Pro bloqueia pelo limite do dia", () => {
  const gr = resumoDoUso({ mes: { geracao: 2 }, dia: { geracao: 0 } }, { plano: PLANOS.gratis });
  assert.equal(gr.restantes, 0);
  assert.equal(motivoBloqueio(gr), "mes");
  assert.equal(gr.biblioteca, 5);
  const ok = resumoDoUso({ mes: { geracao: 1 }, dia: { geracao: 1 } }, { plano: PLANOS.gratis });
  assert.equal(ok.restantes, 1);
  const L = PLANOS.pro_mensal.limites;
  const dia = resumoDoUso({ mes: { geracao: L.geracoesDia }, dia: { geracao: L.geracoesDia } }, { plano: PLANOS.pro_mensal });
  assert.equal(dia.restantes, 0);
  assert.equal(motivoBloqueio(dia), "dia");
  assert.equal(dia.limite, 30);
  const adm = resumoDoUso({ mes: { geracao: 500 }, dia: { geracao: 99 } }, { plano: PLANO_ADMIN, admin: true });
  assert.equal(adm.limite, null);
  assert.equal(adm.restantes, null);
});

test("mensagens claras de bloqueio", () => {
  assert.match(mensagemLimite("mes", PLANOS.gratis, 2), /2 gerações deste mês do plano Grátis.*dia 1º.*\/planos/);
  assert.match(mensagemLimite("dia", PLANOS.pro_mensal, 10), /limite de 10 gerações por dia do plano Pro mensal\. Amanhã/);
  assert.equal(teto(null), Infinity);
  assert.equal(obterPlano("inexistente").id, "gratis");
});
