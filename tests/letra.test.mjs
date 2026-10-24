// "Minha letra": folha-modelo lida na foto (sem IA), glifos e escrita com a letra do professor
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { definirClienteTeste } from "../lib/banco.js";
import { listarMigracoes, lerInstrucoes } from "../lib/migracoes.js";
import * as L from "../lib/letraProfessor.js";
import { acharMarcadores, homografia, lerFolhaModelo } from "../lib/visaoModelo.js";
import { lerLetra, salvarLetra, apagarLetra } from "../lib/letraBanco.js";

// Foto sintética da folha: girada 4°, fora de escala e deslocada; preenche as N primeiras células
function fotoDaFolha({ preenchidas = 30, giro = 4, escala = 5.2, dx = 90, dy = 60, W = 1300, H = 1700 } = {}) {
  const data = new Uint8ClampedArray(W * H * 4);
  const a = (giro * Math.PI) / 180;
  const cos = Math.cos(a);
  const sen = Math.sin(a);
  const zonas = Array.from({ length: preenchidas }, (_, i) => L.zonaDaCelula(i));
  for (let py = 0; py < H; py++)
    for (let px = 0; px < W; px++) {
      // foto → mm (inverso de: mm → girar → escalar → deslocar)
      const ux = (px - dx) / escala;
      const uy = (py - dy) / escala;
      const x = ux * cos + uy * sen;
      const y = -ux * sen + uy * cos;
      let v = 235; // papel
      if (x < 0 || y < 0 || x > 210 || y > 297) v = 120; // mesa
      else if (L.MARCADOR.cantos.some(([mx, my]) => x >= mx && x <= mx + 12 && y >= my && y <= my + 12)) v = 10;
      else
        for (const z of zonas) {
          // "letra": um traço em L dentro da zona
          const cx = z.x + z.largura * 0.3;
          const cy = z.y + z.altura * 0.25;
          if ((x >= cx && x <= cx + 1 && y >= cy && y <= cy + z.altura * 0.45) || (y >= cy + z.altura * 0.43 && y <= cy + z.altura * 0.45 + 1 && x >= cx && x <= cx + 5)) v = 30;
        }
      const k = (py * W + px) * 4;
      data[k] = data[k + 1] = data[k + 2] = v;
      data[k + 3] = 255;
    }
  return { data, width: W, height: H };
}

test("folha-modelo: 108 caracteres cabem na grade de 112 e as zonas ficam dentro da folha", () => {
  assert.equal(L.CARACTERES_MODELO.length, 108);
  assert.ok(L.CARACTERES_MODELO.length <= L.GRADE.colunas * L.GRADE.linhas);
  const ultima = L.zonaDaCelula(111);
  assert.ok(ultima.y + ultima.altura < L.MARCADOR.cantos[2][1]);
});

test("homografia: leva os 4 pontos certos e interpola o meio", () => {
  const f = homografia([[0, 0], [10, 0], [0, 10], [10, 10]], [[100, 100], [200, 110], [95, 205], [195, 215]]);
  const [x, y] = f(10, 0);
  assert.ok(Math.abs(x - 200) < 1e-6 && Math.abs(y - 110) < 1e-6);
});

test("foto da folha: acha os 4 cantos e recorta só as células preenchidas", () => {
  const img = fotoDaFolha({ preenchidas: 30 });
  const m = acharMarcadores(img);
  assert.ok(m, "marcadores");
  assert.ok(m[0][0] < m[1][0] && m[0][1] < m[2][1]);
  const r = lerFolhaModelo(img);
  assert.equal(r.ok, true);
  assert.equal(r.celulas.length, 30);
  assert.deepEqual(r.celulas.slice(0, 3).map((c) => c.caractere), ["a", "b", "c"]);
  const c = r.celulas[0];
  assert.ok(c.w < 120 && c.h > 100, `recorte ${c.w}×${c.h}`); // cortado nas laterais, altura da zona mantida
  assert.ok(r.faltam.includes("z") === false && r.faltam.includes("A"));
});

test("foto sem a folha: erro amigável", () => {
  const W = 400;
  const H = 500;
  const data = new Uint8ClampedArray(W * H * 4).fill(230);
  assert.equal(lerFolhaModelo({ data, width: W, height: H }).ok, false);
});

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const glifosDe = (cs) => Object.fromEntries([...cs].map((c) => [c, [{ src: PNG, w: 60, h: 120 }, { src: PNG, w: 50, h: 120 }]]));

test("glifos: validação, letra parecida quando falta e variação entre as versões", () => {
  assert.equal(L.validarGlifos(glifosDe("abc")).ok, false); // poucas letras
  const v = L.validarGlifos({ ...glifosDe("abcdefghijklmnopqrstuvwxyz"), ruim: [{ src: PNG }], x: [{ src: "http://x", w: 1, h: 1 }] });
  assert.equal(v.ok, true);
  assert.equal(v.glifos.ruim, undefined);
  assert.equal(L.glifoPara(v.glifos, "á").src, PNG);
  assert.equal(L.glifoPara(v.glifos, "A").w, 60);
  assert.equal(L.glifoPara(v.glifos, "a", 1).w, 50);
  assert.equal(L.glifoPara(v.glifos, "#"), null);
});

test("escrever com a letra: avança, quebra a linha e lista o que faltou", () => {
  const g = glifosDe("abcdefghijklmnopqrstuvwxyz");
  const r = L.escreverComLetra("aa bb #", g, { tamanho: 10 });
  assert.equal(r.itens.length, 4);
  assert.ok(r.itens[1].x > r.itens[0].x);
  assert.deepEqual(r.faltando, ["#"]);
  const q = L.escreverComLetra("abc abc abc", g, { tamanho: 10, larguraMax: 60 });
  assert.ok(new Set(q.itens.map((i) => Math.round(i.y / 10))).size > 1, "quebrou a linha");
});

// ---------- banco ----------
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

test("letra no banco: salvar, trocar, ler só a própria e apagar", async () => {
  assert.equal(await lerLetra("prof@x.br"), null);
  await salvarLetra("prof@x.br", glifosDe("ab"));
  await salvarLetra("prof@x.br", glifosDe("abc"));
  assert.deepEqual(Object.keys(await lerLetra("prof@x.br")), ["a", "b", "c"]);
  assert.equal(await lerLetra("outro@x.br"), null);
  assert.equal(await apagarLetra("prof@x.br"), true);
  assert.equal(await lerLetra("prof@x.br"), null);
});
