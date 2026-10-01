/** @type {import('next').NextConfig} */

// Cabeçalhos de segurança (auditoria pública, P1).
// A CSP é bloqueante. Antes de ativar, os fluxos públicos (prévia, PDF do aluno
// e do professor, telas, páginas legais, login) rodaram sem nenhuma violação em
// modo Report-Only. Regressão: npm run test:publico (tests/publico.e2e.mjs).
// Exceções documentadas:
//  - 'unsafe-inline' em script-src: o Next 13 injeta scripts inline de hidratação.
//  - 'unsafe-inline' em style-src: estilos inline do React (capas, prévia A4).
//  - *.public.blob.vercel-storage.com: ilustrações geradas e materiais compartilhados.
//  - lh3.googleusercontent.com: foto do perfil Google no menu da conta.
//  - accounts.google.com em form-action: redirecionamento do login OAuth.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.public.blob.vercel-storage.com",
  "frame-ancestors 'none'",
  "form-action 'self' https://accounts.google.com",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
];

const nextConfig = {
  poweredByHeader: false,
  images: {
    // As imagens agora vêm do Vercel Blob (URL permanente, com CORS liberado)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@vercel/blob"],
  },
  async headers() {
    // Em desenvolvimento o preview roda num iframe — os cabeçalhos de segurança
    // (X-Frame-Options, CSP frame-ancestors) bloqueariam o embedding. Em produção
    // todos os cabeçalhos continuam ativos.
    if (process.env.NODE_ENV !== "production") return [];
    return [
      { source: "/:path*", headers: HEADERS },
      // A CDN da Vercel envia "Access-Control-Allow-Origin: *" nas páginas estáticas.
      // O site não precisa de CORS: fixa a própria origem nas páginas e nada nas APIs
      // (APIs autenticadas nunca respondem a outras origens com cookies).
      { source: "/((?!api/).*)", headers: [{ key: "Access-Control-Allow-Origin", value: "https://edugera.vercel.app" }] },
    ];
  },
};

export default nextConfig;
