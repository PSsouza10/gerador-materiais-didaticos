DROP TABLE IF EXISTS assinaturas;
DROP INDEX IF EXISTS eventos_uso_request_idx;
ALTER TABLE eventos_uso DROP COLUMN IF EXISTS request_id;
