import { NextResponse } from "next/server";

// Marca do aparelho (cookie "eg_d", código aleatório, invisível para o professor).
// Usada só para limitar contas novas no plano Grátis (lib/dispositivo.js).
export const COOKIE_APARELHO = "eg_d";

export function middleware(request) {
  const res = NextResponse.next();
  if (!request.cookies.get(COOKIE_APARELHO)?.value) {
    const id = crypto.randomUUID().replace(/-/g, "");
    res.cookies.set(COOKIE_APARELHO, id, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 400 });
  }
  return res;
}

// páginas e API; fora arquivos estáticos
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)"] };
