DROP INDEX IF EXISTS checkouts_provedor_id_idx;
ALTER TABLE checkouts DROP COLUMN IF EXISTS provedor_id;
