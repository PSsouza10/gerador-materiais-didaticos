# Pagamentos — Asaas (principal) e Mercado Pago (reserva)

O provedor é escolhido sozinho (`lib/provedorPagamento.js`): com `ASAAS_API_KEY` válida, cobra pelo
**Asaas**; senão, pelo Mercado Pago se `MP_ACCESS_TOKEN` estiver configurado; senão, "Em breve".

| Plano | Asaas (Checkout hospedado) | Duração |
|---|---|---|
| Pro mensal (R$ 39,90) | checkout RECURRENT no cartão | renova todo mês até cancelar |
| Pro anual (R$ 358,80) | Pix à vista ou cartão até 12x | 12 meses, não renova sozinho |

O professor preenche nome/CPF/cartão **na página do Asaas**; o EduGera não pede nem guarda CPF.
Preços: `lib/planos.js`. Código: `lib/asaas.js`, `lib/cobranca.js`, `app/api/pagamentos/*`,
página `/assinatura`. Tabelas: migrações 0005 e 0006.

## Travas
- Site de teste: fala **só com a API de sandbox** (chave de produção não funciona lá); chave marcada `_prod_` é recusada.
- Produção: só com `PAGAMENTOS_PRODUCAO=1` **e** chave de produção (`$aact_prod_...`).
- Aviso (webhook) `/api/pagamentos/asaas`: exige o header `asaas-access-token` igual a
  `ASAAS_WEBHOOK_TOKEN` **e** relê a cobrança na API. O corpo do aviso não ativa nada sozinho.
- Valor pago conferido com o preço do plano; estorno/contestação corta o Pro na hora;
  aviso antigo repetido não encurta a validade.

## Variáveis (Vercel → Settings → Environment Variables) — quem cola é o Paulo
| Variável | Preview (teste) | Production |
|---|---|---|
| `ASAAS_API_KEY` | chave do **sandbox** | chave de produção (só no lançamento) |
| `ASAAS_WEBHOOK_TOKEN` | token criado no webhook do sandbox | token do webhook de produção |
| `PAGAMENTOS_PRODUCAO` | — | `1` só no dia do lançamento |

## Webhook no Asaas (Integrações → Webhooks)
- URL: `https://<site>/api/pagamentos/asaas`
- Token de autenticação: o mesmo de `ASAAS_WEBHOOK_TOKEN`.
- Eventos: Cobranças, Assinaturas, Checkout.
- Preview protegido pela Vercel (Deployment Protection): o aviso chega bloqueado. Use
  "Protection Bypass for Automation" e acrescente `?x-vercel-protection-bypass=<segredo>` na URL.

## Antes de abrir para professores
1. Login do Google "Em produção".
2. Termos: renovação, cancelamento, reembolso em 7 dias (CDC art. 49).
3. Migrações 0005 e 0006 no banco de produção (com backup, autorizadas).
4. Compra de teste completa no sandbox (mensal e anual, Pix e cartão, cancelamento, estorno).
