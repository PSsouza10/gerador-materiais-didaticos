# 05 · IA e qualidade

> **Estado: rascunho.** Escrito a partir do código (commit `07b5a2e`, 22/10/2026). Os números de custo são estimativas até `/admin/custos` ter uma semana de dados de produção.

## Resumo
- Duas IAs: **OpenAI** (gpt-4o, ilustração gpt-image-2) e **Google Gemini** (Flash-Lite, plano pago desde outubro de 2026).
- **Atenção, a ordem real no código:** na maioria das rotas, **a OpenAI é tentada primeiro** e o Gemini entra quando ela falha. Exemplo: crédito esgotado responde 429 `insufficient_quota` e o pedido passa na hora para o Gemini. Hoje, sem crédito na OpenAI, o Gemini faz quase tudo na prática.
  - Se a ideia é "Gemini pago como principal, OpenAI de reserva", **a ordem precisa ser invertida no código** quando o crédito da OpenAI voltar. Senão, a OpenAI volta a ser a principal sozinha. **[decisão do Paulo]**
- Toda saída da IA passa por **conferências fixas** (regras testáveis, sem IA). A avaliação passa ainda por uma **segunda IA que resolve sem ver o gabarito**.
- Mudou o pedido à IA ou uma conferência? Rode a **bateria de qualidade** em `/qualidade` e compare a nota (regra do `CLAUDE.md`).

## Quem faz o quê
| Recurso | Rota | 1ª tentativa | Reserva | Observação |
|---|---|---|---|---|
| Apostila, ficha, lista A4 | `/api/gerar-material` | OpenAI `MODELO_TEXTO` (padrão `gpt-4o`), em stream | Gemini | Ao fim: conferências + auditoria (nota 0–100) |
| Revisão de conteúdo (2ª IA, "professor experiente") | `/api/revisar-conteudo` | `REVISOR_PROVEDOR`; sem a variável, **Gemini** | o outro | Apontamentos grudados em cada exercício |
| Corrigir um exercício | `/api/corrigir-exercicio` | **só Gemini** | — | Pendência da revisão de 21/10: se a IA falha, devolve o exercício igual e ainda consome uma correção |
| Plano de aula | `/api/gerar-plano` | OpenAI | Gemini | Revisão automática depois; PDF (Pro) vai junto |
| Avaliação Prova Paulista | `/api/gerar-avaliacao` | OpenAI (`MODELO_MATEMATICA` opcional para Matemática) | Gemini (2 tentativas) | Fluxo completo abaixo |
| Trocar uma questão | `/api/trocar-questao` | OpenAI | Gemini | Grátis: 1 por prova; Pro: 3 |
| Ler foto do cartão (Pro) | `/api/ler-cartao` | **Gemini** | OpenAI `gpt-4o` | Foto não é guardada |
| Ilustração | `/api/gerar-imagem` | OpenAI `gpt-image-2` | — | `QUALIDADE_IMAGEM` (padrão `medium`) |

**Modelos do Gemini** (`lib/provedoresIA.js`):
- Padrão: `MODELO_GEMINI`, ou `gemini-3.1-flash-lite` sem a variável.
- Lista de reserva: `MODELOS_GEMINI`, ou `gemini-3.1-flash-lite, gemini-3.5-flash-lite, gemini-3.8-flash` sem a variável. Um modelo lotado (503) ou no limite (429) passa logo para o próximo.
- "Pensamento" mínimo no Flash-Lite, para limitar custo e demora.

**Site de teste:** `IA_SIMULADA=1` responde sem chamar IA nenhuma (`lib/iaSimulada.js`). Custo zero, e nenhum dado sai.

## Avaliação: como o gabarito é conferido
`app/api/gerar-avaliacao/route.js` + `lib/avaliacao.js`, nesta ordem:
1. A IA gera as questões (texto-base, figura, habilidade e descritor, 4 alternativas, explicação de cada erro).
2. `conferirItem` faz o seguinte:
   - refaz as contas da resolução e confere se a letra marcada é a do resultado;
   - confere que o enunciado não entrega a resposta;
   - confere que a explicação de cada letra fala daquela letra.
3. `conferirTemaDaProva`: rejeita questão fora do tema ou da habilidade.
4. **Resolução cega (Gemini):** uma segunda IA resolve cada questão **sem ver o gabarito**. Divergência marca a questão.
5. **Revisão por item (Gemini):** professor-revisor aponta problemas de conteúdo.
6. Questão com problema é **refeita** ou **trocada** (OpenAI, com reserva no Gemini).
7. Se ainda falhar, entra uma **questão montada pelo próprio sistema**, sem IA, em que figura, resolução, alternativas e erros são calculados: área, perímetro, volume, gráfico e ângulo (`lib/questoesSistema.js`).
8. **Reposição:** se alguma foi retirada, pede novas até completar o número pedido, respeitando a cota de figuras.
9. O professor ainda pode **trocar** (IA) ou **editar à mão** cada questão. A edição passa por `conferirEdicao`.

### Modo diagnóstico (desde 23/10/2026, após o primeiro uso real do caderno)
Para tema amplo e sem habilidade escolhida, há a caixa **Avaliação diagnóstica** (`lib/diagnostico.js`):
- O **sistema monta a distribuição antes**: uma habilidade diferente por questão, em rodízio pelas unidades temáticas (Números, Álgebra, Geometria, Grandezas e medidas, Estatística). Se o tema cita unidades (ex.: "geometria e frações"), só elas entram. A dificuldade vem em ordem crescente. A lista vai no pedido à IA como **DISTRIBUIÇÃO OBRIGATÓRIA**.
- **Conferência de cobertura:** questão com habilidade fora da lista, ou já cobrada, é refeita com uma das que faltam. A reposição pede exatamente as que faltam.
- A distribuição fica guardada em `avaliacao.pedido.plano` (código, unidade, dificuldade).

### Conferências novas para toda prova (23/10/2026)
- **Pergunta repetida no texto-base:** o sistema apaga a frase repetida, sem precisar refazer (`tirarPerguntaRepetida`, em `normalizarItem`).
- **Mesma situação em duas questões** (Jaccard das palavras de conteúdo ≥ 0,5; palavras como "figura" e "tabela" não contam): a segunda é refeita (`conferirRepeticoes`).
- **2ª IA revisora** aponta também: contexto sem sentido, figura ambígua e questão abaixo do nível do ano.
- **Completar:** se o tempo do servidor (5 min) acaba antes de fechar o número pedido, a resposta traz um token, e a tela pede as que faltam uma a uma (`/api/completar-avaliacao`, até 2 min cada, sem gastar geração, token válido por 30 min).
- A bateria `/qualidade` ganhou um 8º caso: diagnóstico de 10 questões do 7º ano. Ele só é aprovado com 10 questões, nenhuma habilidade repetida e nenhuma situação parecida.

## Apostila: conferências depois da IA
| Conferência | Arquivo | O que faz |
|---|---|---|
| Gabarito | `lib/gabarito.js` | Compara o resultado da resolução com as alternativas e corrige a letra se só uma bater. Nunca inventa resposta |
| Coerência | `lib/coerencia.js` | BNCC da etapa certa, quantidade mínima de exercícios, figuras citadas que faltam |
| Unidades, expoentes | `lib/unidades.js`, `lib/expoentes.js` | Escrita de unidades e potências |
| Revisão fixa | `lib/revisao.js` | Erros de digitação já vistos, blocos repetidos, conceito definido e nunca usado |
| Qualidade | `lib/qualidade.js` | Texto longo, frase de enfeite, alternativa repetida, pouca variedade. **Só avisa**, não altera |
| Auditoria pedagógica | `lib/auditoriaPedagogica.js` | Regras pedagógicas fixas sobre o texto |
| Auditoria completa | `lib/auditoria.js` | Junta tudo e dá nota 0–100. Usada na geração, em `/qualidade` e em `npm run auditar` |
| Apoios de acessibilidade | `lib/apoiosAcessibilidade.js` | Só aplica os apoios escolhidos; não infere diagnóstico; confere o exemplo guiado |

## Baterias de qualidade (`/qualidade`, só administradores)
- **Apostila** (`lib/bateria.js`): casos com disciplinas, etapas e anos variados, sempre com habilidades oficiais. Cerca de US$ 0,02 por caso, só texto.
- **Avaliação** (`lib/bateriaAvaliacao.js`): 5 temas de Matemática com figura e 2 de outras disciplinas.
  - Critério para publicar (Paulo, 16/10/2026): **nenhuma questão com gabarito fora das alternativas e nenhuma explicação com conta errada**.
  - Último resultado registrado: 7/7 com 5 questões cada (gpt-4o; o4-mini comparado, mais lento, descartado).
- O relatório baixado (JSON) pode ser reauditado com as regras atuais: `npm run auditar -- arquivo.json`.
- **Regra:** mudou prompt (`app/api/gerar-material/route.js`, `lib/avaliacao.js`...) ou conferência (`lib/`)? Rodar a bateria e comparar com a nota anterior **antes** de publicar.

## Custo
- **Medição real:** desde 22/10/2026, cada chamada grava tokens e custo estimado por pedido (`lib/custoIA.js`, tabela `custos_ia`, sem dado pessoal). Painel em **`/admin/custos`**, com média e "9 em 10 até" por recurso.
  - Preços em `PRECOS_PADRAO` (Gemini consultado em ai.google.dev/pricing em 22/10/2026); `PRECOS_IA` na Vercel substitui.
  - Dólar: `COTACAO_DOLAR`, padrão 5,30.
- **Estimativa anterior:** `docs/custo-ia-estimado.md`, de 15/10, só OpenAI. A ilustração (~US$ 0,05) é o item mais caro por material.
- **Para preço de escola ou rede:** usar a média e o p90 de `/admin/custos` depois de 1–2 semanas de uso real.

## Riscos conhecidos
1. Ordem OpenAI → Gemini (acima).
2. Confirmar que a `GEMINI_API_KEY` da Vercel é do projeto **pago**: no grátis, o Google pode usar os dados (`lgpd/02-operadores.md`).
3. O fallback de `corrigir-exercicio` consome uma correção mesmo sem corrigir.
4. A leitura da foto pode errar em marcação fraca. A tela obriga o professor a conferir antes de salvar (Termos, seção 5).
