DROP INDEX IF EXISTS checkouts_sessao_idx;
ALTER TABLE checkouts DROP COLUMN IF EXISTS sessao_id;
DELETE FROM cobrancas WHERE provedor = 'asaas';
DELETE FROM checkouts WHERE provedor = 'asaas';
ALTER TABLE cobrancas DROP CONSTRAINT IF EXISTS cobrancas_provedor_check;
ALTER TABLE cobrancas ADD CONSTRAINT cobrancas_provedor_check CHECK (provedor IN ('mercadopago', 'simulado'));
ALTER TABLE checkouts DROP CONSTRAINT IF EXISTS checkouts_provedor_check;
ALTER TABLE checkouts ADD CONSTRAINT checkouts_provedor_check CHECK (provedor IN ('mercadopago', 'simulado'));
