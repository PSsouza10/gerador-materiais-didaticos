-- Campanhas de divulgação: um link (edugera.app/convite/<código>) que libera N dias de Pro
-- sem cobrança. Cada conta resgata UMA campanha só (em toda a vida da conta).
-- Só cria tabelas; não apaga nem altera dados.
CREATE TABLE IF NOT EXISTS campanhas (
  codigo TEXT PRIMARY KEY,
  dias INTEGER NOT NULL CHECK (dias BETWEEN 1 AND 366),
  limite INTEGER NOT NULL CHECK (limite BETWEEN 1 AND 100000),
  fim TIMESTAMPTZ NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resgates_campanha (
  id BIGSERIAL PRIMARY KEY,
  campanha TEXT NOT NULL REFERENCES campanhas(codigo) ON DELETE CASCADE,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS resgates_campanha_conta ON resgates_campanha (usuario_id);
CREATE INDEX IF NOT EXISTS resgates_campanha_campanha ON resgates_campanha (campanha);
