# Pagamentos (Asaas, conta de pessoa física — sem MEI)

Trocamos o Mercado Pago pelo Asaas em 13/10/2026 (a conta do Mercado Pago foi suspensa na validação).

| Plano | Como cobra | Duração |
|---|---|---|
| Pro mensal (R$ 39,90) | Assinatura no cartão (Checkout do Asaas, cobrança recorrente) | renova todo mês até cancelar |
| Pro anual (R$ 358,80) | Pagamento único no Checkout do Asaas: Pix à vista ou cartão até 12x | 12 meses, não renova sozinho |

O professor preenche nome e CPF **na página do Asaas** — o EduGera não pede nem guarda CPF.

Preços: `lib/planos.js`. Código: `lib/pagamentos.js` (regras), `lib/cobranca.js` (fluxo),
`app/api/pagamentos/{checkout,webhook,cancelar}`, página `/assinatura`. Tabelas: migrações 0005 e 0006.

## Travas de segurança
- Site de teste: só aceita chave do **Sandbox** (começa com `$aact_hmlg_`). Nunca cobra dinheiro real.
- Produção: só cobra com `PAGAMENTOS_PRODUCAO=1` **e** chave de produção (`$aact_prod_`) **e** token do aviso.
  Sem isso, os botões continuam "Em breve".
- O aviso (webhook) precisa trazer o token certo e, mesmo assim, o pagamento é **relido na API** com a
  nossa chave; o corpo recebido não ativa nada.
- O e-mail do professor não vai para o banco (o pagamento é ligado à conta pelo id do Checkout).

## Passo a passo do teste (Paulo)
1. Criar a conta no **Sandbox**: https://sandbox.asaas.com (cadastro rápido, sem análise de documentos).
2. No Sandbox: **Integrações → Chaves de API → Gerar chave**. Copie (aparece uma vez só).
3. Na Vercel (projeto `gerador-materiais-didaticos` → Settings → Environment Variables), marcando **só Preview**:

| Variável | Preview (teste) | Production (só no lançamento) |
|---|---|---|
| `ASAAS_API_KEY` | chave do **Sandbox** (`$aact_hmlg_...`) | chave da conta real (`$aact_prod_...`) |
| `ASAAS_WEBHOOK_TOKEN` | um texto seu, 32+ caracteres, sem espaço (ex.: frase longa sem espaços) | outro texto, também 32+ |
| `PAGAMENTOS_PRODUCAO` | — | `1` só no dia do lançamento |

   Pode apagar `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET`: não são mais usados.
4. No Sandbox: **Integrações → Webhooks → Adicionar**:
   - URL: `https://<endereço do site de teste>/api/pagamentos/webhook`
   - Token de autenticação: o mesmo texto de `ASAAS_WEBHOOK_TOKEN`
   - Versão da API: v3 · Fila de sincronização: ativada
   - Eventos: **Cobranças** (todos) e **Assinaturas** (todos)
5. Redeploy do Preview. Em `/planos`, "Assinar" abre o Checkout do Asaas.
6. Pagar com os dados de teste do Sandbox (cartão de teste da documentação do Asaas; Pix: no Sandbox
   dá para confirmar o pagamento pelo painel da cobrança).
7. Conferir `/assinatura`: Pro ativo, com a validade.

Se o Preview da Vercel estiver protegido por senha (Deployment Protection), o aviso do Asaas não chega:
libere a rota ou teste no endereço sem proteção.

## Antes de abrir para professores
1. Conta real do Asaas aprovada (documentos enviados em 13/10/2026).
2. Login do Google "Em produção".
3. Termos: renovação, cancelamento, reembolso em 7 dias (CDC art. 49).
4. Migrações 0005 e 0006 no banco de produção (com backup, autorizadas).
5. Teste completo no site de teste com cartão e Pix de teste.
6. Com CPF, o recebido é renda de pessoa física (Carnê-Leão): confirmar com contador.
