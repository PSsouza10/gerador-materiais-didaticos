# 01 · Visão geral

> **Estado: rascunho.** Escrito a partir do código e das decisões registradas até 22/10/2026.

## O que é
O EduGera (edugera.app) gera material didático alinhado à BNCC e ao Currículo Paulista para professores da Educação Básica, do 1º ano ao Ensino Médio. Foi criado e é mantido por Paulo Sergio Souza de Jesus, professor de Matemática.

## Público
Professores e professoras, com login pela conta Google. A seguir: escolas e redes ("modo Rede", em avaliação).

## O que faz hoje
| Recurso | Onde | Plano |
|---|---|---|
| Apostila, ficha de estudo, lista de exercícios A4 em uma página | aba Apostila | Grátis e Pro |
| Avaliação no formato da Prova Paulista e do SARESP: texto-base, figura, habilidade e descritor, 4 alternativas, gabarito comentado, cartão-resposta | aba Avaliação | Grátis e Pro |
| Trocar uma questão por IA / editar à mão | Avaliação | Grátis: 1 troca por prova; Pro: 3 |
| Correção da turma: nota por aluno e relatório por habilidade e descritor | Avaliação | Grátis à mão; **Pro** pela foto do cartão e com download do relatório |
| Plano de aula no Currículo Paulista (Word e PDF), de 3 formas: por tema, a partir da apostila ou a partir de PDF (Pro) | aba Plano | Grátis e Pro |
| Apoios de acessibilidade escolhidos pelo professor (instruções curtas, etapas numeradas, exemplo guiado, ilustração simples) | formulário | Grátis e Pro |
| Ilustração e capas | Apostila | capas premium no Pro |
| Links de compartilhamento revogáveis | Minhas Apostilas | Grátis e Pro |
| Páginas públicas para o Google: `/atividades`, `/prova-paulista`, `/bncc/<código>` | site | público |

## Planos (`lib/planos.js`)
| Plano | Preço | Principais limites |
|---|---|---|
| Grátis | R$ 0 | 2 gerações por mês, 1 troca por prova |
| Pro mensal | R$ 39,90/mês (cartão, renova) ou Pix de 1 mês | 30 gerações/mês (até 3 por dia), 3 trocas, foto do cartão, relatórios |
| Pro anual | R$ 358,80/ano (Pix ou cartão até 12x) | igual ao Pro |
| Escola | "Em breve" | sem preço; ver o "modo Rede" |

Venda aberta em produção desde 17/10/2026.

## Princípios
- **O professor decide:** todo material diz "revise antes de aplicar".
- **Gabarito conferido:** contas refeitas pelo sistema, e na avaliação uma segunda IA resolve sem ver a resposta.
- **Poucos dados:** o e-mail não vai ao banco, e os dados de alunos não saem do aparelho do professor (exceto a foto, enviada à IA para leitura).
- **Teste antes:** toda mudança vai primeiro ao site de teste (`03-ambientes-e-deploy.md`).

## Não é
- Não é ferramenta oficial da Secretaria da Educação de SP e não tem vínculo com ela. As avaliações são "no formato" da Prova Paulista e do SARESP.
- Não usar a palavra "registrada" até o registro ser confirmado.
