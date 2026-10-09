-- Desfaz 0002 (ordem inversa por causa das chaves estrangeiras)
DROP INDEX IF EXISTS eventos_uso_idx;
DROP TABLE IF EXISTS eventos_uso;
DROP INDEX IF EXISTS materiais_usuario_idx;
DROP TABLE IF EXISTS materiais;
DROP TABLE IF EXISTS usuarios;
