# Plano — Auditoria automática de apostilas

## Decisão aprovada

Integrar auditoria determinística ao fluxo normal de geração, sem chamada adicional à OpenAI ou ao Gemini. Exibir erros e avisos ao professor, sem fazer a auditoria bloquear automaticamente a geração ou o download. Preparar a mudança para revisão em branch; não publicar em produção.

## Implementação

1. Reutilizar `lib/auditoria.js` e suas conferências testáveis no pós-processamento do material em `app/api/gerar-material/route.js`; anexar ao objeto retornado pela conclusão do SSE um resumo `auditoria` com nota, contagens e problemas estruturados.
2. Expandir as regras determinísticas em `lib/auditoria.js` ou em helpers puros próximos para os quatro defeitos aprovados: uso do rótulo de igualdade para a comutatividade, orientação que sugere permutar termos de uma subtração, exemplos numéricos que declaram o mesmo total sem atingi-lo e questões de associação com colunas/rótulos incompletos. As regras só devem emitir achados quando os dados permitirem comprovação confiável; não inferir fatos ausentes.
3. Integrar o resultado na interface do gerador em `components/GeradorApostilas.jsx`, com resumo legível de erros/avisos e detalhes para o professor. Manter o alerta e o fluxo atuais de download separados da nova auditoria, de modo que os achados novos não criem bloqueio automático.
4. Preservar as verificações já existentes (gabarito, BNCC, unidades, revisão, qualidade), formato do material e comportamento de cotas/provedores. Não chamar `/api/revisar-conteudo` automaticamente nem alterar provedores.
5. Adicionar testes em `tests/auditoria.test.mjs` para os quatro casos aprovados, ausência de falso positivo em materiais não correspondentes e integração dos resultados no material concluído.

## Estrutura relevante do projeto

- `app/api/gerar-material/route.js`: geração por SSE e montagem final do objeto do material.
- `lib/auditoria.js`: composição das conferências, nota e problemas estruturados.
- `lib/gabarito.js`, `lib/coerencia.js`, `lib/unidades.js`, `lib/revisao.js`, `lib/qualidade.js`: validadores puros já existentes.
- `components/GeradorApostilas.jsx`: pré-visualização, alertas e botões de exportação.
- `tests/auditoria.test.mjs`: testes unitários e de bateria da auditoria.

## Direção visual

Reutilizar a interface atual do gerador e seu padrão de alertas discretos, com hierarquia visual por erro/aviso e texto claro de que a conferência automática não substitui a revisão do professor. Não criar uma tela ou identidade visual nova.
