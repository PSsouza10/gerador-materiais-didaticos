# Backup e rollback

## Site
- **Produção** só muda com push em `main`. Para voltar: Vercel → Deployments → deploy anterior de Production → *Promote to Production* (instantâneo). Ou `git revert` do commit e push.
- **Teste** (`fase-0`) não afeta a produção. Para desfazer: apagar/reverter o branch.

## Banco de teste (Neon)
1. **Antes de cada migração nova**: no Neon, criar um branch de backup (Branches → Create branch, nome `backup-AAAA-MM-DD`). É uma cópia instantânea do banco.
2. Cada migração roda numa **transação**: se falhar no meio, nada fica aplicado.
3. Para desfazer a última: `npm run migrar -- down --confirmar` (usa o arquivo `.down.sql`).
4. Se algo der muito errado: no Neon, restaurar o branch principal a partir do backup (Restore).

## Regras das migrações
- Toda `NNNN_nome.up.sql` tem uma `NNNN_nome.down.sql`.
- O `up` nunca apaga nem altera dados (`DROP`, `DELETE`, `UPDATE`, `TRUNCATE` proibidos — há teste para isso).
- Na Fase 0 migrações **nunca** rodam em produção (código e teste garantem).

## Dados reais
Produção continua só com o Vercel Blob de sempre. Nenhum dado é movido, copiado ou apagado na Fase 0.
