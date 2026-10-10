// Planos e limites — configuração única (lib/planos.js) e contas de uso
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import {
  PLANOS, ORDEM_PLANOS, PLANO_ADMIN, obterPlano, teto, formatarPreco, suporteEmail, SUPORTE_TEXTO_PADRAO, planoVigente, limitesTransicao, inicioNovosLimites,
  limitarBiblioteca, avisoTransicao, INICIO_NOVOS_LIMITES,
  inicioDoDia, mensagemLimite, contagensDoArquivo, resumoDoUso, motivoBloqueio, proximoMes,
} from "../lib/planos.js";

test("valores provisórios pedidos pelo Paulo", () => {
  const g = PLANOS.gratis.limites;
  assert.equal(g.geracoesMes, 2);
  assert.equal(g.geracoesDia, 1, "Grátis: 1 por dia (2 por dia daria ~60 no mês se o mensal falhasse)");
  assert.equal(PLANOS.pro_mensal.limites.geracoesDia, 3);
  assert.equal(PLANOS.pro_anual.limites.geracoesDia, 3);
  assert.deepEqual([g.revisoesMes, g.correcoesMes, g.imagensPorGeracao], [10, 30, 1]);
  const pro = PLANOS.pro_mensal.limites;
  assert.deepEqual([pro.revisoesMes, pro.correcoesMes, pro.imagensPorGeracao], [60, 150, 2]);
  assert.equal(g.biblioteca, 5);
  assert.equal(PLANOS.pro_mensal.limites.geracoesMes, 30);
  assert.equal(PLANOS.pro_anual.limites.geracoesMes, 30);
  assert.equal(PLANOS.pro_mensal.limites.biblioteca, null, "Pro: biblioteca completa");
  // sem fila real: nada de "prioridade de processamento"
  for (const p of Object.values(PLANOS)) assert.ok(!p.recursos.some((r) => /prioridade/i.test(r)), p.id);
  assert.ok(PLANOS.pro_mensal.recursos.includes("Limites maiores e recursos Pro"));
  // capa Premium faz parte do Pro (regra final); o Grátis não tem
  assert.equal(PLANOS.pro_mensal.capaPremium, true);
  assert.equal(PLANOS.pro_anual.capaPremium, true);
  assert.equal(PLANOS.gratis.capaPremium, false);
  assert.equal(PLANO_ADMIN.capaPremium, true);
  assert.ok(PLANOS.pro_mensal.limites.revisoesMes > g.revisoesMes, "Pro: mais revisões");
  assert.ok(PLANOS.pro_mensal.limites.imagensPorGeracao > g.imagensPorGeracao, "Pro: mais imagens");
  assert.equal(formatarPreco(PLANOS.gratis), "R$ 0");
  assert.equal(formatarPreco(PLANOS.pro_mensal), "R$ 29,90");
  assert.equal(formatarPreco(PLANOS.pro_anual), "R$ 299");
  assert.equal(formatarPreco(PLANOS.escola), "Em breve", "Escola sem preço");
  assert.equal(PLANOS.escola.preco, null);
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
  assert.equal(SUPORTE_TEXTO_PADRAO, "Suporte em breve");
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
  // Grátis: a 2ª no mesmo dia é bloqueada pelo limite diário
  const g1 = resumoDoUso({ mes: { geracao: 1 }, dia: { geracao: 1 } }, { plano: PLANOS.gratis });
  assert.equal(g1.restantes, 0);
  assert.equal(motivoBloqueio(g1), "dia");
  assert.equal(gr.biblioteca, 5);
  const ok = resumoDoUso({ mes: { geracao: 1 }, dia: { geracao: 0 } }, { plano: PLANOS.gratis });
  assert.equal(ok.restantes, 1, "dia seguinte: pode a 2ª do mês");
  assert.equal(resumoDoUso({ mes: { geracao: 0 }, dia: { geracao: 0 } }, { plano: PLANOS.gratis }).premium, false);
  assert.equal(resumoDoUso({ mes: { geracao: 0 }, dia: { geracao: 0 } }, { plano: PLANOS.pro_mensal }).premium, true, "Pro tem a capa Premium");
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

test("transição: em produção o Grátis segue a regra antiga até o próximo ciclo (ninguém bloqueado de surpresa)", () => {
  const prod = { VERCEL_ENV: "production" };
  assert.equal(inicioNovosLimites(prod), INICIO_NOVOS_LIMITES);
  assert.equal(INICIO_NOVOS_LIMITES, "2026-11-01T00:00:00.000Z", "início do próximo ciclo mensal");
  const antes = planoVigente(PLANOS.gratis, new Date("2026-10-20T12:00:00Z"), prod);
  assert.deepEqual(antes.limites, limitesTransicao(prod));
  assert.equal(antes.limites.geracoesMes, 5, "regra publicada hoje (LIMITE_GERACOES_MES, padrão 5)");
  assert.equal(antes.limites.geracoesDia, null, "sem limite diário na transição");
  assert.equal(antes.limites.biblioteca, null, "biblioteca inteira na transição");
  assert.ok(antes.transicao);
  // quem já passou de 2 neste mês NÃO fica bloqueado agora (segue a regra antiga, com o valor da Vercel)
  const r = resumoDoUso({ mes: { geracao: 3 }, dia: { geracao: 0 } }, { plano: antes });
  assert.equal(r.restantes, 2);
  assert.match(avisoTransicao(antes.transicao), /A partir de 1º de novembro de 2026, o plano Grátis passa a ter 2 gerações por mês \(1 por dia\).*5 materiais.*continuam guardados/);
  // no ciclo novo, a regra nova; e o mês começa do zero (o histórico continua lá, só não conta)
  const depois = planoVigente(PLANOS.gratis, new Date("2026-11-01T00:00:00Z"), prod);
  assert.equal(depois.limites.geracoesMes, 2);
  assert.equal(depois.transicao, undefined);
  // o valor da variável antiga é respeitado durante a transição
  assert.equal(planoVigente(PLANOS.gratis, new Date("2026-10-20T12:00:00Z"), { ...prod, LIMITE_GERACOES_MES: "7" }).limites.geracoesMes, 7);
  // Pro não tem transição
  assert.equal(planoVigente(PLANOS.pro_mensal, new Date("2026-10-20T12:00:00Z"), prod), PLANOS.pro_mensal);
});

test("transição: no site de teste a regra nova vale já; a data pode ser trocada pela variável", () => {
  assert.equal(inicioNovosLimites({ VERCEL_ENV: "preview" }), null);
  assert.equal(planoVigente(PLANOS.gratis, new Date("2026-10-20T12:00:00Z"), { VERCEL_ENV: "preview" }), PLANOS.gratis);
  const env = { VERCEL_ENV: "preview", INICIO_NOVOS_LIMITES: "2026-12-01T00:00:00Z" };
  assert.ok(planoVigente(PLANOS.gratis, new Date("2026-11-20T12:00:00Z"), env).transicao);
});

test("biblioteca limitada: só os 5 mais recentes vão para a tela, sem apagar nada", () => {
  const itens = Array.from({ length: 8 }, (_, i) => ({ id: `m-${i}`, criadoEm: `2026-10-0${i + 1}T10:00:00Z` }));
  const r = limitarBiblioteca(itens, 5);
  assert.deepEqual(r.itens.map((m) => m.id), ["m-7", "m-6", "m-5", "m-4", "m-3"]);
  assert.equal(r.ocultos, 3);
  assert.equal(itens.length, 8, "a lista original não muda");
  const pro = limitarBiblioteca(itens, null);
  assert.equal(pro.itens.length, 8, "upgrade: todos voltam");
  assert.equal(pro.ocultos, 0);
});
