// Testes de regressão das páginas públicas (reauditoria): headers, CORS, SEO,
// rótulos, um único h1. Rodar contra um servidor:
//   BASE_URL=http://localhost:3000 npm run test:publico
//   BASE_URL=https://edugera.vercel.app npm run test:publico
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const CANON = "https://edugera.vercel.app";
const get = (p, init) => fetch(BASE + p, { redirect: "manual", ...init });

test("cabeçalhos de segurança em todas as páginas públicas", async () => {
  for (const p of ["/", "/privacidade", "/termos"]) {
    const r = await get(p);
    assert.equal(r.status, 200, p);
    const csp = r.headers.get("content-security-policy") || "";
    assert.match(csp, /frame-ancestors 'none'/, `${p} CSP bloqueante`);
    assert.match(csp, /object-src 'none'/);
    assert.doesNotMatch(csp, /unsafe-eval/);
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.equal(r.headers.get("x-frame-options"), "DENY");
    assert.equal(r.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.ok(r.headers.get("permissions-policy"));
    assert.notEqual(r.headers.get("access-control-allow-origin"), "*", `${p} sem CORS aberto`);
  }
});

test("APIs autenticadas não liberam CORS para outras origens", async () => {
  for (const p of ["/api/uso", "/api/auth/session"]) {
    const r = await get(p, { headers: { Origin: "https://site-malicioso.example" } });
    const acao = r.headers.get("access-control-allow-origin");
    assert.ok(!acao || acao === CANON, `${p}: ${acao}`);
    assert.notEqual(r.headers.get("access-control-allow-credentials"), "true");
  }
});

test("robots.txt e sitemap.xml", async () => {
  const robots = await (await get("/robots.txt")).text();
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Disallow: \/m\//);
  assert.match(robots, /Sitemap: https:\/\/edugera\.vercel\.app\/sitemap\.xml/);
  assert.doesNotMatch(robots, /^Host:/m);
  const sitemap = await (await get("/sitemap.xml")).text();
  for (const p of ["/", "/privacidade", "/termos"]) assert.ok(sitemap.includes(`<loc>${CANON}${p}</loc>`), p);
  assert.doesNotMatch(sitemap, /\/m\/|\/api\//);
});

test("metadata por página: lang, título, description, canonical, og", async () => {
  const titulos = new Set();
  for (const p of ["/", "/privacidade", "/termos"]) {
    const html = await (await get(p)).text();
    assert.match(html, /<html lang="pt-BR"/, p);
    const titulo = /<title>([^<]+)<\/title>/.exec(html)?.[1];
    assert.ok(titulo, p);
    titulos.add(titulo);
    assert.match(html, /<meta name="description" content="[^"]{40,}"/, p);
    assert.ok(html.includes(`<link rel="canonical" href="${CANON}${p}"/>`), `${p} canonical`);
    assert.match(html, /<meta property="og:title"/, p);
  }
  assert.equal(titulos.size, 3, "títulos únicos");
});

test("home: um único h1, campos com id/name/label, rádios nativos", async () => {
  const html = await (await get("/")).text();
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, "um h1");
  for (const nome of ["disciplina", "nivel", "tema", "conteudo", "estilo", "capa", "bncc"]) {
    assert.match(html, new RegExp(`id="campo-${nome}"[^>]*name="${nome}"|name="${nome}"[^>]*id="campo-${nome}"`), nome);
    assert.match(html, new RegExp(`for="campo-${nome}"`), `label de ${nome}`);
  }
  assert.equal((html.match(/type="radio"[^>]*name="dificuldade"/g) || []).length, 3, "3 rádios nativos");
  assert.match(html, /<fieldset[^>]*>.*?<legend/s);
  assert.doesNotMatch(html, /role="radio"/);
  assert.doesNotMatch(html, /type="submit"/, "nenhum botão submit na home");
});
