-- Redação: gênero do texto (dissertação, artigo, narrativo, relato, carta, notícia). Só acrescenta a coluna.
ALTER TABLE redacoes ADD COLUMN IF NOT EXISTS genero TEXT NOT NULL DEFAULT 'dissertacao';
