-- Fase 0 · base do banco de TESTE. Só cria; não altera nem apaga nada que já exista.

-- Marcador: prova qual banco é este. O código só usa o banco se ele disser "teste".
CREATE TABLE IF NOT EXISTS ambiente (
  nome TEXT PRIMARY KEY CHECK (nome IN ('teste')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO ambiente (nome) VALUES ('teste') ON CONFLICT (nome) DO NOTHING;

-- Um registro por pedido às rotas da API. Sem e-mail, nome, texto de apostila ou chaves.
CREATE TABLE IF NOT EXISTS eventos_requisicao (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT NOT NULL,
  rota TEXT NOT NULL,
  metodo TEXT NOT NULL DEFAULT '',
  status INTEGER NOT NULL,
  duracao_ms INTEGER NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS eventos_requisicao_request_id ON eventos_requisicao (request_id);
