# Fase 1 · Parte B — ligar o banco no site real (PLANO, não executado)

Situação em 09/10/2026: o site real (edugera.vercel.app, projeto Vercel `gerador-materiais-didaticos`) roda o código da Fase 1 com o banco **desligado** (commit `4c00a00`). Tudo continua no Vercel Blob. O site de teste já usa o banco Neon `edugera-teste` e passou nos testes de exclusão e recriação de conta.

**Princípio:** nada é apagado ou movido do Blob. O banco passa a ser a fonte principal, e o Blob vira cópia de segurança e reserva. Voltar atrás tem de ser possível a qualquer momento.

---

## 0. Antes de começar (bloqueios)
| # | Item | Por quê |
|---|---|---|
| 0.1 | Investigar o contador de uso parado em 67 (conta admin) | A importação copia esse contador; precisa estar certo antes |
| 0.2 | **Não trocar** `NEXTAUTH_SECRET` nem `BLOB_READ_WRITE_TOKEN` | Os caminhos dos arquivos de cada professor são calculados com essa chave. Trocar = perder o vínculo com todos os arquivos |
| 0.3 | Ajustar o marcador do banco (ver 1.3) | Hoje a migração 0001 grava sempre "teste" |
| 0.4 | Escrever a "dupla gravação" (ver 5.3) | Garante que voltar atrás não perde nada |

## 1. Banco Neon separado para produção
1. **Paulo** cria o projeto `edugera-producao` no Neon: AWS US East 1, só Postgres, plano grátis.
2. Usar a connection string **com pooling** (`-pooler` no endereço).
3. Mudanças de código (Claude, testadas no site de teste antes):
   - `lib/banco.js`: em produção, ler **somente** `DATABASE_URL_PRODUCAO`, e só se `BANCO_PRODUCAO=1`. Essa variável funciona como interruptor geral.
   - Tabela `ambiente` passa a aceitar `'teste'` ou `'producao'`. O script de migração grava o marcador conforme o ambiente. **O código recusa conectar** se o marcador não bater (produção nunca usa banco "teste", e vice-versa).
   - `scripts/migrar.mjs`: modo produção só com `--producao --confirmar` e com o interruptor ligado. No build da Vercel, a migração de produção só roda nessa condição.
4. Teste automático novo: produção sem interruptor = banco desligado; marcador trocado = recusa.

## 2. Variáveis de ambiente (Vercel → `gerador-materiais-didaticos`)
| Variável | Tipo | Ambiente | Quem |
|---|---|---|---|
| `DATABASE_URL_PRODUCAO` | Secret | **só Production** | Paulo cola |
| `BANCO_PRODUCAO` | Config, valor `1` | **só Production** | Paulo, no dia da virada |
| `DATABASE_URL_TESTE` | Secret | só Preview | já existe, não muda |
| `NEXTAUTH_SECRET`, `BLOB_READ_WRITE_TOKEN` | — | — | **não mexer** |

O interruptor `BANCO_PRODUCAO` é criado por último, no dia da virada. Sem ele, mesmo com a URL colada, o banco não liga.

## 3. Backup do Vercel Blob
1. Rota de administrador nova `/api/admin/backup`, só para e-mails em ADMIN_EMAILS. Ela copia, dentro do próprio Blob, cada arquivo de `usuarios/`, `historicos/`, `materiais/` e `apostilas/` para `backup/AAAA-MM-DD/...`. A cópia é feita pelo servidor e não apaga nada.
2. Gera um manifesto `backup/AAAA-MM-DD/manifesto.json` com caminho, tamanho e data de cada arquivo. Não contém e-mails: os caminhos são códigos.
3. Uso atual: cerca de 5 MB de 1 GB. O backup cabe com folga.
4. Antes de cada migração no banco de produção: criar no Neon o branch `backup-AAAA-MM-DD` (Paulo, 1 clique).

## 4. Inventário dos materiais atuais
Rota de administrador `/api/admin/inventario`, só leitura. Devolve números, sem dados pessoais:
- quantidade de arquivos de uso (≈ contas que já geraram), de listas de histórico e de materiais compartilhados;
- total de itens nas listas e quantos têm link ativo;
- **órfãos**: materiais no Blob que não aparecem em nenhuma lista (continuam abrindo pelo link);
- **quebrados**: itens da lista cujo arquivo não existe mais.

O inventário é salvo junto do backup. Referência atual da conta do Paulo: 29 itens, 28 links ativos.

## 5. Migração dos materiais
### 5.1 Como associar material ↔ professor
- Os arquivos do Blob não têm e-mail: o caminho é um código calculado a partir do e-mail. **Não dá para descobrir o dono de um arquivo sem o professor entrar.** Por isso a importação é feita **no login de cada professor**. Esse código já existe e foi testado (`lib/importacao.js`).
- No login: a conta é criada no banco e os dados antigos vêm do Blob, nesta ordem:
  1. lista "Minhas Apostilas";
  2. conteúdo dos links — só quando a chave de revogação confere, o que prova que o material é daquela conta;
  3. eventos de uso.
- Importa uma vez por conta, dentro de uma transação: se falhar, nada fica pela metade e tenta de novo no próximo acesso.
- Quem colou o link de outra pessoa não "rouba" o material: quem prova a chave fica com ele (há teste automático para isso).

### 5.2 Quem nunca entrar de novo
Os materiais dessa pessoa ficam no Blob e **o link `/m/<id>` continua abrindo**: a página procura no banco e, se não achar, procura no Blob. Ninguém perde link compartilhado.

### 5.3 Dupla gravação (proteção para voltar atrás)
Durante os primeiros 30 dias com banco ligado:
- material novo é gravado **no banco e também no Blob**;
- a lista "Minhas Apostilas" também é sincronizada no arquivo do Blob.

Assim, se for preciso desligar o banco, nada criado nesse período se perde. Depois de 30 dias estáveis, a dupla gravação é desligada (decisão do Paulo).

### 5.4 Ensaio com dados reais antes da virada
No site de teste, o administrador copia **só os próprios arquivos** do Blob real para a pasta `teste/` e entra no site de teste. A importação roda sobre essa cópia, e comparamos: itens, links ativos, contador. Só depois a virada no site real.

## 6. Plano de rollback
| Situação | Ação | Perda |
|---|---|---|
| Erro logo após ligar | Paulo apaga `BANCO_PRODUCAO` → redeploy (≈2 min) → site volta ao Blob | nenhuma (dupla gravação) |
| Erro no código novo | Vercel → Deployments → deploy anterior → *Promote to Production* | nenhuma |
| Migração com problema | `npm run migrar -- down --confirmar` ou restaurar o branch `backup-AAAA-MM-DD` no Neon | nenhuma |
| Arquivo do Blob corrompido | copiar de volta de `backup/AAAA-MM-DD/` | nenhuma |

## 7. Checklist de validação (no dia da virada)
- [ ] Backup feito e manifesto conferido (quantidade = inventário)
- [ ] Branch de backup no Neon criado
- [ ] `/api/saude` em produção continua 404; marcador do banco de produção = "producao"
- [ ] Login do Paulo: lista com os mesmos 29+ itens, mesmos links ativos, contador igual ao de antes
- [ ] Abrir 3 links antigos `/m/<id>` (do banco e de órfão do Blob): todos abrem
- [ ] Gerar apostila real: entra na lista, link abre, PDF do aluno e do professor saem
- [ ] Revogar um link de teste: deixa de abrir
- [ ] Conta de outro professor (2ª conta Google) não vê nada do Paulo
- [ ] Limite do plano grátis: a 6ª geração do mês é bloqueada numa conta comum
- [ ] Desligar e religar o interruptor e conferir que nada some (teste do rollback)
- [ ] Logs da Vercel sem erro de banco por 24 h

## 8. Estratégia de publicação sem perda de dados
1. **Código** (0.1, 0.3, 0.4 e seções 1, 3 e 4) vai primeiro para o site de teste, com testes automáticos e o ensaio da 5.4.
2. Publicar o código no site real **com o interruptor desligado**: nada muda para os professores.
3. Rodar backup e inventário em produção (só leitura e cópia).
4. **Paulo** cria `edugera-producao` e cola `DATABASE_URL_PRODUCAO` (só Production).
5. Em horário de pouco uso (noite ou fim de semana): criar o branch de backup no Neon e ligar `BANCO_PRODUCAO=1`. O redeploy roda a migração.
6. Paulo entra no site e confere o checklist 7.
7. Observação por 7 dias; dupla gravação mantida por 30 dias.
8. Exclusão de conta no site real só é liberada depois do item 7 aprovado.

**Fora desta etapa:** pagamentos, planos, limites novos, n8n.
