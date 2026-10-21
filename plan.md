# Plano — Apoios de acessibilidade no EduGera

## Decisão aprovada
Preparar um MVP opcional de apoios de acessibilidade para a geração de apostilas, em branch de revisão, sem publicar em produção. Os apoios são escolhas pedagógicas para a atividade — não um diagnóstico nem um perfil clínico do estudante. Não criar chamada extra de IA; encaminhar as escolhas permitidas junto do pedido normal de geração e da chamada de imagem já existente, quando aplicável.

## Escopo do MVP

1. Adicionar ao formulário um conjunto opcional de apoios: instruções curtas e diretas; orientações divididas em passos curtos e numerados; exemplo guiado antes dos exercícios; e ilustração simples, sem detalhes decorativos.
2. Não solicitar nem enviar nome, diagnóstico, laudo ou outros dados pessoais do estudante. Explicar na interface que os apoios podem ajudar estudantes com TEA e outras necessidades, que cada estudante é único e que a escolha é pedagógica e específica para a atividade.
3. Aplicar whitelist e normalização aos IDs no servidor; dados ausentes ou desconhecidos resultam em nenhuma seleção, sem falhar pedidos antigos.
4. Incluir instruções selecionadas no prompt da geração existente. Incluir e exibir um objeto opcional `exemploGuiado` com título e 2–5 passos somente quando o professor o solicitar; descartar deterministicamente um exemplo retornado sem essa seleção. Apresentá-lo na prévia, impressão, PDF e página compartilhada da apostila.
5. Quando “ilustração simples” for selecionada, acrescentar uma orientação visual ao prompt da chamada de imagem existente; não criar chamada adicional.
6. Fazer uma conferência determinística e não bloqueante do exemplo solicitado (título e pelo menos dois passos). Mostrar o aviso ao professor sem impedir geração, impressão ou download. Outras qualidades linguísticas/semânticas continuam exigindo revisão humana.
7. Preservar BNCC, objetivos de aprendizagem, opções de dificuldade, cotas, provedores, fluxo de correção e auditoria existente. O recurso não substitui o planejamento do professor, do AEE, PAEE ou PEI.

## Estrutura relevante

- `components/GeradorApostilas.jsx`: seleção dos apoios, snapshot do que foi enviado, indicação se a seleção mudou depois da geração e aviso não bloqueante.
- `lib/apoiosAcessibilidade.js`: whitelist, instruções de prompt, orientação visual e conferência determinística do exemplo.
- `lib/validacao.js` e `app/api/gerar-material/route.js`: normalização segura no servidor, integração à geração existente e descarte do campo opcional quando não solicitado.
- `app/api/gerar-imagem/route.js`: adaptação do prompt da imagem existente, apenas quando escolhida.
- `lib/material.js` e `components/FolhaA4.jsx`: normalização condicional e renderização do exemplo guiado em todos os formatos que usam a folha.
- `lib/revisao.js`: inclusão do exemplo guiado na conferência de conceitos para evitar falso aviso de conceito órfão.
- `tests/apoios-acessibilidade.test.mjs`, `tests/revisao.test.mjs` e `tests/material.test.mjs`: regressões para seleção, estrutura, compatibilidade e revisão.

## Direção de interface
Reutilizar o formulário, a prévia A4 e o padrão atual de avisos; tornar as opções claramente opcionais, legíveis por teclado e sem bloquear download. Não exibir rótulo de deficiência no material do aluno.
