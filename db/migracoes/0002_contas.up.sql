-- Fase 1: contas, materiais e eventos de uso.
-- A conta é identificada por um HMAC do e-mail (o e-mail NÃO fica no banco).
CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  conta TEXT NOT NULL UNIQUE,
  nome_exibicao TEXT,
  escola TEXT,
  disciplinas TEXT[] NOT NULL DEFAULT '{}',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_acesso_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  importado_em TIMESTAMPTZ
);

-- Materiais da conta: a lista "Minhas Apostilas" e o conteúdo do link /m/<id>
CREATE TABLE IF NOT EXISTS materiais (
  id TEXT PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  url TEXT,
  titulo TEXT NOT NULL DEFAULT '',
  tema TEXT NOT NULL DEFAULT '',
  disciplina TEXT NOT NULL DEFAULT '',
  nivel TEXT NOT NULL DEFAULT '',
  ano TEXT NOT NULL DEFAULT '',
  dificuldade TEXT NOT NULL DEFAULT '',
  bncc TEXT,
  chave TEXT,
  chave_hash TEXT,
  revogado BOOLEAN NOT NULL DEFAULT false,
  removido BOOLEAN NOT NULL DEFAULT false,
  conteudo JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS materiais_usuario_idx ON materiais (usuario_id, criado_em DESC);

-- Cada geração, correção, revisão ou ilustração vira um evento (no lugar dos contadores)
CREATE TABLE IF NOT EXISTS eventos_uso (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('geracao', 'correcao', 'revisao', 'imagem')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS eventos_uso_idx ON eventos_uso (usuario_id, tipo, criado_em);
