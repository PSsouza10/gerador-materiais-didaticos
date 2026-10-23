# Jurídico · Política de Privacidade

> **Estado: rascunho (não revisado por advogado).** O texto em vigor é `app/privacidade/page.jsx` (edugera.app/privacidade). A base técnica está em `docs/lgpd/`.

## Seções publicadas
1. Responsável: Paulo, CPF; o encarregado é o próprio, pelo e-mail de suporte
2. Dados usados: login Google, contador de uso (hash do e-mail), formulário, materiais compartilhados, navegador, Minhas Apostilas, assinatura
3. Finalidades e bases legais: execução do serviço (art. 7º, V) e legítimo interesse para segurança (art. 7º, IX)
4. Dados de estudantes: não são necessários para gerar material; a correção fica no navegador; a foto vai à IA (Gemini, OpenAI como reserva) e não é guardada
5. Compartilhamento: Google, Vercel, Asaas, OpenAI, Gemini; transferência internacional (art. 33)
6. Links de compartilhamento
7. Cookies: só essenciais (sessão, segurança do login e identificador do navegador contra uso indevido do Grátis — guardado só como HMAC, junto do IP também em HMAC)
8. Retenção
9. Direitos (art. 18), resposta em 15 dias, ANPD
10. Segurança
11. Mudanças

## Divergências entre o texto e o código (corrigir)
| # | O texto diz | O código faz | Fonte |
|---|---|---|---|
| 1 | Fornecedores: Google, Vercel, Asaas, OpenAI | Também **Neon** (banco Postgres, EUA) | `lib/banco.js`, `lgpd/02-operadores.md` |
| 2 | Contador de uso e lista "Minhas Apostilas" ficam no Vercel/Blob | Hoje ficam **no banco Neon**. O Blob guarda cópias antigas e a cópia de cada material | `lib/contas.js`, `app/api/salvar-material` |
| 3 | Nome e escola só em materiais compartilhados | O **perfil** (nome de exibição, escola, disciplinas) fica guardado na conta | `lib/contas.js` (`perfil`) |
| 4 | Link compartilhado: "endereço aleatório" | Todo material salvo tem cópia no Blob com acesso público por endereço aleatório, mesmo sem o professor clicar em compartilhar | `app/api/salvar-material` |
| 5 | Retenção: "enquanto a conta existir" | Exclusão automática em produção depende de `EXCLUSAO_CONTA=1` **[confirmar]** | `lib/ambiente.js` |

Nenhuma dessas divergências envolve dado de aluno. As de 1 a 4 são de **transparência** sobre dados do professor.

## Pontos para o advogado
1. **Dados de criança e adolescente (art. 14):**
   - qual a base legal para a foto do cartão e para os nomes na correção;
   - o professor age em nome da escola, que é a controladora?
2. Mecanismo da **transferência internacional** (Resolução ANPD 19/2024).
3. Pessoa física como controladora e encarregada: avaliar a dispensa de encarregado para agente de pequeno porte (Resolução ANPD 2/2022) **[confirmar]**.
4. Prazo de resposta de 15 dias (art. 19, II).
