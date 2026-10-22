# TODO — Apoios de acessibilidade no EduGera

## Seleção pedagógica e privacidade — concluído
- [x] No gerador de apostilas, exibir apoios opcionais para “Instruções curtas e diretas”, “Etapas curtas e numeradas”, “Exemplo guiado antes dos exercícios” e “Ilustração simples, sem detalhes decorativos”.
- [x] Explicar que os apoios podem ajudar estudantes com TEA e outras necessidades, que cada estudante é único e que a escolha deve fazer sentido para a atividade, sem presumir um perfil comum.
- [x] Não solicitar nome, diagnóstico, laudo ou outros dados pessoais de estudantes; orientar o professor a não inserir esses dados no campo livre.

## Geração, material e auditoria — concluído
- [x] Aplicar somente os apoios escolhidos dentro da chamada de geração existente, sem nova chamada de IA; preservar habilidade BNCC, objetivo de aprendizagem e dificuldade selecionada.
- [x] Incluir um exemplo guiado com título e 2–5 etapas somente se solicitado; descartar resposta não solicitada da IA; exibir antes dos exercícios na prévia, impressão, PDF e link compartilhado.
- [x] Se “Ilustração simples” for selecionada, ajustar somente o prompt da chamada de imagem já existente, sem gerar imagem adicional.
- [x] Conferir deterministicamente se o exemplo guiado pedido tem título e pelo menos duas etapas; mostrar eventual aviso ao professor sem bloquear geração, impressão ou download.
- [x] Descrever as conferências como estruturais, não semânticas ou diagnósticas; lembrar que é necessária revisão docente e que o recurso não substitui planejamento individual, AEE, PAEE ou PEI.
- [x] Fazer a conferência usar os apoios da geração efetivamente exibida e avisar quando a seleção atual do formulário mudou depois de gerar.

## Entrega — concluído para revisão
- [x] Manter a alteração em `feature/apoios-acessibilidade-tea`, pronta para revisão e sem publicação em produção.


## Lista econômica de exercícios em uma página — em revisão
- [x] Oferecer no gerador uma opção para baixar uma folha A4 somente com os exercícios, identificação e BNCC, sem capa, resumo ou gabarito.
- [x] Reaproveitar os exercícios já gerados, sem fazer chamada extra de IA.
- [x] Ajustar proporcionalmente o conteúdo para que o PDF compacto caiba em uma página A4, preservando a camada de texto pesquisável.
- [x] Manter o PDF completo do aluno/professor e a opção econômica como saídas distintas.
- [x] Validar com testes automatizados e build; manter a alteração em branch separada até aprovação.
