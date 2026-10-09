# Fase 1 · Parte B — ligar o banco no site real

**Plano para revisão. Nada executado.**
Versão 4 · 09/10/2026 (ajustes do Paulo: seção 13) · site real no commit `4c00a00`, banco desligado

**Ponto de partida:**
- Site real: projeto Vercel `gerador-materiais-didaticos`. Tudo fica no Vercel Blob.
- Conta do Paulo: 29 materiais, 28 links ativos, uso 67 (administrador).
- Outros professores: o inventário (item 7) vai dizer quantos são.

**Regra de ouro:** nada é apagado nem movido do Blob durante a Parte B.

**Pré-requisitos de código.** Tudo testado primeiro no site de teste; nada vai ao site real sem a sua autorização.
- **P1. Interruptor do banco:** em produção, o banco só liga com `DATABASE_URL_PRODUCAO` **e** `BANCO_PRODUCAO=1`.
- **P2. Marcador:** cada banco tem um marcador, "teste" ou "producao". O código recusa banco com o marcador trocado.
- **P3. Migração protegida:** em produção, a migração só roda com o interruptor ligado.
- **P4. Exclusão protegida:** a exclusão de conta em produção exige um interruptor próprio, `EXCLUSAO_CONTA=1`. Sem ele, ligar o banco liberaria a exclusão sozinha.
- **P5. Dupla gravação:** material novo, lista e uso também são gravados no Blob, por 30 dias.
- **P6. Rotas de administrador:** `backup`, `inventario` e `conferir`.
- **P7. Importação rápida:** os arquivos são buscados em paralelo, 6 por vez.
- **P8. Contador de uso:** investigar por que ficou parado em 67.
- **Proibido trocar** `NEXTAUTH_SECRET` e `BLOB_READ_WRITE_TOKEN`. Os caminhos dos arquivos são calculados com eles; trocar desliga os arquivos de todas as contas.

---

## 1. Backup dos 29 materiais e metadados
Três cópias independentes, feitas antes de ligar o banco:
1. **No Blob:**
   - a rota `POST /api/admin/backup` (só administrador) copia, no servidor e sem alterar o original, todos os arquivos de `usuarios/`, `historicos/`, `materiais/` e `apostilas/` para `backup/AAAA-MM-DD/`;
   - ela gera `manifesto.json`: caminho, tamanho, data e SHA-256 de cada arquivo, sem e-mail nem nome.
2. **No computador do Paulo:**
   - o `manifesto.json`;
   - "Minhas Apostilas → Exportar backup", com a lista e os metadados dos 29: título, tema, disciplina, ano, BNCC, data, link e situação;
   - `GET /api/admin/backup?conta=minha`, com o conteúdo completo dos 29.
3. **No Neon:** branch `backup-AAAA-MM-DD`, criado logo antes de ligar.

**O backup só vale se:** o número de arquivos copiados = o do inventário, e todos os SHA-256 conferem.

## 2. Preservação dos links compartilhados
- O endereço não muda: `edugera.vercel.app/m/<id>`. O banco usa o **mesmo id**, como chave única.
- A página `/m/<id>` procura **primeiro no banco e depois no Blob**. Material não importado continua abrindo pelo Blob.
- Nenhum `materiais/<id>.json` é apagado, exceto quando o dono revoga (veja abaixo).
- **Revogação:**
  - material importado: marca "revogado" no banco, apaga o conteúdo dele no banco e apaga a cópia no Blob;
  - material só no Blob: funciona como hoje;
  - o que já estava revogado chega ao banco revogado e continua dando 404.

## 3. Associação dos materiais aos usuários
- Os arquivos não têm e-mail, só um código calculado a partir dele. Por isso a associação é feita **no login de cada professor**, quando o e-mail é conhecido.
- No 1º login com banco:
  1. a conta é criada; no banco fica o código, não o e-mail;
  2. a lista antiga é lida em `historicos/<código>.json`;
  3. o conteúdo de cada material só é trazido se a **chave de revogação da lista conferir com a do arquivo**. É a prova de dono;
  4. item sem prova entra só na lista, e o link abre pelo Blob;
  5. o uso do mês vem de `usuarios/<código>.json`.
- **Garantias, com teste automático:**
  - um professor nunca lê nem altera o material de outro;
  - quem colou um link alheio na lista não fica com o material: quem prova a chave fica.

## 4. Criação do banco `edugera-producao`
1. **Paulo**, no Neon, clica em **Novo projeto**:
   - nome `edugera-producao`;
   - região AWS US East 1 (N. Virginia);
   - só Postgres.
2. **Paulo** clica em **Connect** e copia a connection string **com pooling** (`-pooler`, `sslmode=require`). Não envia ao Claude.
3. O banco nasce vazio. As tabelas vêm da migração (item 6). Plano grátis: 0,5 GB, com uso previsto abaixo de 10 MB.

## 5. Variáveis (projeto `gerador-materiais-didaticos`), somente Production
| Variável | Tipo | Ambiente | Quando | Quem |
|---|---|---|---|---|
| `DATABASE_URL_PRODUCAO` | Secret | **só Production** | véspera da virada | Paulo |
| `BANCO_PRODUCAO` = `1` | Config | **só Production** | na virada | Paulo |
| `EXCLUSAO_CONTA` = `1` | Config | **só Production** | só após a aprovação final | Paulo |

**Não mudam:**
- Preview: `DATABASE_URL_TESTE` e `IA_SIMULADA`.
- `NEXTAUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`, `NEXTAUTH_URL`, `GOOGLE_*`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ADMIN_EMAILS`, `LIMITE_GERACOES_MES`.

## 6. Migração sem duplicar nem perder
- **Estrutura:**
  - as tabelas são criadas no deploy, só com `BANCO_PRODUCAO=1`;
  - cada migração roda numa transação e tem um arquivo `.down.sql` para desfazer;
  - na primeira vez, o script exige o banco vazio e grava o marcador "producao".
- **Dados:** são levados por professor, no login (item 3). Não há migração em massa, porque não dá para saber o dono sem o login.
- **Sem duplicar:**
  - `id` é chave única, e a importação não insere o que já existe;
  - a conta guarda `importado_em`, e só a 1ª chamada importa;
  - a sincronização entre aparelhos segue as regras de hoje: revogado não volta, removido não reaparece.
- **Sem perder:**
  - nada é apagado do Blob;
  - a importação é tudo ou nada (transação);
  - a dupla gravação cobre o rollback;
  - existem três backups.
- **Ensaio antes da virada:** no site de teste, uma cópia **só dos arquivos do Paulo** é importada e conferida (item 7). Só segue se der 100%.

## 7. Validação da quantidade antes e depois
- **Inventário geral** (todos os professores, só números), tirado **antes** da virada e **depois** dela:
  - contas, listas, itens e links ativos;
  - órfãos: material sem lista;
  - quebrados: item de lista sem arquivo.
- Os números do Blob precisam ser **idênticos** antes e depois.
- **Conferência da conta** (`GET /api/admin/conferir`, só a própria conta):

| Item | Esperado |
|---|---|
| Itens na lista: Blob × banco | 29 = 29 |
| Conjunto de ids | idêntico |
| Links ativos | 28 = 28 |
| SHA-256 do conteúdo: Blob × banco | igual em todos os materiais com prova |
| Uso do mês | igual |
| ids duplicados no banco | 0 |

## 8. Testes de login, biblioteca, geração e PDF
1. **Login:** sair e entrar com a conta do Paulo; a conta é criada e a importação roda.
2. **Biblioteca:** 29 itens, com títulos, datas e links iguais.
3. **Links antigos:** um importado abre; um sem prova abre pelo Blob; um revogado dá 404.
4. **Geração real:** a apostila nova entra no topo da lista (30) e o link abre.
5. **Dupla gravação:** a apostila nova também está no Blob.
6. **PDF:** o do aluno e o do professor são gerados.
7. **Uso:** o contador sobe 1.
8. **Isolamento:** uma 2ª conta Google vê a lista vazia.
9. **Limite:** numa conta comum, a 6ª geração do mês é bloqueada.
10. **Exclusão:** continua escondida e recusada pelo servidor (sem `EXCLUSAO_CONTA`).
11. **`/api/saude`:** continua 404 em produção, e `/api/uso` continua sem e-mail.

## 9. Rollback para o commit `4c00a00`
- **Nível 1 (≈2 min):** apagar `BANCO_PRODUCAO` e fazer Redeploy. O site volta ao Blob com o código novo.
- **Nível 2 (instantâneo):** Vercel → Deployments → deploy do `4c00a00` → **Promote to Production**. Alternativa: `git revert` e push.
- **O que acontece com os dados:**
  - com a dupla gravação, tudo o que foi criado durante a Parte B está no Blob, e o `4c00a00` enxerga;
  - só o perfil (nome, escola, disciplinas), que é novo, fica apenas no banco;
  - o banco não é apagado: fica parado.

## 10. Se a migração falhar
| Falha | O que acontece | O que fazer |
|---|---|---|
| Migração das tabelas falha no deploy | o build para e a Vercel mantém o site anterior no ar | ler o erro; corrigir no site de teste; nova tentativa só com a sua autorização |
| Banco fora do ar ou URL errada | o código não conecta e o site segue pelo Blob (como hoje) | rollback nível 1; conferir a URL |
| Marcador errado (ex.: banco de teste) | o código recusa o banco | conferir a variável; rollback nível 1 |
| Importação de uma conta falha | a transação desfaz tudo e o site mostra a lista do Blob; tenta de novo no próximo login | registro mostra só números; investigar no teste |
| Conferência não bate (ex.: 28 de 29) | **parar** | rollback nível 1; comparar ids com o backup; corrigir no teste |
| Link antigo não abre | **parar** | rollback nível 1; o arquivo segue no Blob e no backup |
| Arquivo do Blob corrompido | — | restaurar de `backup/AAAA-MM-DD/`, só com a sua autorização |

## 11. Critérios objetivos de aprovação
A Parte B só é aprovada se **todos** forem verdadeiros:
1. Backup: arquivos copiados = inventário, e 100% dos SHA-256 conferem.
2. Conferência da conta do Paulo: 29 = 29 itens, 28 = 28 links ativos, ids idênticos, 0 duplicados, conteúdos iguais e uso igual.
3. Inventário geral do Blob idêntico antes e depois.
4. Os 11 testes do item 8 passaram.
5. 3 de 3 links antigos abrem corretamente; o revogado dá 404.
6. 24 horas sem erro de banco nos registros da Vercel.
7. Rollback nível 1 testado (desligar e religar) sem nenhuma diferença na conferência.
8. Nenhum arquivo apagado do Blob: manifesto "antes" contido no "depois".

**Só depois disso:** você decide sobre `EXCLUSAO_CONTA=1` e, após 30 dias, sobre desligar a dupla gravação.

## 12. Checklists

### Execução
**Preparação (sem mudança para os professores)**
- [ ] P1 a P8 prontos; testes automáticos passando
- [ ] Ensaio no site de teste com cópia dos dados do Paulo: 100%
- [ ] Código no site real com interruptores **desligados**; login, gerar, lista e PDF iguais
- [ ] Inventário "antes" salvo
- [ ] Backup no Blob + manifesto conferido
- [ ] Paulo baixou manifesto, "Exportar backup" e backup completo da conta
- [ ] Paulo criou `edugera-producao` e colou `DATABASE_URL_PRODUCAO` (só Production)

**Virada (noite ou fim de semana)**
- [ ] Paulo cria o branch `backup-AAAA-MM-DD` no Neon
- [ ] Paulo cria `BANCO_PRODUCAO=1` (só Production) e faz Redeploy
- [ ] Deploy ok; migrações 0001, 0002 e 0003 aplicadas; marcador "producao"
- [ ] Paulo sai e entra → conferência 100%
- [ ] Testes 1 a 11 do item 8
- [ ] Inventário "depois" idêntico
- [ ] Teste do rollback nível 1 (desligar e religar)
- [ ] 24 h sem erros → Parte B aprovada (item 11)

### Rollback
- [ ] Anotar horário e sintoma (sem dados pessoais)
- [ ] Nível 1: apagar `BANCO_PRODUCAO` → Redeploy → ~2 min
- [ ] Conferir login, lista (29+), links, gerar e PDF
- [ ] Ainda com erro → nível 2: Promote do deploy `4c00a00`
- [ ] Conferir `/api/uso` sem e-mail e exclusão escondida
- [ ] Inventário: números do Blob iguais aos de "antes"
- [ ] Arquivo corrompido → restaurar do `backup/` (com autorização)
- [ ] **Não** apagar `edugera-producao`
- [ ] Relatório ao Paulo antes de nova tentativa

**Fora da Parte B:** pagamentos, planos, limites, n8n.


---

## 13. Ajustes da revisão do Paulo (v4) — valem sobre os itens anteriores

### 13.1 Neon: backup antes e depois
- `backup-pre` (vazio, antes da migração) **não** substitui backup de dados.
- Branches adicionais: `pos-estrutura` (após criar as tabelas), `pos-importacao-paulo` (após a conferência 100% da conta do Paulo) e um por dia nos 7 primeiros dias (`dia-1` … `dia-7`).
- O Neon também guarda histórico de restauração por horário (janela do plano grátis), usado como 2ª linha.

### 13.2 Backup local independente, conferido por SHA-256
- A cópia dentro do Blob **não** conta como independente.
- Rota de administrador gera um **pacote .zip** com todos os arquivos de `usuarios/`, `historicos/`, `materiais/`, `apostilas/` + `manifesto.json` (caminho, tamanho, SHA-256). Paulo baixa no computador e guarda também no Google Drive.
- Conferência: Paulo anexa o .zip aqui; eu recalculo o SHA-256 de cada arquivo e comparo com o manifesto **e** com uma 2ª leitura direta do Blob. Só vale com 100% iguais.

### 13.3 Nada apagado fisicamente (revogação lógica + retenção)
- Importar **não** apaga nada do Blob.
- Revogar com banco ligado = **lógico**: `revogado = true` no banco + "lápide" `revogados/<id>.json` no Blob (dupla gravação). O conteúdo continua guardado.
- A página `/m/<id>` dá 404 se o banco marcar revogado **ou** se existir lápide — nunca cai na cópia do Blob.
- **Retenção de 30 dias**; depois, a remoção física dos revogados só com a sua autorização (lista mostrada antes).

### 13.4 Divergências Blob × banco
- Para cada material: SHA-256 do JSON **canônico** (chaves em ordem; o banco reordena campos) do Blob × do banco.
- Divergente: **não corrige sozinho**; marca `divergente` no relatório, a página continua servindo o banco, e a versão do Blob fica guardada. Decisão caso a caso com você.

### 13.5 Importação: trava, status, timeout, parcial
**Achado no código atual (a corrigir em P5/P7):** a importação marca "importado" antes de terminar; se a função for interrompida por tempo, a conta fica marcada sem os dados (não há perda — o Blob segue intacto —, mas não haveria nova tentativa). Correção:
- Coluna `importacao_status`: `pendente` → `em_andamento` (com horário) → `concluida` | `falhou`.
- Reserva atômica: só começa se `pendente`/`falhou` ou `em_andamento` há mais de 5 min.
- Trava por conta (`pg_advisory_xact_lock`) dentro da transação.
- **Todos os dados + `concluida` na MESMA transação**: ou entra tudo, ou nada.
- Orçamento de 20 s (a função tem 60 s): passou disso, aborta, `falhou`, tenta no próximo login.
- **Chamadas simultâneas** (duas abas, celular + PC): a 2ª vê `em_andamento`, não importa, e mostra a lista do Blob naquela chamada; na seguinte já vem do banco.
- Teste automático novo: 6 importações simultâneas da mesma conta → 1 executa, 0 duplicados.

### 13.6 O que a validação compara
| Medida | Fonte A | Fonte B |
|---|---|---|
| caminhos, tamanhos, SHA-256 | manifesto "antes" | Blob "depois" e .zip local |
| usuários (contas com arquivo) | Blob | contas `concluida` no banco + pendentes |
| materiais por conta | lista do Blob | banco |
| links ativos / revogados | Blob + lápides | banco |
| órfãos (material sem lista) | inventário | inventário (iguais; continuam abrindo) |
| quebrados (lista sem arquivo) | inventário | banco (item sem conteúdo, mesmo número) |
| duplicados | — | banco: 0 por id; 0 por (conta, id) |
| conteúdo | SHA-256 canônico Blob | SHA-256 canônico banco |

### 13.7 Proteção das rotas de backup
- Só para e-mails em `ADMIN_EMAILS`, conferido **no servidor** pela sessão; sem sessão = 401, não-admin = 403.
- **Sem parâmetro de conta**: a conta é sempre a da sessão; o pacote geral só existe para admin. Parâmetros extras são ignorados.
- Resposta com `Cache-Control: no-store` e download direto (não vira arquivo público).
- Cópias de backup no Blob com acesso **privado** e nome aleatório; o manifesto **não** fica no Blob público.
- Registro de cada uso (só horário e quantidade, sem e-mail).

### 13.8 Rollback com parte dos usuários já importada
- **Nível 1 (banco desligado):** o código novo volta a ler o Blob. Como tudo foi gravado também no Blob (materiais novos, lista, uso, lápides de revogação), **importados e não importados veem o mesmo que no banco**. Só o perfil fica de fora (guardado no banco).
- **Nível 2 (`4c00a00`):** esse código não conhece lápides → antes do Promote, rodar "aplicar revogações": os materiais revogados no período (lista vinda do banco) têm a cópia do Blob removida — **com a sua autorização**, depois de baixados no .zip.
- **Religar depois:** todas as contas voltam a `pendente`; a importação repete (não duplica: id único) e traz o que foi criado no Blob durante o rollback.

## 14. Ensaio completo no ambiente de teste (antes da virada)
Os caminhos dos arquivos do Paulo são iguais no teste e no site real (mesma chave do Blob), então a cópia vai para `teste/` sem alteração.
1. Rota de admin (teste) copia **só os arquivos do Paulo** do Blob real para `teste/`.
2. Paulo entra no site de teste → importação → conferência 13.6: **29/29, 28/28, 0 duplicados, hashes iguais**.
3. Falhas simuladas: corte por tempo no meio da importação; banco indisponível; 2 abas ao mesmo tempo; marcador errado.
4. Revogar 1 material → 404 pela lápide; arquivo continua no Blob.
5. Gerar 1 apostila (dupla gravação no Blob).
6. Rollback nível 1 no teste (sem banco) → lista igual; religar → nada duplicado.
7. Exclusão de conta com os dados copiados → tudo da conta some; nada das outras.
8. Relatório do ensaio para sua aprovação.

## 15. Materiais divergentes, órfãos e quebrados
| Caso | Tratamento |
|---|---|
| Órfão (arquivo sem lista) | não importa, não apaga; link continua abrindo pelo Blob; aparece no inventário |
| Quebrado (item sem arquivo) | entra na lista sem conteúdo, marcado "indisponível"; não some da lista |
| Sem prova de dono (chave não confere) | entra só na lista; conteúdo fica no Blob |
| Divergente (hash diferente) | relatório; decisão com o Paulo (13.4) |
| Id repetido em duas contas | fica com quem prova a chave; o outro vê só o item, sem conteúdo |
