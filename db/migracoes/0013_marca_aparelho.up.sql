-- Plano Grátis: marca embaralhada do aparelho (cookie) e da rede (IP) em cada uso grátis,
-- para limitar contas novas criadas só para ganhar mais usos grátis. Valores são HMAC (não reversíveis).
ALTER TABLE eventos_uso ADD COLUMN IF NOT EXISTS dispositivo TEXT;
ALTER TABLE eventos_uso ADD COLUMN IF NOT EXISTS rede TEXT;
CREATE INDEX IF NOT EXISTS eventos_uso_dispositivo_idx ON eventos_uso (dispositivo, criado_em) WHERE dispositivo IS NOT NULL;
CREATE INDEX IF NOT EXISTS eventos_uso_rede_idx ON eventos_uso (rede, criado_em) WHERE rede IS NOT NULL;
