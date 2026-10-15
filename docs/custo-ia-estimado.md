# Custo de IA por apostila e por plano de aula — ESTIMATIVA (15/10/2026)

> É uma estimativa feita a partir do código (tamanho dos pedidos e das respostas) e dos preços públicos da OpenAI.
> O custo real aparece no painel de uso da OpenAI; compare depois de algumas semanas de uso.
> Dólar: R$ 5,28 (cotação de 14/10/2026). Não inclui IOF/impostos do cartão nem a taxa do Asaas.

## Preços usados (OpenAI, preço padrão)
- **gpt-4o** (texto): US$ 2,50 por 1 milhão de tokens de entrada · US$ 10,00 por 1 milhão de saída.
- **gpt-image-2** (ilustração, qualidade `medium`, padrão do código): ~US$ 0,053 por imagem 1024×1024; ~US$ 0,041 por 1536×1024 (capa "História que Ensina").
- Conta de tokens: ~4 caracteres por token em português.

## Apostila
| Etapa | Entrada | Saída | Custo (US$) |
|---|---|---|---|
| Geração (gpt-4o) — 5 exercícios | ~3.500 tokens (pedido de ~13 mil caracteres) | ~3.000 tokens | ~0,04 |
| Geração (gpt-4o) — 10 exercícios | ~3.500 | ~5.500 | ~0,065 |
| Revisão de conteúdo (automática, 1 vez) | ~6.000–8.000 (pedido + apostila) | ~500–1.000 | ~0,025 |
| Ilustração (1 imagem medium) | — | — | ~0,04–0,05 |
| Correção de 1 exercício com IA (opcional) | ~1.500 | ~400 | ~0,008 |

- **Apostila típica no Grátis** (5 exercícios, 1 ilustração): **~US$ 0,12 ≈ R$ 0,60**.
- **Apostila "cheia" no Pro** (10 exercícios, 2 ilustrações, algumas correções): **~US$ 0,20 ≈ R$ 1,05**.
- Sem ilustração: ~US$ 0,07–0,09 (R$ 0,35–0,50).

## Plano de aula
| Etapa | Entrada | Saída | Custo (US$) |
|---|---|---|---|
| Geração por tema (gpt-4o) | ~1.500–2.000 | ~2.000–3.000 | ~0,025–0,035 |
| Geração a partir da apostila | +2.000–4.000 (texto da apostila) | igual | +0,01 |
| Geração a partir de PDF (Pro) | o PDF vai inteiro: ~1.000–2.000 tokens por página | igual | +0,03 a 0,15 (10 a 30 páginas) |
| Revisão automática (gpt-4o) | ~4.000–5.000 | ~1.000–2.000 | ~0,03 |
| Ilustração (opcional) | — | — | ~0,05 |

- **Plano por tema, sem ilustração:** **~US$ 0,06 ≈ R$ 0,32**.
- Com ilustração: ~US$ 0,11 ≈ R$ 0,60.
- A partir de PDF de ~10 páginas: ~US$ 0,10–0,12 ≈ R$ 0,55–0,65; PDF grande (3 MB, ~30 páginas): até ~US$ 0,25 ≈ R$ 1,30.

## O que isso significa para os planos
- Grátis (2 gerações/mês + revisões): ~R$ 1,20 a R$ 2,00 por professor por mês.
- Pro (30 gerações/mês): uso típico (metade do limite, 1 ilustração) ~R$ 10–15/mês; **uso máximo** (30 apostilas cheias com 2 ilustrações) ~R$ 30/mês — perto do preço do Pro mensal (R$ 39,90) antes da taxa do Asaas. A ilustração é o que mais pesa: `QUALIDADE_IMAGEM=low` na Vercel derruba a imagem para ~US$ 0,006.

## Fontes
- Preço do gpt-4o: pricepertoken.com (atualizado em 14/10/2026), igual ao histórico da OpenAI.
- Preço do gpt-image-2: tabela de custo por imagem do guia de geração de imagem da OpenAI, conferida por aifreeapi.com em 06/09/2026; o próprio código (app/api/gerar-imagem/route.js) traz os mesmos valores.
- Dólar: cotação do Asaas, 14/10/2026.
