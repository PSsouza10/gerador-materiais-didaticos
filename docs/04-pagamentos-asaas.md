# 04 · Pagamentos (Asaas)

> **Estado: rascunho.** Complementa `docs/pagamentos.md` (travas e variáveis). Escrito a partir do código e dos testes de outubro de 2026.

## Como funciona
- O professor clica em assinar. O EduGera cria um **checkout hospedado no Asaas** com uma referência aleatória (`externalReference`). Nome, CPF e cartão ou Pix são preenchidos **na página do Asaas**.
- O Asaas avisa o site (webhook `/api/pagamentos/asaas`). O site **relê a cobrança na API** e não confia no corpo do aviso. Confere o valor com o preço do plano (`valorConfereAsaas`) e grava a validade em `cobrancas`.
- O Pro vale enquanto `valido_ate` for maior que agora.

| Produto | Forma | Validade |
|---|---|---|
| Pro mensal | cartão, recorrente | vencimento + 1 mês + **3 dias de tolerância** internos (`TOLERANCIA_DIAS`). A tela mostra "Renova em DD/MM", sem a tolerância |
| Pro 1 mês (Pix) | Pix à vista, sem renovação | 1 mês |
| Pro anual | Pix ou cartão até 12x | 12 meses a partir de **max(data do pagamento, fim do Pro atual)** |

## Regras de negócio aprovadas pelo Paulo
1. **Mensal → anual** ("Passar para o anual"):
   - **(a)** a tela mostra as datas de início e fim antes de pagar (`periodoDoAnual`);
   - **(b)** se o anual for estornado, a validade volta ao fim do mensal;
   - **(c)** anual sobre anual soma 1 ano a partir do fim atual.
2. Quando o anual é pago, as assinaturas mensais da conta são canceladas no Asaas (`cancelarMensaisDoUsuario`).
3. **Estorno e contestação** (`REFUND*`, `CHARGEBACK*`, `AWAITING_CHARGEBACK`) cortam o Pro na hora. Aviso antigo repetido não encurta a validade.
4. **Estorno parcial:** a cobrança continua "Recebida" (`RECEIVED`) no Asaas, então **o Pro continua**. Comportamento conferido no caso real abaixo.
5. Venda em produção: trava no código (`VENDA_PRODUCAO_LIBERADA` em `lib/provedorPagamento.js`), **aberta em 17/10/2026** com o OK do Paulo, além de `PAGAMENTOS_PRODUCAO=1` e da chave de produção.

## Testes feitos
| Data | Onde | Caso | Resultado |
|---|---|---|---|
| out/2026 | sandbox | Pix mensal | OK, Pro liberado |
| out/2026 | sandbox | Cartão mensal | OK |
| out/2026 | sandbox | Cancelamento | OK: Pro até o fim do período + tolerância de 3 dias (de propósito) |
| out/2026 | sandbox | Anual (conta separada) e mensal → anual com datas | OK |
| out/2026 | sandbox | **Estorno** | O **sandbox do Asaas recusou** estornar (erro do lado deles). A regra é coberta por **testes automáticos** (`tests/pagamentos.test.mjs`) |
| out/2026 | produção | Token do webhook (`ASAAS_WEBHOOK_TOKEN`) colado pelo Paulo, redeploy | OK |
| 17/10/2026 | produção | Venda aberta | Página de planos no ar |
| depois de 17/10/2026 | **produção** | **Compra real**: Pix R$ 39,90 (conta de teste do Paulo, pssouzaf2) | Pago; Pro liberado |
| idem | **produção** | **Estorno total** pedido no Asaas | **Recusado por saldo insuficiente** na conta Asaas |
| idem | **produção** | **Estorno parcial de R$ 38,00** | Cobrança continua `RECEIVED` → o Pro **continua** (regra 4). Sobra R$ 1,90 cobrado |

Rota só de teste: `/api/pagamentos/zerar-teste` (administrador, fora da produção) devolve uma conta ao Grátis para refazer os testes.

## Pendências
- Decidir se estorno **parcial** deve cortar o Pro. Hoje não corta, porque o Asaas mantém "Recebida".
- Termos: reembolso em 7 dias (CDC, art. 49) e o que acontece com o estorno parcial **[advogado]**.
- CNPJ/MEI: Paulo decidiu não abrir agora. Os Termos usam o CPF. Venda a prefeituras exige CNPJ **[contador]**.
