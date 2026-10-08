# EduGera — regras do projeto

- **Só o Claude Code edita este repositório** (decisão do Paulo em 04/10/2026). Outras ferramentas (Atoms, Lovable, Base44, Emergent) não fazem commit aqui; ideias vindas delas entram como pedido ao Claude Code.
- Publicação: push em `main` → a Vercel publica sozinha (edugera.vercel.app).
- Ambiente de teste: branch `fase-0` → Preview da Vercel (banco Neon de teste, Blob `teste/`, IA simulada). Ver `docs/ambiente-teste.md` e `docs/rollback.md`. Mudança nova vai primeiro para lá; `main` só depois do OK do Paulo.
- Antes de cada push: `npm test`, `npx next lint` e `npx next build` sem erro.
- Mudou o pedido à IA (`app/api/gerar-material/route.js`) ou alguma conferência (`lib/`)? Rode a **bateria de qualidade** em `/qualidade` (só administradores) e compare a nota média com a anterior. Relatórios baixados podem ser reauditados com `npm run auditar -- arquivo.json`.
- Comunicação com o Paulo em português, direta; ele é professor de Matemática, não programador.
- Nunca ler, copiar ou colar chaves e senhas (OpenAI, Google, NEXTAUTH, Blob). Quem cola chave na Vercel é o Paulo.
