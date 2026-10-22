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

## Contador agregado de auditorias — PR #15 publicado
- [x] Registrar uma execução concluída da auditoria determinística no servidor, sem nova chamada de IA e sem bloquear a geração.
- [x] Persistir apenas o total agregado em Blob privado, com atualização condicional por ETag e separação de caminhos entre Preview/teste e produção.
- [x] Mostrar a métrica em página administrativa não indexada e protegida por autenticação/role; documentar que a contagem não é retroativa.
- [x] Mesclar e publicar a primeira versão pelo PR #15; a tela de métricas mostrou “Indisponível” porque o aplicativo ainda não selecionava o store privado conectado.

## Correção do acesso ao store privado — em branch
- [x] Criar o store privado `edugera-auditorias` em `gru1` e conectá-lo ao projeto `gerador-materiais-didaticos` somente em Production e Preview, usando as variáveis `AUDITORIAS_*` sem substituir as variáveis `BLOB_*` existentes.
- [x] Corrigir o contador para passar o ID do store, priorizar OIDC e limitar o fallback ao token `AUDITORIAS_READ_WRITE_TOKEN`; nunca usar o token do store público.
- [x] Adicionar testes de OIDC, fallback escopado, ausência de credenciais, concorrência e separação de caminhos.
- [ ] Executar suíte completa, build e checks do preview do PR; confirmar o contador depois do deploy autorizado.
- [ ] Manter em branch/PR e aguardar autorização antes de mesclar a correção.
