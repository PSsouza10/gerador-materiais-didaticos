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
  for (const p of ["/", "/criar", "/privacidade", "/termos"]) {
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
  for (const p of ["/", "/criar", "/privacidade", "/termos"]) assert.ok(sitemap.includes(`<loc>${CANON}${p}</loc>`), p);
  assert.doesNotMatch(sitemap, /\/m\/|\/api\//);
});

test("metadata por página: lang, título, description, canonical, og", async () => {
  const titulos = new Set();
  for (const p of ["/", "/criar", "/privacidade", "/termos"]) {
    const html = await (await get(p)).text();
    assert.match(html, /<html lang="pt-BR"/, p);
    const titulo = /<title>([^<]+)<\/title>/.exec(html)?.[1];
    assert.ok(titulo, p);
    titulos.add(titulo);
    assert.match(html, /<meta name="description" content="[^"]{40,}"/, p);
    assert.ok(html.includes(`<link rel="canonical" href="${CANON}${p}"/>`), `${p} canonical`);
    assert.match(html, /<meta property="og:title"/, p);
  }
  assert.equal(titulos.size, 4, "títulos únicos");
});

test("fachada: um h1, mensagem principal, chamadas para /criar, login e links legais", async () => {
  const html = await (await get("/")).text();
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, "um h1");
  assert.match(html, /A apostila que você imaginou\./);
  assert.match(html, /Criar minha primeira apostila/);
  assert.match(html, /href="\/criar"/, "chamada para o gerador");
  assert.match(html, /href="#como-funciona"/, "Ver como funciona");
  assert.match(html, />\s*Entrar\s*</, "botão Entrar");
  assert.match(html, /href="\/privacidade"/);
  assert.match(html, /href="\/termos"/);
  assert.doesNotMatch(html, /<form[\s>]/, "fachada sem formulário");
  for (const img of ["capa-infografico", "conteudo", "exercicios", "gabarito", "pdf-aluno", "pdf-professor"]) {
    assert.ok(html.includes(`vitrine%2F${img}.webp`) || html.includes(`vitrine/${img}.webp`), img);
    assert.equal((await get(`/vitrine/${img}.webp`)).status, 200, `${img}.webp`);
  }
});

test("gerador (/criar): um único h1, campos com id/name/label, rádios nativos", async () => {
  const html = await (await get("/criar")).text();
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

// Visitante anônimo fica na fachada; logado vai direto para /criar.
// A parte "logado" usa o login de TESTE (AUTH_TESTE=1, só local; nunca na Vercel).
test("/: anônimo vê a fachada, sem redirecionar", async () => {
  const r = await get("/");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("location"), null);
  assert.match(await r.text(), /A apostila que você imaginou\./);
  // cookie de sessão inválido também não redireciona
  const falso = await get("/", { headers: { cookie: "next-auth.session-token=invalido" } });
  assert.equal(falso.status, 200, "sessão inválida mostra a fachada");
});

test("/: logado é redirecionado para /criar; logout volta para a fachada", async (t) => {
  const provedores = await (await get("/api/auth/providers")).json().catch(() => ({}));
  if (!provedores.teste) return t.skip("login de teste desligado (rode com AUTH_TESTE=1)");
  const jar = new Map();
  const guardar = (r) => {
    for (const c of r.headers.getSetCookie?.() || []) {
      const [par] = c.split(";");
      const i = par.indexOf("=");
      jar.set(par.slice(0, i), par.slice(i + 1));
    }
  };
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const csrfR = await get("/api/auth/csrf");
  guardar(csrfR);
  const { csrfToken } = await csrfR.json();
  const login = await get("/api/auth/callback/teste", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: cookie() },
    body: new URLSearchParams({ csrfToken, email: "professor.teste@example.com", callbackUrl: `${BASE}/criar`, json: "true" }),
  });
  guardar(login);
  const sessao = await (await get("/api/auth/session", { headers: { cookie: cookie() } })).json();
  assert.equal(sessao?.user?.email, "professor.teste@example.com", "sessão confirmada");

  const home = await get("/", { headers: { cookie: cookie() } });
  assert.ok([307, 308].includes(home.status), `redireciona (${home.status})`);
  assert.equal(new URL(home.headers.get("location"), BASE).pathname, "/criar");
  assert.match(home.headers.get("cache-control") || "", /no-store|private/, "não fica em cache compartilhado");

  for (const p of ["/criar", "/privacidade", "/termos"]) assert.equal((await get(p, { headers: { cookie: cookie() } })).status, 200, `${p} logado`);
  const m = await get("/m/naoexiste123", { headers: { cookie: cookie() } });
  assert.ok([200, 404].includes(m.status), `/m/[id] responde (${m.status})`);

  // logout: depois dele, "/" volta a ser a fachada
  const csrf2 = await (await get("/api/auth/csrf", { headers: { cookie: cookie() } })).json();
  const sair = await get("/api/auth/signout", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: cookie() },
    body: new URLSearchParams({ csrfToken: csrf2.csrfToken, callbackUrl: `${BASE}/`, json: "true" }),
  });
  guardar(sair);
  const depois = await get("/", { headers: { cookie: cookie() } });
  assert.equal(depois.status, 200, "após logout: fachada");
});
