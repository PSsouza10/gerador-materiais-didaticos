# LGPD · Resposta a incidentes de segurança

> **Estado: rascunho.** Não revisado por advogado. Prazos com base na Resolução CD/ANPD nº 15/2024 **[advogado confirmar]**.

## O que conta como incidente
Acesso, vazamento, perda ou alteração indevida de dado pessoal. Exemplos possíveis no EduGera:
- vazamento de uma chave: `NEXTAUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`, `DATABASE_URL_PRODUCAO`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ASAAS_API_KEY`;
- uma conta enxergando material de outra (há teste automático contra isso: `tests/contas.test.mjs`);
- arquivo do Blob com dado pessoal exposto por um link que deveria ter sido revogado;
- foto de cartão-resposta guardada por engano (o código não guarda; um log com o conteúdo seria incidente).

## Passo a passo
1. **Conter (na hora):**
   - Paulo troca a chave vazada no painel do fornecedor e cola a nova na Vercel. O Claude não lê nem copia chaves.
   - Cuidado: trocar `NEXTAUTH_SECRET` ou `BLOB_READ_WRITE_TOKEN` muda os caminhos derivados e desliga o acesso aos arquivos antigos (`docs/plano-parte-b.md`). Antes, avaliar com o Claude Code o plano de migração.
   - Se preciso, voltar o site a um deploy anterior (`docs/rollback.md`) ou desligar o recurso por variável. Exemplos: `PAGAMENTOS_PRODUCAO`, `BANCO_PRODUCAO`.
2. **Registrar** em `docs/lgpd/registro-de-incidentes.md` (criar quando houver o primeiro): data e hora da descoberta, o que aconteceu, quais dados, quantos titulares, o que foi feito.
   - Os logs da Vercel têm `request_id` por pedido e ajudam a medir o alcance.
3. **Avaliar o risco:** há risco ou dano relevante aos titulares? Dado de criança ou adolescente, como a foto de cartão, pesa a favor de comunicar.
4. **Comunicar**, se houver risco relevante:
   - à **ANPD**, em até **3 dias úteis** da ciência, pelo formulário no site da ANPD;
   - aos **titulares**, no mesmo prazo, por e-mail ou aviso no site, em linguagem simples;
   - a escolas ou redes contratantes, se o dado for de alunos delas (o contrato deve trazer o prazo).
5. **Guardar o registro** do incidente por pelo menos 5 anos, mesmo que não tenha sido comunicado.

## Prevenção que já existe no código
- O e-mail não fica no banco (HMAC); o log não leva e-mail, nome, texto nem chave (`lib/requestId.js`).
- O webhook de pagamento relê a cobrança na API e não confia no corpo do aviso (`lib/cobranca.js`).
- O site de teste usa banco e Blob separados e IA simulada. Nada de teste liga em produção (`lib/ambiente.js`).
- Rotas de administrador conferem `ADMIN_EMAILS` no servidor.
