-- Pagamentos (criada para o Mercado Pago; desde a 0006, Asaas). Só CRIA tabelas novas; não mexe em "assinaturas".
-- checkouts: cada clique em "Assinar" gera uma referência aleatória (vai ao Mercado Pago
--   como external_reference) que liga o pagamento à conta, sem mandar o e-mail para o banco.
-- cobrancas: o estado de cada assinatura/pagamento no provedor. O plano vale enquanto
--   "valido_ate" > agora. O webhook nunca confia no corpo recebido: relê o recurso na API.
CREATE TABLE IF NOT EXISTS checkouts (
  referencia TEXT PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  plano TEXT NOT NULL CHECK (plano IN ('pro_mensal', 'pro_anual')),
  provedor TEXT NOT NULL CHECK (provedor IN ('mercadopago', 'simulado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cobrancas (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  referencia TEXT NOT NULL REFERENCES checkouts(referencia) ON DELETE CASCADE,
  plano TEXT NOT NULL CHECK (plano IN ('pro_mensal', 'pro_anual')),
  provedor TEXT NOT NULL CHECK (provedor IN ('mercadopago', 'simulado')),
  tipo TEXT NOT NULL CHECK (tipo IN ('assinatura', 'pagamento')),
  recurso_id TEXT NOT NULL,
  status TEXT NOT NULL,
  valor NUMERIC(10, 2),
  valido_ate TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provedor, tipo, recurso_id)
);
CREATE INDEX IF NOT EXISTS cobrancas_usuario_idx ON cobrancas (usuario_id, valido_ate DESC);
