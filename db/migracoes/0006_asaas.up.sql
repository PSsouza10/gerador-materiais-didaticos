-- Pagamentos pelo Asaas (troca do Mercado Pago). Só AMPLIA o que a 0005 criou:
--   - provedor passa a aceitar 'asaas';
--   - checkouts.sessao_id guarda o id do Checkout do Asaas (os pagamentos e a assinatura
--     criados por ele trazem esse id em "checkoutSession", e é assim que achamos a conta).
ALTER TABLE checkouts DROP CONSTRAINT IF EXISTS checkouts_provedor_check;
ALTER TABLE checkouts ADD CONSTRAINT checkouts_provedor_check CHECK (provedor IN ('mercadopago', 'asaas', 'simulado'));
ALTER TABLE cobrancas DROP CONSTRAINT IF EXISTS cobrancas_provedor_check;
ALTER TABLE cobrancas ADD CONSTRAINT cobrancas_provedor_check CHECK (provedor IN ('mercadopago', 'asaas', 'simulado'));
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS sessao_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS checkouts_sessao_idx ON checkouts (sessao_id);
