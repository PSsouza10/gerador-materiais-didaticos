DELETE FROM eventos_uso WHERE tipo = 'troca';
ALTER TABLE eventos_uso DROP CONSTRAINT IF EXISTS eventos_uso_tipo_check;
ALTER TABLE eventos_uso ADD CONSTRAINT eventos_uso_tipo_check CHECK (tipo IN ('geracao', 'correcao', 'revisao', 'imagem'));
