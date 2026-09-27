# EduGera · Gerador de Materiais Didáticos BNCC

Aplicação Next.js (App Router + Tailwind) que gera apostilas e fichas de estudo visuais alinhadas à BNCC, com conteúdo pelo GPT-4o e ilustração pelo gpt-image-2, hospedada na Vercel.

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

### Variáveis de ambiente

| Variável | Obrigatória | Para quê |
|---|---|---|
| `OPENAI_API_KEY` | sim | Geração do conteúdo e da ilustração |
| `BLOB_READ_WRITE_TOKEN` | sim | Vercel Blob: guarda as ilustrações e os materiais compartilhados (criada automaticamente ao conectar um Blob Store ao projeto na Vercel) |
| `OPENAI_BASE_URL` | não | Outra URL compatível com a API da OpenAI (padrão `https://api.openai.com/v1`); útil para testes com servidor simulado |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | sim | Login com Google (Google Cloud Console → Credenciais → ID do cliente OAuth, tipo "Aplicativo da Web") |
| `NEXTAUTH_SECRET` | não | Segredo que assina a sessão e protege o registro de uso. Se faltar, é derivado do `BLOB_READ_WRITE_TOKEN` (trocar esse token encerra as sessões e zera o contador do mês) |
| `NEXTAUTH_URL` | sim | Endereço público do site, ex.: `https://edugera.vercel.app` |
| `LIMITE_GERACOES_MES` | não | Gerações por mês no plano grátis (padrão 5) |
| `ADMIN_EMAILS` | não | E-mails sem limite de geração, separados por vírgula |

**Login e limite:** gerar, ilustrar e salvar exigem login. Sem as variáveis do Google o site funciona (exemplo, prévia, PDF), mas a geração fica desativada — isso protege o crédito da OpenAI. Cada conta tem `LIMITE_GERACOES_MES` gerações por mês; se a IA falhar, a geração é devolvida. O registro de uso fica no Vercel Blob sem e-mail nem nome (caminho = HMAC do e-mail com o segredo da sessão).

No Google Cloud, em "URIs de redirecionamento autorizados", cadastre `https://edugera.vercel.app/api/auth/callback/google` (e o domínio antigo, se for usar).

Testes: `npm test` (busca BNCC e verificação de unidades).

## Funcionalidades (Trilha de Otimização)

**Fase 1 — Estabilidade e impressão**
- `/api/gerar-material` responde em *streaming* (SSE): o navegador recebe o progresso enquanto a IA escreve, sem estourar o tempo de resposta da Vercel. As rotas de IA declaram `maxDuration = 60` (teto do plano Hobby) e encerram a chamada à OpenAI antes disso, devolvendo uma mensagem clara de timeout.
- Impressão A4: `@page` com margem 0 (o navegador omite cabeçalho/rodapé com URL e data) e 15 mm aplicados pela própria folha, repetidos em cada página. Cabeçalho, cartão BNCC e blocos de exercício usam `break-inside: avoid`.

**Fase 2 — Live preview e PDF**
- Tela dividida: formulário à esquerda, folha A4 em tamanho real (210 mm) escalada à direita, atualizada a cada alteração, com marcas de fim de página.
- Botões **Imprimir**, **Baixar PDF** (html2pdf.js, mesmas regras de quebra de página) e **Gabarito**.

**Fase 3 — Inteligência pedagógica**
- Autocomplete de habilidades da BNCC por código (`EF08MA02`) ou palavra-chave, priorizando a disciplina e a etapa escolhidas. Ao escolher, a descrição oficial é preenchida e enviada à IA; o servidor confere o código na base antes de montar o prompt. Códigos de currículos estaduais/municipais são aceitos com descrição manual.
- Nível de dificuldade/adaptação (**Acompanhamento/Adaptado**, **Padrão**, **Desafio**) que ajusta tom, vocabulário e complexidade dos exercícios. As instruções de cada nível ficam em `lib/niveis.js`.
- O material agora inclui exercícios (abertos e de múltipla escolha) com gabarito.

**Fase 4 — Compartilhamento**
- Ao terminar a geração, o material é salvo no Vercel Blob (`materiais/<id>.json`) e o botão **Copiar link de compartilhamento** entrega um link público `/m/<id>`, que mostra a mesma folha com opções de imprimir e baixar PDF.

## Estrutura

```
app/api/gerar-material   IA de texto (streaming SSE)
app/api/gerar-imagem     IA de imagem → Vercel Blob
app/api/salvar-material  salva o material e devolve o link
app/m/[id]               página pública do material compartilhado
components/FolhaA4.jsx   a folha (preview, impressão, PDF e link)
components/SeletorBNCC.jsx
lib/                     níveis, BNCC, normalização, SSE, PDF
data/bncc-habilidades.json
```

## Dados da BNCC

`data/bncc-habilidades.json` reúne o texto oficial das habilidades do Ensino Fundamental, do Ensino Médio e da BNCC Computação (EF/EM). Os dados foram compilados a partir de **[bncc-dados](https://github.com/bncc-dev/bncc-dados)**, de bncc.dev (mantido pela Profy), sob licença [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.pt-br). Os textos normativos da BNCC são atos oficiais e não são objeto de proteção autoral.
