# 06 · Ciclo de Recomposição da Rede (piloto)

> **Estado: rascunho.** Feito em 22/10/2026, no site de teste (fase-0). Ainda não foi publicado no edugera.app.

## O ciclo
1. **Caderno único.** A coordenação gera ou abre uma avaliação, clica em **Distribuir para as escolas** e informa a lista de escolas. O site devolve um código de 8 letras e o link `/caderno/<código>`.
2. **Professores.** Abrem o link e entram com o Google. Clicam em **Adicionar às minhas avaliações**: a avaliação vai para "Minhas avaliações", neste navegador, sem a opção de trocar ou editar questões, para o resultado ser comparável. Aplicam, corrigem pela foto ou à mão e clicam em **Enviar resultado** (escola da lista e turma).
3. **Painel** (`/caderno/<código>/painel`, só quem criou o caderno ou um administrador):
   - acerto por escola × habilidade, ou por descritor quando a prova tem uma habilidade só;
   - acerto e erro mais comum de cada questão na rede;
   - turmas que enviaram.
4. **Recomposição.** Na correção de cada turma aparecem as 2–3 habilidades (ou descritores) mais fracas, com botões para gerar a apostila (e a lista A4) e o plano de aula, já preenchidos com habilidade, ano e tema.
5. **Mini-reavaliação.** No painel, **Gerar mini-reavaliação** cria de 6 a 8 questões novas, "irmãs" das questões dos grupos abaixo de 70% (mesma habilidade, descritor e nível, sem repetir). Cada uma passa pela conferência da troca de questão. Com elas, a coordenação cria o caderno da reavaliação, que tem um link próprio. Quando as turmas enviam, o painel mostra **antes × depois** por grupo, na rede e em cada escola.

## Dados (LGPD)
- **O que vai ao servidor:** por turma, a escola, a turma (ex.: "7º A"), o número de alunos e, por questão, **quantos** marcaram A, B, C, D, branco e dupla. Também vai o código da conta do professor, para ele poder reenviar. O painel nunca mostra o professor.
- **O que não vai:** nome, número de chamada, respostas individuais e foto. O servidor recusa qualquer campo além das contagens (`validarEnvio`, com teste).
- Turma ou escola com **menos de 5 alunos** aparece como "—" (`MIN_ALUNOS`), para evitar identificar aluno.
- A foto do cartão continua indo ao Gemini (ou à OpenAI) só para leitura, como na correção normal.
- Tabelas: `cadernos` e `resultados_turma` (migração 0010). Apagar o caderno apaga os resultados. Se a conta do professor for excluída, o resultado fica sem dono.
- **Antes do piloto:** termo de tratamento de dados com a escola ou a Secretaria; prazo para apagar os cadernos ao fim do piloto **[definir, ex.: 90 dias]**.

## Administração do piloto (`/admin/piloto`, só administradores)
- **Coordenação:** marca as contas que podem criar cadernos (coluna `usuarios.coordenador`). Administradores já podem.
- **Professores:** libera o Pro sem cobrança por N dias (padrão 60). A correção pela foto é do Pro. Quem já paga continua com o pagamento valendo.
- Os e-mails digitados não são guardados: o banco recebe só o código da conta.
- Lista de cadernos da coordenação: `/cadernos`.

## Custo
- Caderno, envio e painel: nenhuma IA.
- Recomposição: cada apostila ou plano conta 1 geração do professor.
- Mini-reavaliação: uma chamada de troca por questão nova, de 6 a 8 por caderno. Não consome a cota de trocas do coordenador. O custo aparece em `/admin/custos`, na rota `reavaliacao-item`.

## Código
- Regras puras: `lib/ciclo.js` (contagem, validação, agregação, grupos, vagas da reavaliação, antes × depois, recomposição).
- Banco: `lib/cadernos.js`. Questão nova: `lib/novaQuestao.js`, usada também por "Trocar esta questão".
- Rotas: `app/api/cadernos/*`, `app/api/admin/piloto`.
- Telas: `components/ciclo/*`, `app/caderno/[codigo]`, `app/cadernos`, `app/admin/piloto`.
- Testes: `tests/ciclo.test.mjs`. O teste ponta a ponta local usa Postgres e `scripts/banco-local.mjs`. Esse preload só liga com `BANCO_LOCAL=1` e fora da produção.

## Limites conhecidos
- A avaliação do caderno fica no navegador de cada professor. Se ele trocar de computador, abre o link de novo.
- Caderno de no máximo 12 questões e 60 escolas.
- O antes × depois compara questões diferentes da mesma habilidade, descritor e nível. É um indicador, não uma medida exata.
- Ainda não existe: botão de encerrar caderno, exportar o painel, nem várias redes separadas (organizações). Isso fica para depois do piloto.
