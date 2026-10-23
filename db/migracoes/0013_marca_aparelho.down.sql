DROP INDEX IF EXISTS eventos_uso_rede_idx;
DROP INDEX IF EXISTS eventos_uso_dispositivo_idx;
ALTER TABLE eventos_uso DROP COLUMN IF EXISTS rede;
ALTER TABLE eventos_uso DROP COLUMN IF EXISTS dispositivo;
