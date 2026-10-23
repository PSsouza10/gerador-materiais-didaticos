-- Ciclo de Recomposição (piloto): caderno único distribuído a várias escolas e o resultado
-- de cada turma em NÚMEROS (quantos marcaram cada letra em cada questão). Sem nome de aluno,
-- sem foto, sem resposta individual. Só cria tabelas e uma coluna nova; não apaga dados.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS coordenador BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS cadernos (
  codigo TEXT PRIMARY KEY,
  dono_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('diagnostico', 'reavaliacao')),
  origem TEXT REFERENCES cadernos(codigo) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  escolas TEXT[] NOT NULL DEFAULT '{}',
  avaliacao JSONB NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cadernos_dono_idx ON cadernos (dono_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS cadernos_origem_idx ON cadernos (origem);

CREATE TABLE IF NOT EXISTS resultados_turma (
  id BIGSERIAL PRIMARY KEY,
  caderno TEXT NOT NULL REFERENCES cadernos(codigo) ON DELETE CASCADE,
  professor_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  escola TEXT NOT NULL,
  turma TEXT NOT NULL,
  alunos INTEGER NOT NULL CHECK (alunos BETWEEN 1 AND 80),
  contagens JSONB NOT NULL,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- reenviar a mesma turma substitui o envio anterior
CREATE UNIQUE INDEX IF NOT EXISTS resultados_turma_unico ON resultados_turma (caderno, professor_id, escola, turma);
