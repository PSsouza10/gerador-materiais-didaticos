# Pagamentos (Mercado Pago, conta de pessoa física)

| Plano | Como cobra | Duração |
|---|---|---|
| Pro mensal (R$ 39,90) | Assinatura no cartão (preapproval) | renova todo mês até cancelar |
| Pro anual (R$ 358,80) | Pagamento único (Checkout Pro): Pix ou cartão até 12x | 12 meses, não renova sozinho |

Preços: `lib/planos.js`. Código: `lib/pagamentos.js` (regras), `lib/cobranca.js` (fluxo),
`app/api/pagamentos/{checkout,webhook,cancelar}`, página `/assinatura`. Tabelas: migração 0005.

## Travas de segurança
- Site de teste: só aceita token **TEST-...** (nunca cobra dinheiro real).
- Produção: só cobra com `PAGAMENTOS_PRODUCAO=1` **e** token de produção. Sem isso, os botões
  continuam "Em breve".
- O aviso (webhook) é relido na API com o nosso token; o corpo recebido não ativa nada.
- O e-mail do professor não vai para o banco (referência aleatória em `checkouts`).

## O que o Paulo configura (Vercel → Settings → Environment Variables)
| Variável | Preview (teste) | Production |
|---|---|---|
| `MP_ACCESS_TOKEN` | Access Token **de teste** (TEST-...) | Access Token de produção (só no lançamento) |
| `MP_WEBHOOK_SECRET` | chave secreta do webhook (teste) | chave secreta do webhook (produção) |
| `PAGAMENTOS_PRODUCAO` | — | `1` só no dia do lançamento |

No painel do Mercado Pago (Suas integrações → EduGera → Webhooks): URL
`https://<endereço do site>/api/pagamentos/webhook`, eventos **Pagamentos** e **Planos e assinaturas**.
Se o Preview da Vercel estiver protegido por senha (Deployment Protection), o aviso do Mercado
Pago não chega: libere a rota ou teste no endereço sem proteção.

## Antes de abrir para professores
1. Login do Google "Em produção".
2. Termos: renovação, cancelamento, reembolso em 7 dias (CDC art. 49).
3. Migração 0005 no banco de produção (com backup, autorizada).
4. Teste completo no site de teste com cartões e Pix de teste.
