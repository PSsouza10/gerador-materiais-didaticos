# Próximos passos (23/10/2026)

Regra do Paulo: **um item por vez, e só avança com o OK dele.** Ele quer respostas curtas, com explicação só quando for necessária.

## Feito e no ar
- Páginas de SEO, Search Console verificado e sitemap enviado.
- Medição de custo de IA em `/admin/custos`.
- Ciclo de Recomposição (`docs/06-ciclo-recomposicao.md`).
- Modo diagnóstico e completar questões. Bateria: diagnóstico aprovado.
- Link de campanha `edugera.app/convite/<CÓDIGO>` (60 dias de Pro). A campanha é criada em `/admin/piloto`.

## Fila
1. **Item 2 — sugestão do HTPC.** Respostas do Paulo (23/10):
   - Cruzadinha: sim, tema/habilidade → grade do aluno + gabarito. **Feita e no teste (`fase-0`), esperando o OK do Paulo para ir ao ar.** Aba "Cruzadinha" em `/criar` (`?aba=cruzadinha`); API `/api/gerar-cruzadinha`; lógica em `lib/cruzadinha.js` (a IA só escreve palavras e dicas; a grade é montada no código). Limite próprio: Grátis 1 cruzadinha/mês e 1 correção de prova/mês (pedido do Paulo, 23/10); Pro 30 de cada (provisório). Não gasta geração de apostila. "Nova disposição" não gasta nada.
   - Correção de provas: o professor envia a prova feita pelo aluno e a IA corrige. **Feita e no teste (`fase-0`), esperando o OK.** Aba "Corrigir Prova" (`?aba=corrigir`); API `/api/corrigir-prova`; lógica em `lib/correcaoProva.js`. Fotos (até 6) viram um PDF no navegador; gabarito opcional; nota recalculada no código; professor ajusta situação/pontos. Nome do aluno fica só no navegador.
2. **Item 3:** incluir a disciplina **Espanhol** (hoje não existe).
3. **Item 4 — Instagram:** "comente EDUGERA" → direct com o link de campanha (ManyChat, a partir de US$ 15/mês; conferir como ele verifica se a pessoa segue). Entregar o roteiro do Reel, a legenda e as mensagens do direct.

## Pendências paradas
- Política de Privacidade:
  - incluir o Neon;
  - dizer que conta, uso e perfil ficam no banco;
  - explicar a cópia pública do material no Blob.

  Ver `docs/juridico/privacidade.md`.
- Termos: falta o endereço do Paulo.
- Ordem das IAs: o código tenta a OpenAI primeiro. Decidir se o Gemini vira o principal.
- Confirmar na Vercel: a `GEMINI_API_KEY` é do projeto pago? A `EXCLUSAO_CONTA=1` está ligada?
- Card para a coordenadora (artifact "Card EduGera para a coordenação"): trocar [LINK DA CAMPANHA] e [CONTATO].
- 30/10: lembrete para ler `/admin/custos` e definir o preço do plano Escola.
