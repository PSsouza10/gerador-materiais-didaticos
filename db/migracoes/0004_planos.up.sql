-- Planos e limites: request_id em cada uso + assinaturas SEM cobrança real.
-- origem 'simulada' = criada pelo botão de teste (só fora da produção);
-- origem 'manual' = liberada por um administrador. Pagamento ainda não existe.
ALTER TABLE eventos_uso ADD COLUMN IF NOT EXISTS request_id TEXT;
CREATE INDEX IF NOT EXISTS eventos_uso_request_idx ON eventos_uso (usuario_id, tipo, request_id);

CREATE TABLE IF NOT EXISTS assinaturas (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  plano TEXT NOT NULL CHECK (plano IN ('gratis', 'pro_mensal', 'pro_anual', 'escola')),
  status TEXT NOT NULL CHECK (status IN ('ativa', 'cancelada')),
  origem TEXT NOT NULL CHECK (origem IN ('simulada', 'manual')),
  inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fim TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS assinaturas_ativa_idx ON assinaturas (usuario_id) WHERE status = 'ativa';
