-- Desfaz exatamente o que 0001_base.up.sql criou (só no banco de TESTE).
DROP INDEX IF EXISTS eventos_requisicao_request_id;
DROP TABLE IF EXISTS eventos_requisicao;
DROP TABLE IF EXISTS ambiente;
