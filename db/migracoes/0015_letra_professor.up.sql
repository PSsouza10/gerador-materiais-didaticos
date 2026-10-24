-- "Minha letra": letras recortadas da folha-modelo de cada professor (imagens PNG pequenas),
-- usadas só pela própria conta para escrever as correções. Apagar a conta apaga a letra.
CREATE TABLE IF NOT EXISTS letras_professor (
  usuario_id BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  glifos JSONB NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
