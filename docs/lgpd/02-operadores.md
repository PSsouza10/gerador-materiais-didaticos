# LGPD · Operadores e fornecedores

> **Estado: rascunho.** Escrito a partir do código (22/10/2026). Não revisado por advogado.
> Os termos de cada fornecedor (DPA, retenção, treino de modelos) precisam ser conferidos nas contas reais. Esses pontos estão marcados **[confirmar]**.

| Fornecedor | Papel | O que recebe | Onde | Variáveis na Vercel (quem cola é o Paulo) | Na Política? |
|---|---|---|---|---|---|
| **Vercel** | Operador: hospedagem, funções, logs, Blob | Todo o tráfego do site; arquivos do Blob (materiais, ilustrações, histórico antigo); logs técnicos | EUA (funções) **[confirmar região]**; Blob de auditorias em `gru1` (São Paulo) | `BLOB_READ_WRITE_TOKEN`, `AUDITORIAS_*` | Sim |
| **Neon** | Operador: banco Postgres | Contas (código HMAC), perfil, materiais, uso, assinaturas, custos de IA | AWS US East 1, conforme `docs/plano-parte-b.md` **[confirmar no painel]** | `DATABASE_URL_PRODUCAO`, `BANCO_PRODUCAO`; teste: `DATABASE_URL_TESTE` | **Não. Falta incluir** |
| **Google (login)** | Fornecedor de identidade | Pedido de login; devolve nome, e-mail e foto | EUA | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Sim |
| **Google (Gemini API)** | Operador: IA | Texto do formulário; PDF do plano (Pro); **foto do cartão-resposta** | EUA | `GEMINI_API_KEY`, `MODELO_GEMINI`, `MODELOS_GEMINI` | Sim |
| **OpenAI** | Operador: IA | Texto do formulário; PDF do plano; pedido de ilustração; foto do cartão quando o Gemini falha | EUA | `OPENAI_API_KEY`, `MODELO_TEXTO`, `MODELO_MATEMATICA`, `QUALIDADE_IMAGEM` | Sim |
| **Asaas** | Controlador próprio dos dados de pagamento (instituição de pagamento); operador da cobrança | Do EduGera: só a referência aleatória e o item. Do professor, direto na página do Asaas: nome, CPF, e-mail, cartão ou Pix | Brasil | `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `PAGAMENTOS_PRODUCAO` | Sim |
| **GitHub** | Repositório do código | Código. **Não deve ter dados pessoais** (testes usam e-mails fictícios). Os documentos de `docs/` citam o CPF do controlador, que já é público nos Termos | EUA | — | Não precisa |
| **Mercado Pago** | Reserva de pagamento (código pronto, **desligado**) | Nada enquanto `MP_ACCESS_TOKEN` não existir | — | `MP_ACCESS_TOKEN` | Não precisa enquanto desligado |

## Uso dos dados pelos provedores de IA
- **OpenAI (API):** pela política pública da API, os dados não são usados para treinar modelos por padrão. Retenção para monitoramento de abuso: até 30 dias **[confirmar na conta; ver se cabe "Zero Data Retention"]**.
- **Gemini API:** no **plano pago**, o Google declara que não usa os pedidos para melhorar produtos. No **plano grátis, pode usar**. Paulo ativou o faturamento (conta paga) em outubro de 2026. **[confirmar que a `GEMINI_API_KEY` da Vercel é desse projeto pago]**. É o ponto 3 da revisão de 21/10.
- Nenhum provedor recebe o e-mail ou o nome do professor no pedido. O nome da escola e o do professor não entram no prompt (Política, seção 2).

## O que fazer
1. Incluir o Neon na Política de Privacidade (seção 5) e na transferência internacional (`03-transferencia-internacional.md`).
2. Guardar, em `docs/lgpd/contratos/` (pasta a criar, sem senhas), o PDF ou link datado do DPA/termos de cada fornecedor: Vercel, Neon, Google Cloud/Gemini, OpenAI e Asaas.
3. Confirmar a região do Blob principal e das funções da Vercel.
4. Para escolas e redes: o EduGera vira **operador** da escola (controladora dos dados dos alunos), e os fornecedores acima viram suboperadores. O contrato com a escola precisa listar todos eles.
