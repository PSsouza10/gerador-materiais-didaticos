-- Reaplica (idempotente) a coluna do id do checkout no provedor: no banco de teste a 0006
-- ficou registrada sem a coluna. Não apaga nem altera dados.
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS provedor_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS checkouts_provedor_id_idx ON checkouts (provedor, provedor_id) WHERE provedor_id IS NOT NULL;
