-- Parte B · status da importação do Blob, para travar chamadas simultâneas e
-- permitir nova tentativa depois de falha ou corte por tempo. Só acrescenta colunas.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS importacao_status TEXT NOT NULL DEFAULT 'pendente';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS importacao_inicio TIMESTAMPTZ;
