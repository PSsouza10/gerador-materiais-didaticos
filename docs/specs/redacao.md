> **Decisões do Paulo (24/10/2026):** o construtor guiado é **só do Pro** (substitui "Construtor: ilimitado no Grátis" das seções 3 e 5). Implementação da Fase 1: `lib/redacao.js`, `lib/redacaoEtapas.js`, `lib/redacoesBanco.js`, `app/redacao/*`, `app/api/redacao/*`, migração 0013. Grátis: 1 correção/mês até 2 laudas (60 linhas estimadas); Pro: 100/mês (uso justo).
>
> **Ampliação pedida pelo Paulo (24/10/2026), no mesmo PR:** gêneros com etapas e rubrica próprias (dissertação, artigo de opinião, conto, relato pessoal, carta, notícia — `lib/redacaoEtapas.js`; no perfil Escola); ENEM com as 5 competências de 0 a 200 (total 1000); e a correção na **foto da folha** (item 10.1 antecipado): a IA lê linha a linha (`/api/redacao/ler-foto`, `lib/redacaoFoto.js`), a pessoa confere a transcrição, e a folha volta marcada em vermelho, com a correção escrita em letra cursiva acima do erro, nota circulada e bilhete do professor (`components/redacao/FolhaCorrigida.jsx`, PDF). A foto não é guardada. Migração 0014 (coluna `genero`).
>
> **Letra do professor (24/10/2026):** em `/redacao/minha-letra` o professor imprime a folha-modelo (108 caracteres, 4 quadrados pretos nos cantos), preenche à caneta e fotografa. O navegador acha os cantos, corrige a perspectiva e recorta cada letra (`lib/visaoModelo.js`, sem IA); só as letras recortadas vão para a conta (tabela `letras_professor`, migração 0015), e só ela usa. As correções, a nota e o bilhete passam a sair com essa letra. Também dá para escrever cada correção ou um recado com o dedo/caneta na tela (`PadMao`).

# SPEC — Módulo de Redação do EduGera

> Para o Claude Code. Trabalhar em **branch separada** (`feat/redacao`) com preview da Vercel. Não fazer merge na produção sem aprovação do PS Souza.

## 1. Objetivo
Adicionar ao EduGera dois recursos de redação, reaproveitando login Google, limites Grátis/Pro e a infraestrutura Gemini que já existem:

1. **Construtor guiado de redação** (aluno escreve cada parte, o app monta o texto).
2. **Correção de redação por IA** com rubrica por critério (nota, erros, reescrita).

A spec tem duas fases, ambas no escopo: **Fase 1** (seções 2–9) entrega o núcleo; **Fase 2** (seção 10) entrega os diferenciais. Implementar a Fase 1 inteira antes de iniciar a Fase 2, cada uma em seu próprio PR de preview.

## 2. Rotas (Next.js App Router)
- `/redacao` — tela inicial: escolher "Construir" ou "Corrigir".
- `/redacao/construir` — construtor guiado.
- `/redacao/corrigir` — colar/digitar texto (ou foto, se a correção de prova por imagem já existir) e receber correção.
- `POST /api/redacao/corrigir` — chama o Gemini, valida o limite do plano, devolve JSON.

## 3. Módulo 1 — Construtor guiado (sem IA, plano Grátis)
Front-end puro (client component). 9 etapas, cada uma com dica, campo de texto livre (NUNCA alternativas) e contador de palavras com faixa recomendada:

| # | Etapa | Faixa (palavras) |
|---|---|---|
| 1 | Tema | 3–20 |
| 2 | Introdução: contexto | 12–35 |
| 3 | Introdução: tese | 8–30 |
| 4 | Desenvolvimento 1: argumento normativo/teórico | 15–45 |
| 5 | Desenvolvimento 1: consequência | 12–35 |
| 6 | Desenvolvimento 2: argumento prático | 15–45 |
| 7 | Desenvolvimento 2: princípio | 12–35 |
| 8 | Conclusão: retomada da tese | 8–30 |
| 9 | Conclusão: proposta (agente + ação + meio + finalidade) | 15–45 |

Regras:
- Botões Voltar/Próxima; respostas guardadas em estado (e `localStorage` como rascunho, com try/catch).
- Resultado: texto montado em 4 parágrafos, total de palavras, **linhas estimadas = ceil(palavras / 7,5)** (calibrado para folha pautada), aviso se fora de 20–30 linhas (configurável por `minLinhas`/`maxLinhas`, pois cada banca muda).
- Checklist de revisão (5 itens) e botão **"Corrigir com IA"** que leva o texto montado para `/redacao/corrigir` (gancho para o Pro).
- Dicas de cada etapa ficam em um arquivo de dados (`redacao/etapas.ts`), fácil de editar.

## 4. Módulo 2 — Correção por IA (Pro; Grátis = 1/mês, até 2 laudas)
### Entrada
`{ texto, tema?, bancaPerfil? ("concurso" | "enem" | "escolar"), minLinhas?, maxLinhas? }`

### Rubrica (10 pontos, pesos ajustáveis por perfil)
| Critério | Pontos |
|---|---|
| Adequação ao tema e ao gênero dissertativo-argumentativo | 2,0 |
| Estrutura (introdução com tese, 2 desenvolvimentos distintos, conclusão) | 2,0 |
| Argumentação e repertório (BNCC, LDB, ECA, PNE etc.) | 2,0 |
| Proposta de intervenção (agente + ação + meio + finalidade) | 2,0 |
| Coesão e norma culta | 2,0 |

### Prompt do sistema (enviar ao Gemini)
```
Você é um corretor de redação de concurso público para professores no Brasil.
Avalie o texto com rigor e objetividade, SEM elogios vazios.
Siga a rubrica de 5 critérios (2 pontos cada). Seja específico: cite o trecho exato.
Regras:
- Aponte redundância entre parágrafos (mesma tese repetida) como falha de estrutura.
- Verifique se a conclusão tem agente + ação + meio + finalidade; se faltar algum, diga qual.
- Liste erros de português em tabela: trecho original, tipo do erro, correção.
- Não invente leis ou artigos. Se citar legislação, use apenas BNCC, LDB (Lei 9.394/96), ECA, PNE.
- Não reescreva o texto inteiro por padrão: reescreva apenas os 3 trechos mais problemáticos.
Responda SOMENTE em JSON válido no esquema abaixo.
```

### Esquema de resposta (JSON)
```json
{
  "notaTotal": 0.0,
  "criterios": [
    { "nome": "string", "nota": 0.0, "max": 2.0, "justificativa": "string" }
  ],
  "linhasEstimadas": 0,
  "dentroDoLimite": true,
  "errosPortugues": [
    { "trecho": "string", "tipo": "concordância|regência|crase|pontuação|ortografia|coloquialismo|frase truncada", "correcao": "string" }
  ],
  "propostaIntervencao": { "agente": true, "acao": true, "meio": false, "finalidade": true, "comentario": "string" },
  "trechosReescritos": [ { "original": "string", "reescrito": "string", "porque": "string" } ],
  "proximoPasso": "string (1 frase: o que treinar na próxima redação)"
}
```
- Usar `responseMimeType: "application/json"` do Gemini e validar a saída com Zod; se a validação falhar, tentar 1 vez e então devolver erro amigável.
- Temperatura baixa (≈0,2) para notas estáveis.
- Mostrar sempre o aviso: *"Nota estimada por IA. Não substitui a grade oficial da banca."*

## 5. Limites e planos
- Construtor: ilimitado no Grátis.
- Correção: Grátis = 1/mês e até 2 laudas (conforme já decidido para correção de provas); Pro = ilimitado dentro da política de uso justo. Reaproveitar o contador mensal e as travas anti-abuso (limite por aparelho/rede) que já existem.
- Textos acima de 2 laudas no Grátis: bloquear com convite para assinar o Pro.

## 6. Dados
Tabela/coleção `redacoes`: `id, userId, tema, texto, perfil, resultadoJson, criadoEm`. Permitir histórico e comparar notas ao longo do tempo (gráfico simples de evolução por critério, fase 2).

## 7. Privacidade
Texto do aluno é dado pessoal: não registrar em logs, não usar para treino, permitir excluir a redação. Se o usuário for menor de idade, seguir a política de termos já publicada.

## 8. Critérios de aceite
- [ ] Construtor percorre as 9 etapas, volta sem perder texto e monta 4 parágrafos.
- [ ] Contagem de linhas estimada confere com o exemplo real (≈160 palavras → ≈21 linhas).
- [ ] Correção devolve JSON válido e renderiza nota por critério + tabela de erros.
- [ ] Redação com conclusão sem proposta recebe 0 nesse critério e mensagem indicando o que falta.
- [ ] Limite do plano Grátis respeitado (1/mês, 2 laudas).
- [ ] Nenhuma alteração fora da branch `feat/redacao`; build da Vercel preview passa.

## 10. FASE 2 — Diferenciais (o que coloca o EduGera fora da curva)

### 10.1 Correção por foto da folha manuscrita (visão do Gemini)
O candidato fotografa a redação escrita à mão (como a foto da prova de 30/08) e o app:
1. transcreve o texto (Gemini com imagem) e mostra a transcrição para o aluno **confirmar/editar** antes de corrigir (letra ruim gera erro de leitura; nunca corrigir sem confirmação);
2. marca trechos riscados/ilegíveis como `[ilegível]`;
3. envia o texto confirmado ao mesmo pipeline do módulo 2.
Foto na Grátis só dentro do limite mensal da correção; Pro ilimitado.

### 10.2 Modo Prova
Simula a prova real: escolhe perfil (concurso/ENEM/escolar), sorteia tema, cronômetro (padrão 40 min), **folha pautada na tela com numeração de linhas (1–30) e contador de linhas real**, sem dicas e sem corretor ortográfico. Ao fim, correção automática. Guarda tempo gasto por redação.

### 10.3 Treino de frases (SVC)
Exercício curto e diário: o app mostra uma frase com defeito (sem sujeito/verbo/complemento, regência ou concordância erradas), o aluno reescreve, e a IA diz se ficou com sujeito + verbo + complemento e o que ainda falta. As frases problemáticas vêm do **histórico de erros do próprio aluno** (tabela `errosPortugues` das correções anteriores), personalizando o treino.

### 10.4 Gerador de propostas de redação
Professor ou aluno escolhe série/habilidade BNCC ou tema (concurso, ENEM, cotidiano escolar) e o app gera proposta com 2 textos de apoio e comando. Reaproveitar o metadado estruturado (habilidade BNCC, série, dificuldade) do banco de conteúdo. Citar apenas legislação real (BNCC, LDB, ECA, PNE); proibido inventar artigo.

### 10.5 Histórico e evolução
Página `/redacao/historico`: lista das redações, gráfico da nota por critério ao longo do tempo, erros mais frequentes (top 5) e "próximo passo" sugerido a partir do padrão. Comparar duas versões da mesma redação (antes/depois da reescrita).

### 10.6 Banco de repertório
Fichas curtas de repertório sociocultural e normativo por tema (educação inclusiva, evasão, tecnologia, gestão democrática, avaliação...) com "como encaixar no argumento 1 / argumento 2". Gerado e **revisado manualmente** antes de publicar; cada ficha traz a fonte.

### 10.7 Painel do professor/escola (liga ao Ciclo de Recomposição)
Professor cria uma turma, aplica uma proposta, alunos enviam, e o painel agregado mostra a média por critério e os erros mais comuns da turma (ex.: "62% sem proposta de intervenção completa"). Gera plano de aula de intervenção a partir do critério mais fraco. Visível só ao professor dono da turma; aluno vê apenas a própria correção.

### 10.8 Critérios de aceite da Fase 2
- [ ] Foto manuscrita: transcrição editável aparece antes da correção; texto não confirmado nunca é corrigido.
- [ ] Modo Prova: cronômetro, 30 linhas numeradas e contador de linhas funcionam no celular.
- [ ] Treino de frases usa erros reais do histórico do aluno quando existirem.
- [ ] Proposta gerada não cita lei ou artigo fora de BNCC/LDB/ECA/PNE.
- [ ] Histórico mostra evolução por critério com pelo menos 2 redações.
- [ ] Painel do professor respeita permissão: aluno nunca vê dados de outros alunos.
- [ ] Tudo na branch `feat/redacao`; nada em produção sem aprovação.

## 9. Caso de teste real (usar como fixture)
Redação feita na prova de 30/08/2026 (tema: papel da Gestão Escolar/Pedagógica no planejamento docente). Resultado esperado da correção: nota na faixa 6,0–6,5; falhas principais = parágrafos 1 e 2 repetindo a mesma tese e **ausência de proposta de intervenção completa**; ponto forte = repertório (BNCC) e manutenção do tema.
