# 02 · Arquitetura

> **Estado: rascunho.** Escrito a partir do código (commit `07b5a2e`, 22/10/2026).

## Peças
```
Navegador do professor
  ├─ páginas Next.js (app/)  ── componentes (components/telas/*, FolhaA4, CorrecaoTurma)
  ├─ localStorage: preferências, rascunhos, correção da turma (dados de alunos ficam aqui)
  └─ chama /api/* (sempre com sessão do Google)
        │
Vercel (funções Node, Next.js 13.5 app router)
  ├─ comRequestId: request_id, log de uma linha, medição de custo de IA
  ├─ lib/auth.js (NextAuth, Google, sessão JWT de 30 dias)
  ├─ lib/uso.js + lib/planos.js: limites por plano
  ├─ lib/provedoresIA.js: OpenAI e Gemini (JSON e stream), reserva entre eles
  ├─ conferências fixas (lib/gabarito, avaliacao, coerencia, revisao, qualidade, auditoria)
  └─ lib/cobranca.js + lib/asaas.js: checkout, webhook, validade do Pro
        │
Dados
  ├─ Neon Postgres (lib/banco.js): usuarios, materiais, eventos_uso, assinaturas, checkouts, cobrancas, custos_ia
  ├─ Vercel Blob: materiais/<id>.json (cópia), ilustrações, arquivos antigos (usuarios/, historicos/, apostilas/, revogados/)
  └─ Blob privado edugera-auditorias (gru1): só um contador
        │
Externos: Google (login, Gemini) · OpenAI (texto, imagem) · Asaas (pagamento)
```

## Rotas da API (`app/api/`)
| Rota | Faz |
|---|---|
| `gerar-material` | apostila/ficha/lista (stream SSE) + conferências + auditoria |
| `gerar-avaliacao`, `trocar-questao` | avaliação e troca de questão |
| `gerar-plano` | plano de aula (tema, apostila ou PDF) |
| `revisar-conteudo`, `corrigir-exercicio` | 2ª IA revisora; refazer um exercício |
| `ler-cartao` | foto do cartão-resposta → letras (Pro) |
| `gerar-imagem` | ilustração → Blob |
| `salvar-material`, `material/[id]`, `historico` | salvar, revogar, lista "Minhas Apostilas" |
| `conta`, `uso`, `assinatura` | perfil, exclusão, uso do mês, assinatura |
| `pagamentos/checkout`, `pagamentos/asaas` (webhook), `pagamentos/cancelar` | venda do Pro |
| `admin/*` | backup, inventário, conferência, ensaio (só `ADMIN_EMAILS`) |
| `saude` | estado do ambiente (404 em produção) |

## Páginas
`/` (fachada), `/criar` (gerador, aceita `?aba=&bncc=&disciplina=&ano=`), `/planos`, `/assinatura`, `/m/<id>`, `/termos`, `/privacidade`, `/atividades/*`, `/prova-paulista/*`, `/bncc/<código>`, `/qualidade` e `/admin/*` (administradores).

## Banco: migrações (`db/migracoes/`)
`0001` base · `0002` contas, materiais, eventos · `0003` importação · `0004` planos · `0005` pagamentos · `0006` Asaas · `0007` checkout_id · `0008` trocas · `0009` custos de IA.
Regras: toda `up` tem `down`; `up` nunca apaga dados (há teste). Rodam no build da Vercel (`vercel-build`). Em produção, só com `BANCO_PRODUCAO=1`. O banco tem um marcador "teste" ou "producao" e o código recusa banco trocado.

## Dados de referência
`data/bncc-habilidades.json`: texto oficial da BNCC (bncc-dados, CC BY 4.0). `lib/bncc.js` resolve códigos e anos.

## Testes
`npm test` (node:test, ~300 testes, Postgres em memória com PGlite). Antes de cada push: `npm test`, `npx next lint`, `npx next build`.
