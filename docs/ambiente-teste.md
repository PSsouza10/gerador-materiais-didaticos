# Ambiente de teste (Fase 0)

O site de teste é um **Preview da Vercel** do branch `fase-0`. Ele nunca mexe na produção.

| | Produção (edugera.vercel.app) | Teste (Preview do `fase-0`) |
|---|---|---|
| Branch | `main` | `fase-0` |
| Banco | nenhum (desligado no código) | Neon `edugera-teste` via `DATABASE_URL_TESTE` |
| Blob | arquivos de sempre | store `edugera-teste` + pasta `teste/` |
| IA | OpenAI → Gemini | fixa (`IA_SIMULADA=1`), sem custo e sem dado real |
| `/api/saude` | 404 | mostra ambiente, banco e marcador |
| Migrações | nunca rodam | rodam no build (`vercel-build`) |

## Como o código decide o ambiente
`lib/ambiente.js`: `VERCEL_ENV=production` → produção (tudo de teste desligado, mesmo que alguma variável exista lá). `VERCEL_ENV=preview` ou `APP_ENV=teste` → teste.

## Configurar (feito pelo Paulo, uma vez)
Em todas as variáveis abaixo marque **só Preview** (nunca Production).

1. **Neon**: criar projeto `edugera-teste` → copiar a connection string → na Vercel, `DATABASE_URL_TESTE` (Preview).
2. **Blob**: Vercel → Storage → criar store `edugera-teste` → conectar só a Preview (ela cria `BLOB_READ_WRITE_TOKEN` de Preview).
3. Variáveis de Preview: `APP_ENV=teste`, `IA_SIMULADA=1`, um (o login do Preview já volta sozinho para o endereço do teste — `lib/ambiente.js`, `urlLoginPreview`).
4. **Google OAuth**: adicionar `<endereço do Preview>/api/auth/callback/google` nas URIs de redirecionamento.
5. Fazer redeploy do Preview do `fase-0`.

## Conferir
- Abrir `<preview>/api/saude`: `ambiente: "teste"`, `banco.marcador: "teste"`, `blob.prefixo: "teste/"`.
- Gerar uma apostila: o título começa com **[TESTE]**.
- Cada resposta da API tem o cabeçalho `x-request-id`; nos logs da Vercel aparece uma linha `{"app":"edugera","request_id":...}`.
- `edugera.vercel.app/api/saude` deve dar **404**.

## Comandos (local ou no build)
```
npm run migrar -- status          # o que já foi aplicado
npm run migrar -- up              # aplica o que falta (só no banco de teste)
npm run migrar -- down --confirmar  # desfaz só a última
npm test                          # inclui testes de isolamento
```
O script recusa: produção, falta de `DATABASE_URL_TESTE`, e banco sem o marcador `ambiente = 'teste'`.
