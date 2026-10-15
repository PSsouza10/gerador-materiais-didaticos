# Troca de domínio: edugera.vercel.app → edugera.app

O código já está pronto (lib/site.js). A ordem importa: **o domínio precisa funcionar antes de publicar**, senão o site antigo redireciona para um endereço que ainda não abre.

## 1. Paulo — comprar e ligar o domínio (Vercel)
1. Vercel → projeto **gerador-materiais-didaticos** → **Settings → Domains → Add** → `edugera.app` → comprar (grátis no 1º ano com o plano Pro).
2. Adicionar também `www.edugera.app` e marcar para **redirecionar para edugera.app**.
3. Esperar a Vercel mostrar **Valid Configuration** nos dois (o certificado HTTPS sai sozinho; .app só abre com HTTPS).

## 2. Paulo — login do Google
Google Cloud Console → APIs e serviços → Credenciais → cliente OAuth do EduGera:
- **Origens JavaScript autorizadas:** adicionar `https://edugera.app`
- **URIs de redirecionamento autorizados:** adicionar `https://edugera.app/api/auth/callback/google`
- Não apagar os do edugera.vercel.app ainda.

## 3. Paulo — variável na Vercel (só Production)
- `NEXTAUTH_URL` = `https://edugera.app` (trocar o valor; quem cola é o Paulo).

## 4. Claude Code — publicar
- `main` com o código novo → a Vercel publica (o redeploy também aplica o NEXTAUTH_URL novo).
- Conferir: edugera.app abre; login com Google funciona; edugera.vercel.app/planos responde 308 para edugera.app/planos; /api continua respondendo no endereço antigo.

## 5. Paulo — Asaas
- Integrações → Webhooks → "EduGera": trocar a URL para `https://edugera.app/api/pagamentos/asaas`. (O endereço antigo continua funcionando, mas o novo é o oficial.)

## 6. Paulo — divulgação
- Instagram: trocar o link da bio para `edugera.app`.
- Google Search Console (opcional): adicionar edugera.app e enviar `https://edugera.app/sitemap.xml`.

Links antigos de material compartilhado (`edugera.vercel.app/m/...`) continuam abrindo: redirecionam para `edugera.app/m/...`.
