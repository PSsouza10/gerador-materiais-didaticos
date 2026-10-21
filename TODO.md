# TODO — Auditoria automática do EduGera

## Auditoria sem custo extra de IA — concluído

A auditoria determinística existente foi integrada ao resultado da geração e ampliada para detectar os quatro problemas aprovados: nome inadequado para a propriedade comutativa da adição; orientação que pode sugerir trocar a ordem dos termos na subtração; divergência entre preços e totais declarados em exemplos de compra quando a apostila inclui tabela de preços; e exercício de associação com duas colunas pedidas, mas apenas uma apresentada. A revisão semântica com Gemini/OpenAI não é chamada automaticamente.

## Exibição sem bloqueio — concluído

O gerador mostra um resumo de erros e avisos, apresenta os achados pedagógicos específicos e informa que a análise não substitui a revisão do professor. O resultado da nova auditoria não bloqueia automaticamente a geração nem o download; os alertas e confirmações preexistentes continuam separados.

## Validação e publicação — validado, ainda não publicado

Os testes incluem os quatro casos positivos, exemplos de regra correta e combinação de preços correta sem falso alerta, exercício com duas colunas e inclusão dos achados no resumo da auditoria. A suíte completa do projeto passou (275 testes, 0 falhas), o build Next.js compilou e `git diff --check` não encontrou problemas de whitespace.

A implementação está na branch local `feature/auditoria-automatica-didatica`, baseada na `main` atual. Nenhuma publicação em produção foi feita. Antes de disponibilizar em produção, é necessário revisar e integrar a branch.
