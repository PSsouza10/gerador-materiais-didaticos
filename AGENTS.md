# EduGera — Base44 Development Notes

## What this is
Next.js 13.5.1 (App Router + Tailwind) app that generates BNCC-aligned teaching materials with OpenAI GPT-4o, stores illustrations/shared materials in Vercel Blob, and uses Google OAuth via NextAuth.

## Running the app
```bash
docker compose -f docker-compose.base44.yml up -d
```
- Node 18 (`node:18-slim`), source bind-mounted at `/app`, deps installed via `npm ci` on startup, runs `next dev -H 0.0.0.0 -p 3000`.
- Port 3000 is the web entry point.
- `WATCHPACK_POLLING=true` enables file watching inside the bind mount.

## Booting without credentials
The app boots fine with **zero external credentials**. It shows an example material, live A4 preview, and PDF export. AI generation and login are disabled until credentials are provided. The `/api/uso` endpoint returns `authConfigurado: false` and the UI shows a notice.

## External credentials (all optional at boot)
| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | GPT-4o content + image generation |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage (illustrations, shared materials, usage tracking) |
| `GOOGLE_CLIENT_ID` | Google OAuth login |
| `GOOGLE_CLIENT_SECRET` | Google OAuth login |
| `NEXTAUTH_SECRET` | Session signing (optional — derived from BLOB_READ_WRITE_TOKEN if absent) |
| `NEXTAUTH_URL` | Public site URL (set to `http://localhost:3000` in dev defaults) |

## Dev-mode CSP change
`next.config.mjs` returns empty headers in dev mode (`NODE_ENV !== "production"`) so the preview iframe can embed the page. All security headers (CSP, X-Frame-Options, etc.) remain active in production.

## Tests
```bash
npm test          # BNCC search + unit verification
npm run test:publico  # public flow e2e
```

## Key files
- `app/api/gerar-material/route.js` — streaming SSE content generation
- `app/api/gerar-imagem/route.js` — image generation → Vercel Blob
- `lib/auth.js` — NextAuth config, `authConfigurado` flag
- `lib/uso.js` — monthly generation limit tracking via Vercel Blob
- `lib/segredo.js` — session secret derivation
- `components/GeradorApostilas.jsx` — main UI (form + live preview)
