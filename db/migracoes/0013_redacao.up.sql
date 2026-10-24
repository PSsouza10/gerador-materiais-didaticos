-- Módulo de Redação (Fase 1, docs/specs/redacao.md): histórico das correções de redação digitada
-- e tipo de uso "redacao" (Grátis: 1 por mês; lib/planos.js). Só cria; não apaga dados.
ALTER TABLE eventos_uso DROP CONSTRAINT IF EXISTS eventos_uso_tipo_check;
ALTER TABLE eventos_uso ADD CONSTRAINT eventos_uso_tipo_check CHECK (tipo IN ('geracao', 'correcao', 'revisao', 'imagem', 'troca', 'cruzadinha', 'correcao_prova', 'redacao'));

CREATE TABLE IF NOT EXISTS redacoes (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tema TEXT NOT NULL DEFAULT '',
  texto TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('concurso', 'enem', 'escolar')),
  resultado JSONB NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS redacoes_usuario ON redacoes (usuario_id, criado_em DESC);
