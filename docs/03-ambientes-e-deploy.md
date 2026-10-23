# 03 · Ambientes e deploy

> **Estado: rascunho.** Complementa `docs/ambiente-teste.md` e `docs/rollback.md`, que continuam valendo. Atenção: a tabela antiga de `ambiente-teste.md` diz que a produção não tem banco. Isso mudou: hoje a produção usa o Neon.

## Regras (CLAUDE.md)
- **Só o Claude Code edita o repositório** (decisão do Paulo, 04/10/2026).
- Mudança nova vai **primeiro ao `fase-0`** (site de teste). `main` só depois do OK do Paulo.
- Antes de cada push: `npm test`, `npx next lint`, `npx next build` sem erro.
- Mudou um prompt ou uma conferência: rodar a bateria `/qualidade`.
- Chaves e senhas: **quem cola na Vercel é o Paulo**. O Claude nunca lê, copia nem cola.

## Ambientes
| | Produção | Teste |
|---|---|---|
| Endereço | **edugera.app** (edugera.vercel.app redireciona com 308) | Preview da Vercel do branch `fase-0` (protegido pela Vercel) |
| Branch | `main` (push → a Vercel publica sozinha) | `fase-0` |
| Banco | Neon `edugera-producao` (`DATABASE_URL_PRODUCAO` + `BANCO_PRODUCAO=1`) | Neon `edugera-teste` (`DATABASE_URL_TESTE`) |
| Blob | arquivos de sempre | pasta `teste/` |
| IA | real (OpenAI → Gemini) | simulada (`IA_SIMULADA=1`) |
| Pagamento | Asaas produção (`PAGAMENTOS_PRODUCAO=1`, venda aberta em 17/10/2026) | Asaas sandbox |
| Exclusão de conta | só com `EXCLUSAO_CONTA=1` **[confirmar se ligada]** | ligada |

Branch de trabalho do Claude Code: `planos`. Fluxo: `planos` → `fase-0` → (OK do Paulo) → `main`.

## Como o código sabe o ambiente
`lib/ambiente.js`: `VERCEL_ENV=production` → produção, com tudo de teste desligado. `preview` ou `APP_ENV=teste` → teste.

## Publicar
1. Testes, lint e build sem erro.
2. Push em `fase-0` e conferir no site de teste.
3. OK do Paulo → push em `main` → a Vercel publica em 1–2 minutos.
4. Conferir no ar. A migração nova roda no build.

## Voltar atrás
`docs/rollback.md`: na Vercel, "Promote to Production" no deploy anterior (instantâneo), ou `git revert`. Antes de migração nova em produção: criar branch de backup no Neon.

## Domínio e Google
- Domínio `edugera.app` na Vercel (`docs/troca-dominio.md`).
- Google Search Console: propriedade `https://edugera.app` verificada por tag HTML (`app/layout.tsx`, `verification.google`) em 22/10/2026. Sitemap enviado: `/sitemap.xml`, com ~1.800 URLs.

## Variáveis (nomes; os valores ficam só na Vercel)
IA: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `MODELO_TEXTO`, `MODELO_MATEMATICA`, `MODELO_REVISOR`, `MODELO_GEMINI`, `MODELOS_GEMINI`, `REVISOR_PROVEDOR`, `QUALIDADE_IMAGEM`, `PRECOS_IA`, `COTACAO_DOLAR`.
Login: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
Dados: `DATABASE_URL_PRODUCAO`, `BANCO_PRODUCAO`, `DATABASE_URL_TESTE`, `BLOB_READ_WRITE_TOKEN`, `AUDITORIAS_*`, `EXCLUSAO_CONTA`.
Pagamento: `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `PAGAMENTOS_PRODUCAO`, `MP_ACCESS_TOKEN` (desligado).
Outros: `ADMIN_EMAILS`, `APP_ENV`, `IA_SIMULADA`.
**Nunca trocar** `NEXTAUTH_SECRET` nem `BLOB_READ_WRITE_TOKEN` sem plano: caminhos de arquivos são derivados deles.
