-- Custo de IA por chamada, ligado ao request_id do pedido (lib/custoIA.js).
-- Sem conta, e-mail, conteúdo ou dado de aluno: só rota, modelo, tokens e custo estimado.
CREATE TABLE IF NOT EXISTS custos_ia (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT NOT NULL,
  rota TEXT NOT NULL,
  provedor TEXT NOT NULL,
  modelo TEXT NOT NULL,
  tokens_entrada INTEGER NOT NULL DEFAULT 0,
  tokens_saida INTEGER NOT NULL DEFAULT 0,
  imagens INTEGER NOT NULL DEFAULT 0,
  custo_usd NUMERIC(12, 6),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS custos_ia_tempo_idx ON custos_ia (criado_em, rota);
CREATE INDEX IF NOT EXISTS custos_ia_pedido_idx ON custos_ia (request_id);
