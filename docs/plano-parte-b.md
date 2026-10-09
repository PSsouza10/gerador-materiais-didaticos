# Fase 1 · Parte B — ligar o banco no site real

**Plano para revisão. Nada aqui foi executado.**
Versão 2 · 09/10/2026 · site real no commit `4c00a00` (banco desligado)

## Ponto de partida
- **Site real:** edugera.vercel.app, projeto Vercel `gerador-materiais-didaticos`. Tudo fica no Vercel Blob (`usuarios/`, `historicos/`, `materiais/`, `apostilas/`).
- **Conta do Paulo:** 29 materiais na lista, 28 com link ativo, contador de uso em 67. A conta é de administrador.
- **Outros professores:** podem ter arquivos também. O inventário (item 7) vai dizer quantos são.
- **Site de teste:** já usa o banco `edugera-teste`. Passou em criação de conta, importação, limite, revogação e exclusão.

**Regra de ouro:** nada é apagado nem movido do Blob durante a Parte B. O banco passa a ser a fonte principal, e o Blob fica como cópia e reserva.

---

## Pré-requisitos (código novo, testado primeiro no site de teste)
| # | Mudança | Motivo |
|---|---|---|
| P1 | Banco de produção só liga com **duas** variáveis: `DATABASE_URL_PRODUCAO` + `BANCO_PRODUCAO=1` | Interruptor que o Paulo liga e desliga sem mexer no código |
| P2 | Marcador do banco aceita "teste" ou "producao"; o código recusa banco com marcador trocado | Impede o site real de usar o banco de teste, e o contrário |
| P3 | Migração em produção só com o interruptor ligado | Hoje a migração é bloqueada em produção |
| P4 | **Interruptor separado `EXCLUSAO_CONTA=1`** para liberar a exclusão em produção | Sem ele, ligar o banco liberaria a exclusão automaticamente |
| P5 | **Dupla gravação**: material novo, lista e uso também vão para o Blob | Voltar para o `4c00a00` sem perder nada |
| P6 | Rotas de administrador: `backup`, `inventario` e `conferir` | Itens 1 e 7 |
| P7 | Importação busca os arquivos em paralelo (até 6 de cada vez) | Login rápido mesmo com 29 materiais |
| P8 | Investigar o contador de uso parado em 67 | A importação copia esse número |

**Nunca trocar** `NEXTAUTH_SECRET` nem `BLOB_READ_WRITE_TOKEN`. Os caminhos dos arquivos de cada professor são calculados com eles; trocar desliga todos os arquivos das contas.

---

## 1. Backup dos 29 materiais (e de todo o resto)
São três cópias independentes:
1. **No próprio Blob:** a rota `POST /api/admin/backup` (só administrador) copia cada arquivo de `usuarios/`, `historicos/`, `materiais/` e `apostilas/` para `backup/2026-MM-DD/<mesmo caminho>`. Ela usa a cópia do próprio Blob, que é feita no servidor e não altera o original.
   - Gera `backup/2026-MM-DD/manifesto.json` com, para cada arquivo: caminho, tamanho, data e **impressão digital SHA-256** do conteúdo. Não tem e-mail nem nome: os caminhos são códigos.
2. **No computador do Paulo:**
   - baixar o `manifesto.json`;
   - em **Minhas Apostilas → Exportar backup**, baixar o arquivo com a lista dos 29;
   - baixar `GET /api/admin/backup?conta=minha`, um JSON com o **conteúdo completo** dos 29 materiais dele.
3. **No Neon:** branch `backup-2026-MM-DD` do banco de produção vazio, criado logo antes de ligar (1 clique, Paulo).

O backup só conta como feito quando o número de arquivos copiados é igual ao do inventário e todas as impressões digitais conferem.

## 2. Links compartilhados preservados
- O endereço não muda: `https://edugera.vercel.app/m/<id>`. O `id` do banco é o **mesmo** id do Blob, e é a chave única da tabela.
- A página `/m/<id>` procura **primeiro no banco** e, se não achar, **no Blob**, como hoje. Material de quem ainda não entrou, ou que não foi importado, continua abrindo pelo Blob.
- Nenhum arquivo `materiais/<id>.json` é apagado durante a Parte B, exceto quando o próprio professor revoga o link (item 12).

## 3. Associação de cada material ao professor certo
- Os arquivos não têm e-mail; o caminho é um código calculado a partir do e-mail. **Não dá para saber o dono sem o professor entrar.** Por isso a associação acontece **no login de cada professor**, quando o sistema sabe o e-mail.
- No 1º login com banco:
  1. a conta é criada (`usuarios.conta` = código do e-mail; o e-mail não é gravado);
  2. o sistema lê a lista antiga desse professor (`historicos/<código>.json`);
  3. para cada item, abre `materiais/<id>.json` e **só traz o conteúdo se a chave de revogação da lista conferir com a do arquivo**. Essa é a prova de que o material é dele;
  4. item sem prova entra só na lista, sem conteúdo, e o link continua abrindo pelo Blob;
  5. os eventos de uso do mês vêm de `usuarios/<código>.json`.
- **Proteção contra "roubo":** se outra conta colou um link alheio na própria lista, ela não fica com o material. Quem prova a chave toma o lugar (há teste automático).
- **Um professor não vê o material de outro:** toda consulta filtra pela conta logada (há teste automático).

## 4. Criação do banco Neon `edugera-producao`
1. **Paulo:** no Neon, clicar em **Novo projeto**:
   - nome `edugera-producao`;
   - região **AWS US East 1 (N. Virginia)**, a mesma do site;
   - só **Postgres** ligado.
2. **Paulo:** clicar em **Connect** e copiar a connection string **com pooling** (endereço com `-pooler`, terminando em `sslmode=require`). Não enviar ao Claude.
3. O banco nasce vazio. As tabelas são criadas pela migração (item 6), não à mão.
4. Plano grátis: 0,5 GB. O uso esperado fica abaixo de 10 MB.

## 5. Variáveis na Vercel (projeto `gerador-materiais-didaticos`)
| Variável | Tipo | Ambiente | Quando | Quem |
|---|---|---|---|---|
| `DATABASE_URL_PRODUCAO` | Secret | **só Production** | dia anterior à virada | Paulo |
| `BANCO_PRODUCAO` = `1` | Config | **só Production** | na virada | Paulo |
| `EXCLUSAO_CONTA` = `1` | Config | **só Production** | só depois da validação final | Paulo |
| `DATABASE_URL_TESTE` | Secret | só Preview | já existe | não muda |
| `IA_SIMULADA` | Config | só Preview | já existe | não muda |
| `NEXTAUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`, `NEXTAUTH_URL` | — | — | — | **não mexer** |

Sem `BANCO_PRODUCAO=1`, o banco não liga em produção, mesmo com a URL colada.

## 6. Como será a migração
Ela tem duas partes.
- **Estrutura (tabelas):** roda sozinha no deploy, só se `BANCO_PRODUCAO=1`. As tabelas são criadas em transação e há arquivo para desfazer (`.down.sql`). Na primeira vez, o script exige um banco vazio e grava o marcador "producao".
- **Dados:** professor por professor, **no login**, como descrito no item 3. Não existe "migração em massa", porque não dá para saber o dono sem o login.
  - Material de quem nunca voltar continua no Blob, com o link funcionando.
  - **Ensaio antes da virada:** no site de teste, o administrador copia **só os próprios arquivos** reais para a pasta `teste/`, entra no site de teste e roda a conferência do item 7. A virada só acontece se o ensaio der 100%.

## 7. Validação de quantidade e integridade
A rota `GET /api/admin/conferir` (só administrador, só a própria conta) compara o Blob com o banco:
| Conferência | Esperado |
|---|---|
| Itens da lista no Blob × no banco | iguais (29) |
| Conjunto de ids | idêntico, nenhum a mais nem a menos |
| Links ativos (com chave, não revogados) | iguais (28) |
| Conteúdo: SHA-256 do JSON no Blob × no banco | igual para cada material com prova |
| Uso do mês (Blob × banco) | igual |
| Ids duplicados no banco | 0 (o banco não permite) |

Além disso, o **inventário geral** (todos os professores, só números) é tirado antes e depois:
- quantidade de contas, listas, itens e links ativos;
- **órfãos:** arquivo de material sem lista;
- **quebrados:** item de lista sem arquivo.

Os números do Blob não podem mudar com a virada.

## 8. Testes de login, geração, biblioteca e PDF (depois de ligar)
1. **Login:** sair e entrar de novo com a conta Google do Paulo; a conta é criada no banco e a importação roda.
2. **Biblioteca:** a lista mostra os 29 itens, com títulos, datas e links iguais aos de antes.
3. **Links antigos:** abrir 3 deles: um importado, um sem prova (servido pelo Blob) e um revogado (precisa dar 404).
4. **Geração real:** gerar uma apostila; ela entra no topo da lista (30) e o link abre.
5. **Dupla gravação:** a apostila nova também aparece no arquivo do Blob (conferência pelo item 7).
6. **PDF:** "PDF do aluno" e "PDF do professor" geram o arquivo.
7. **Uso:** o contador sobe 1.
8. **Isolamento:** uma 2ª conta Google entra e vê lista vazia, sem nada do Paulo.
9. **Limite:** numa conta comum, a 6ª geração do mês é bloqueada (planos e limites não mudam).

## 9. Rollback para o commit `4c00a00`
Dois níveis, do mais rápido ao mais completo:
1. **Desligar o banco (≈2 min):** Paulo apaga `BANCO_PRODUCAO` na Vercel e faz Redeploy. O site volta a usar só o Blob, com o código novo.
2. **Voltar ao `4c00a00` (instantâneo):** Vercel → Deployments → deploy do `4c00a00` (09/10, 08:57) → **Promote to Production**. Alternativa: `git revert` dos commits da Parte B e push.

Graças à dupla gravação (P5), o que foi criado durante a Parte B também está no Blob, e o `4c00a00` enxerga tudo. Só o **perfil** (nome, escola, disciplinas), que é novo, fica apenas no banco. O banco não é apagado no rollback; ele fica parado para religar depois.

## 10. Sem perda e sem duplicação
| Risco | Proteção |
|---|---|
| Material duplicado | `id` é chave única no banco; importação usa "se já existe, não insere" |
| Importação rodando duas vezes | a conta tem `importado_em`, e só a 1ª chamada "reserva" a importação |
| Importação pela metade | tudo numa transação; se falhar, nada fica e tenta de novo no próximo login |
| Dois aparelhos sincronizando | regras do histórico de hoje: revogado não volta, removido não reaparece |
| Perda no Blob | nada é apagado; backup triplo (item 1) |
| Perda no rollback | dupla gravação (P5) |
| Chave do servidor trocada | proibido trocar `NEXTAUTH_SECRET` e o token do Blob |

## 11. Sem interromper o site
- O deploy da Vercel troca de versão de uma vez, sem tempo fora do ar.
- A migração de estrutura só cria tabelas vazias (segundos, durante o build). O site antigo segue no ar até o novo ficar pronto.
- A importação é por professor, no login: só aquele login leva 2 a 5 segundos a mais, uma única vez. Os outros não percebem.
- **Horário:** à noite ou no fim de semana, quando há menos uso.

## 12. Links compartilhados e revogação
- **Material importado:** revogar marca "revogado" no banco, apaga o conteúdo do banco **e apaga a cópia do Blob**. Sem isso o link voltaria pela reserva (já é assim no teste).
- **Material só no Blob:** revogar funciona como hoje (chave confere → apaga o arquivo).
- **Revogado antes da virada:** chega ao banco já como revogado e continua 404.
- A chave de revogação nunca vai para a página pública; no banco fica só a impressão digital dela.

## 13. Exclusão de conta protegida até a validação final
- Hoje, em produção, a exclusão está **escondida e bloqueada** porque o banco está desligado.
- Com P4, ligar o banco **não** libera a exclusão: ela exige também `EXCLUSAO_CONTA=1`, criada pelo Paulo **só depois** de todo o checklist aprovado.
- Antes de liberar, mais um teste de exclusão no site de teste, com dados reais copiados (como no ensaio do item 6).
- Com a exclusão liberada, ela apaga a conta, a lista, os links e o uso **daquele professor**, inclusive as cópias no Blob. O backup do dia da virada continua guardado por 30 dias. Depois disso, o Paulo decide se apaga o backup, em respeito à LGPD.

---

## Checklist de execução
**Preparação (sem mudar nada para os professores)**
- [ ] P1 a P8 prontos, com testes automáticos passando
- [ ] Ensaio no site de teste com cópia dos dados reais do Paulo: conferência 100%
- [ ] Teste de exclusão repetido no site de teste
- [ ] Código publicado no site real **com interruptores desligados**; o site continua igual (login, gerar, lista, PDF)
- [ ] Inventário geral "antes" salvo
- [ ] Backup no Blob feito; manifesto conferido (quantidade e SHA-256)
- [ ] Paulo baixou o manifesto, o "Exportar backup" e o backup completo da conta dele
- [ ] Paulo criou `edugera-producao` no Neon e colou `DATABASE_URL_PRODUCAO` (só Production)

**Virada (noite ou fim de semana)**
- [ ] Paulo cria o branch `backup-AAAA-MM-DD` no Neon
- [ ] Paulo cria `BANCO_PRODUCAO=1` (só Production) e faz Redeploy
- [ ] Deploy concluído; migração aplicou 0001, 0002 e 0003; marcador "producao"
- [ ] `/api/saude` em produção continua **404**
- [ ] Paulo sai e entra de novo → conferência (item 7) 100%
- [ ] Testes do item 8 (1 a 9) aprovados
- [ ] Inventário geral "depois": números do Blob iguais aos de "antes"
- [ ] 24 h sem erro de banco nos registros da Vercel

**Depois**
- [ ] 7 dias estáveis → Paulo cria `EXCLUSAO_CONTA=1` (opcional)
- [ ] 30 dias estáveis → decisão de desligar a dupla gravação e apagar o backup

## Checklist de rollback
- [ ] Anotar o horário e o que deu errado (sem dados pessoais)
- [ ] **Nível 1:** apagar `BANCO_PRODUCAO` → Redeploy → aguardar ~2 min
- [ ] Conferir: login, lista com os mesmos itens, links abrem, gerar, PDF
- [ ] Se ainda houver erro, **nível 2:** Deployments → deploy do `4c00a00` → **Promote to Production**
- [ ] Conferir de novo: `/api/uso` sem e-mail, botão de exclusão escondido, lista e links ok
- [ ] Rodar o inventário: números do Blob iguais aos de antes da virada
- [ ] Se algum arquivo do Blob estiver corrompido: copiar de volta de `backup/AAAA-MM-DD/` (rota de administrador, só com autorização do Paulo)
- [ ] **Não** apagar o banco `edugera-producao`: fica parado para análise
- [ ] Relatório ao Paulo antes de qualquer nova tentativa

**Fora da Parte B:** pagamentos, planos, limites, n8n.
