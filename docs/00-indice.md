# 00 · Índice da documentação do EduGera

> Documentação interna. **Fica só no repositório; não é publicada no site.**
> Criada em 22/10/2026 a partir do código. Quem altera o repositório é o Claude Code (CLAUDE.md).

## Estados
- **rascunho**: escrito a partir do código, ainda não conferido pelo Paulo.
- **validado**: o Paulo leu e confirmou que descreve o que acontece.
- **revisado juridicamente**: um advogado revisou. Só vale para `lgpd/` e `juridico/`; **nenhum documento tem este estado ainda.**

Para mudar o estado, troque a linha "Estado" no topo do arquivo e nesta tabela, com a data.

## Inventário
| Arquivo | Assunto | Estado | Atualizado |
|---|---|---|---|
| [01-visao-geral.md](01-visao-geral.md) | o que é, recursos, planos, princípios | rascunho | 22/10/2026 |
| [02-arquitetura.md](02-arquitetura.md) | peças, rotas, banco, testes | rascunho | 22/10/2026 |
| [03-ambientes-e-deploy.md](03-ambientes-e-deploy.md) | produção × teste, publicar, variáveis | rascunho | 22/10/2026 |
| [04-pagamentos-asaas.md](04-pagamentos-asaas.md) | regras, testes feitos, estorno parcial em produção | rascunho | 22/10/2026 |
| [05-ia-e-qualidade.md](05-ia-e-qualidade.md) | provedores, conferência de gabarito, baterias, custo | rascunho | 22/10/2026 |
| **lgpd/** | | | |
| [lgpd/01-inventario-de-dados.md](lgpd/01-inventario-de-dados.md) | todos os dados pessoais, onde ficam, retenção, lacunas | rascunho | 22/10/2026 |
| [lgpd/02-operadores.md](lgpd/02-operadores.md) | Vercel, Neon, Google, OpenAI, Asaas | rascunho | 22/10/2026 |
| [lgpd/03-transferencia-internacional.md](lgpd/03-transferencia-internacional.md) | o que vai aos EUA, art. 33 | rascunho | 22/10/2026 |
| [lgpd/04-incidentes.md](lgpd/04-incidentes.md) | passo a passo, prazo ANPD | rascunho | 22/10/2026 |
| [lgpd/05-direitos-dos-titulares.md](lgpd/05-direitos-dos-titulares.md) | como atender cada direito, lacunas | rascunho | 22/10/2026 |
| **juridico/** | | | |
| [juridico/termos.md](juridico/termos.md) | resumo dos Termos e pontos para o advogado | rascunho | 22/10/2026 |
| [juridico/privacidade.md](juridico/privacidade.md) | resumo da Política e divergências com o código | rascunho | 22/10/2026 |
| [juridico/aviso-de-ia.md](juridico/aviso-de-ia.md) | onde aparece o aviso de IA, regras de comunicação | rascunho | 22/10/2026 |
| **Documentos anteriores (operação)** | | | |
| [ambiente-teste.md](ambiente-teste.md) | site de teste (fase-0). Desatualizado: a produção já tem banco | rascunho | out/2026 |
| [rollback.md](rollback.md) | voltar atrás, backup do banco | rascunho | out/2026 |
| [pagamentos.md](pagamentos.md) | travas e variáveis do Asaas | rascunho | out/2026 |
| [plano-parte-b.md](plano-parte-b.md) | plano para ligar o banco em produção (executado) | rascunho | 09/10/2026 |
| [troca-dominio.md](troca-dominio.md) | edugera.vercel.app → edugera.app (executado) | rascunho | out/2026 |
| [custo-ia-estimado.md](custo-ia-estimado.md) | estimativa de custo da OpenAI (antes da medição real) | rascunho | 15/10/2026 |
| [divulgacao/](divulgacao/) | material de divulgação | rascunho | — |

## O que resolver primeiro (achados desta documentação)
1. **Política de Privacidade:** incluir o Neon; dizer que contas, uso e perfil ficam no banco; explicar a cópia pública de cada material no Blob (`juridico/privacidade.md`).
2. **Ordem das IAs:** o código tenta a OpenAI primeiro. Decidir se o Gemini pago passa a ser o principal (`05-ia-e-qualidade.md`).
3. **Confirmar na Vercel:**
   - a `GEMINI_API_KEY` é do projeto pago;
   - se `EXCLUSAO_CONTA=1` está ligada;
   - região do Blob e das funções.
4. **Endereço** do responsável nos Termos.
5. **Prazos de retenção** para eventos de uso, ilustrações e custos de IA.
6. Revisão por advogado de `lgpd/` e `juridico/`, principalmente o art. 14 (dados de estudantes), antes de vender para escolas e redes.
