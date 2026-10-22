# TODO — EduGera

## Apoios de acessibilidade — concluído
- [x] Exibir apoios pedagógicos opcionais no gerador: instruções diretas, etapas numeradas, exemplo guiado e ilustração simples.
- [x] Explicar que são escolhas para a atividade, não diagnóstico ou perfil clínico; não pedir nem enviar dados pessoais de estudantes.
- [x] Aplicar whitelist e normalização no servidor, usar a chamada de geração existente e descartar exemplo guiado não solicitado.
- [x] Mostrar os apoios e avisos estruturais sem bloquear impressão ou download.

## Lista econômica A4 em uma página — concluído e publicado
- [x] Oferecer uma folha com exercícios, identificação e BNCC, sem capa, resumo ou gabarito, reaproveitando a geração existente.
- [x] Ajustar escala e manter o texto pesquisável; preservar as saídas completas existentes.
- [x] Validar em testes e build, auditar o contexto das falas e publicar pelo PR #14.

## Contador agregado de auditorias — branch de revisão
- [x] Registrar uma vez por execução concluída da auditoria determinística no servidor, sem nova chamada de IA e sem bloquear a geração.
- [x] Persistir somente o total agregado em Blob privado, com atualização condicional por ETag e separação entre Preview/teste e produção.
- [x] Mostrar a métrica em página administrativa não indexada e protegida por autenticação/role.
- [x] Explicar que o contador começa com a ativação, não retroage e pode deixar de registrar um evento se o armazenamento falhar; nenhuma informação pessoal ou conteúdo é guardado.
- [x] Validar incrementos concorrentes; os 289 testes e o build de produção passam.
- [ ] Abrir PR separado e aguardar autorização antes de mesclar/publicar.
