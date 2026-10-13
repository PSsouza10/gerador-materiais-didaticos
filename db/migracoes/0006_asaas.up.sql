-- Asaas como provedor de pagamento (além do Mercado Pago). Não apaga dados:
-- só amplia a lista de provedores aceitos e guarda o id do checkout no provedor.
ALTER TABLE checkouts DROP CONSTRAINT IF EXISTS checkouts_provedor_check;
ALTER TABLE checkouts ADD CONSTRAINT checkouts_provedor_check CHECK (provedor IN ('mercadopago', 'asaas', 'simulado'));
ALTER TABLE cobrancas DROP CONSTRAINT IF EXISTS cobrancas_provedor_check;
ALTER TABLE cobrancas ADD CONSTRAINT cobrancas_provedor_check CHECK (provedor IN ('mercadopago', 'asaas', 'simulado'));
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS provedor_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS checkouts_provedor_id_idx ON checkouts (provedor, provedor_id) WHERE provedor_id IS NOT NULL;
