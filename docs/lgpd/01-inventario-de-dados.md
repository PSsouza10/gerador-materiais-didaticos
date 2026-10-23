# LGPD · Inventário de dados pessoais

> **Estado: rascunho.** Escrito a partir do código (commit `07b5a2e`, 22/10/2026). Não revisado por advogado.
> Itens marcados **[confirmar]** dependem de configuração da Vercel ou de contas que o código não mostra.

**Controlador:** Paulo Sergio Souza de Jesus (pessoa física, CPF), responsável pelo EduGera (`components/PaginaLegal.jsx`).
**Encarregado (DPO):** o próprio controlador, pelo e-mail de suporte (`suporteEmail()` em `lib/planos.js`).

## Titulares
1. **Professores e professoras** (usuários com login Google). Adultos.
2. **Estudantes** (menores de idade, na maioria). Não são usuários. Aparecem só quando o professor usa a correção da turma ou escreve algo sobre eles nos campos livres.
3. **Compradores do Pro.** São os próprios professores, mas os dados de pagamento ficam no Asaas.

## Inventário

| # | Dado | Titular | Onde fica | Finalidade | Base legal (como publicada) | Retenção | Código |
|---|---|---|---|---|---|---|---|
| 1 | Nome, e-mail e foto do Google | Professor | Cookie de sessão assinado (JWT), no navegador | Identificar a sessão | Execução do serviço (art. 7º, V) | 30 dias ou até sair | `lib/auth.js` (`maxAge` 30 dias) |
| 2 | Código da conta: HMAC do e-mail (o e-mail **não** vai para o banco) | Professor | Neon (Postgres), tabela `usuarios.conta` | Ligar materiais, uso e assinatura à conta | Execução do serviço | Enquanto a conta existir | `db/migracoes/0002`, `lib/contas.js` |
| 3 | Perfil opcional: nome de exibição, escola, disciplinas | Professor | Neon, `usuarios` | Preencher a folha (cabeçalho) e as preferências | Execução do serviço | Enquanto a conta existir | `lib/contas.js` (`perfil`) |
| 4 | Lista "Minhas Apostilas": título, tema, disciplina, BNCC, data, link, chave de revogação (hash) | Professor | Neon `materiais` (e arquivos antigos em Blob `historicos/`) | Mostrar a lista em todos os aparelhos | Execução do serviço | Enquanto a conta existir | `lib/contas.js`, `lib/historico.js` |
| 5 | Conteúdo do material salvo (todo material gerado com login é salvo), com cabeçalho da folha: nome do professor, escola e turma, se preenchidos | Professor | Neon `materiais.conteudo` **e** cópia no Blob `materiais/<id>.json` ("dupla gravação" da Parte B; acesso público por endereço aleatório de 64 bits) | Abrir o material, link `/m/<id>`, sobreviver a rollback | Execução do serviço | Até revogar ou excluir a conta | `app/api/salvar-material/route.js`, `app/m/[id]` |
| 6 | Ilustrações geradas | — (não é dado pessoal, salvo se o professor descrever pessoa real) | Blob (público, endereço aleatório) | Folha do material | Execução do serviço | Sem prazo definido **[definir]** | `app/api/gerar-imagem` |
| 7 | Eventos de uso: tipo (geração, correção, revisão, imagem, troca), data, request_id | Professor (pelo código da conta) | Neon `eventos_uso` | Limites do plano | Execução do serviço | Enquanto a conta existir **[definir prazo menor]** | `lib/uso.js`, migrações 0002/0004/0008 |
| 8 | Assinatura e cobranças: plano, situação, valor, validade, id da cobrança no Asaas, referência aleatória | Professor | Neon `assinaturas`, `checkouts`, `cobrancas` | Liberar o Pro | Execução de contrato | Enquanto a conta existir + prazo legal de registros fiscais **[confirmar prazo com contador]** | `lib/cobranca.js`, migrações 0004–0007 |
| 9 | Nome, CPF, e-mail, endereço, cartão ou Pix do comprador | Professor | **Só no Asaas.** O EduGera manda ao Asaas apenas a referência aleatória (`externalReference`) e o item | Pagamento | Execução de contrato (pelo Asaas) | Regras do Asaas | `lib/asaas.js` |
| 10 | Texto do formulário (tema, orientações, habilidade, nível) | Professor; eventualmente estudante, se o professor escrever nomes | Enviado à OpenAI e/ou ao Gemini; **não é guardado** pelo EduGera depois da geração, exceto o que vira o material (linha 5) | Gerar o material | Execução do serviço | Não guardado (provedores: ver `02-operadores.md`) | rotas `app/api/gerar-*` |
| 11 | PDF enviado para gerar plano de aula (Pro) | Professor; terceiros citados no PDF | Enviado à OpenAI ou ao Gemini; não guardado | Gerar o plano | Execução do serviço | Não guardado | `app/api/gerar-plano` |
| 12 | **Correção da turma:** nome ou número do aluno e respostas | **Estudante** | **Só no navegador do professor** (`localStorage`, chave `edugera:correcao:<id>`). Não vai ao servidor | Nota e relatório da turma | Execução do serviço ao professor **[advogado: base para dado de criança/adolescente, art. 14]** | Até o professor apagar ou limpar o navegador | `lib/correcao.js`, `components/CorrecaoTurma.jsx` |
| 13 | **Foto do cartão-resposta** (pode mostrar o nome do aluno escrito) | **Estudante** | Enviada ao Gemini (se falhar, à OpenAI) só para ler as letras; **não é guardada** pelo EduGera. A IA é instruída a não extrair o nome | Ler as marcações | Execução do serviço ao professor **[advogado: art. 14]** | Não guardada pelo EduGera (provedores: ver operadores) | `app/api/ler-cartao/route.js` |
| 14 | Relatório da turma (PDF/planilha) | Estudante | Gerado no aparelho do professor | Entregar à escola | — | Fica com o professor | `components/CorrecaoTurma.jsx` |
| 15 | Registros técnicos (logs): request_id, rota, método, status, duração; mensagens de erro curtas | Indireto | Logs da Vercel | Segurança, diagnóstico | Legítimo interesse (art. 7º, IX) | Retenção do plano da Vercel **[confirmar]** | `lib/requestId.js` |
| 16 | Custo de IA por pedido: rota, modelo, tokens, custo | Nenhum (sem conta, sem conteúdo) | Neon `custos_ia` | Calcular preço | — (não pessoal) | Sem prazo **[definir, ex.: 12 meses]** | `lib/custoIA.js`, migração 0009 |
| 17 | Contador de auditorias (só um total) | Nenhum | Blob privado `edugera-auditorias` (gru1) | Métrica | — (não pessoal) | — | `lib/contadorAuditorias.js` |
| 18 | Preferências do formulário e rascunhos | Professor | `localStorage` do navegador | Conveniência | — | Até limpar o navegador | `lib/local.js` |
| 19a | **Ciclo de Recomposição:** caderno (avaliação com gabarito, lista de escolas) e resultado por turma: escola, turma, nº de alunos e **contagem** de respostas por questão | Professor (pelo código da conta); **nenhum dado de aluno** | Neon `cadernos`, `resultados_turma` | Painel agregado da coordenação | Execução do serviço / contrato com a escola **[advogado]** | Até apagar o caderno **[definir prazo do piloto]** | `lib/cadernos.js`, `lib/ciclo.js`, migração 0010 |
| 19b | Marca de coordenador | Professor | Neon `usuarios.coordenador` | Permitir criar cadernos | Execução do serviço | Enquanto a conta existir | `lib/cadernos.js` |
| 19 | E-mails de administrador | Paulo | Variável `ADMIN_EMAILS` na Vercel | Acesso ao painel | — | — | `lib/uso.js` |

## O que o EduGera **não** coleta
- CPF ou dados de cartão (ficam no Asaas).
- Gmail, Drive ou contatos do Google: o login pede só o perfil básico.
- Cookies de publicidade ou de rastreamento.
- Dados de estudantes no servidor: a correção da turma fica no aparelho do professor.

## Lacunas encontradas (para corrigir)
1. **O Neon (banco de dados, EUA) não aparece na Política de Privacidade.** A seção 5 cita só Vercel, Google, Asaas e OpenAI. O banco guarda as linhas 2 a 8.
2. **O perfil (linha 3) não aparece na Política.** Ela fala de nome e escola só nos links compartilhados.
3. **A cópia de cada material no Blob é pública** (endereço aleatório de 64 bits, difícil de adivinhar, mas sem login). Isso vale para todo material salvo, não só para os que o professor compartilhou. A "dupla gravação" não tem prazo de fim no código. Decidir: encerrar a cópia, ou passar para um Blob privado, agora que o banco está estável.
4. **Sem prazo de retenção** para eventos de uso, ilustrações e custos de IA.
5. **Exclusão de conta:** em produção, só funciona com `EXCLUSAO_CONTA=1` **[confirmar se está ligada]**. Sem ela, o pedido de exclusão é feito à mão (ver `05-direitos-dos-titulares.md`).
6. **Dado de estudante:** a foto passa por IA nos EUA. Para vender a escolas e redes, é preciso contrato de tratamento de dados (DPA) com a escola ou a Secretaria, que é a controladora dos dados dos alunos. Nesse cenário o EduGera é operador.
