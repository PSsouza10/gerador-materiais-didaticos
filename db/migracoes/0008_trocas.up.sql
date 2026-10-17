-- Troca de UMA questão da avaliação ("trocar esta questão"): novo tipo de evento de uso.
-- Limite: até 3 trocas por geração feita no mês (lib/uso.js, consumirTroca).
ALTER TABLE eventos_uso DROP CONSTRAINT IF EXISTS eventos_uso_tipo_check;
ALTER TABLE eventos_uso ADD CONSTRAINT eventos_uso_tipo_check CHECK (tipo IN ('geracao', 'correcao', 'revisao', 'imagem', 'troca'));
