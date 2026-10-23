-- Cruzadinha e correção de provas: tipos de uso com limite mensal próprio
-- (Grátis: 1 de cada por mês; lib/planos.js). Não contam como geração de apostila.
ALTER TABLE eventos_uso DROP CONSTRAINT IF EXISTS eventos_uso_tipo_check;
ALTER TABLE eventos_uso ADD CONSTRAINT eventos_uso_tipo_check CHECK (tipo IN ('geracao', 'correcao', 'revisao', 'imagem', 'troca', 'cruzadinha', 'correcao_prova'));
