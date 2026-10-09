-- Desfaz 0003
ALTER TABLE usuarios DROP COLUMN IF EXISTS importacao_inicio;
ALTER TABLE usuarios DROP COLUMN IF EXISTS importacao_status;
