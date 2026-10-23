# LGPD · Transferência internacional

> **Estado: rascunho.** Não revisado por advogado. A escolha do mecanismo legal (art. 33) é decisão jurídica.

## O que sai do Brasil
| Dado | Para | País | Por quê |
|---|---|---|---|
| Texto do formulário, PDF do plano | OpenAI, Google (Gemini) | EUA | Gerar o material |
| **Foto do cartão-resposta (estudante)** | Google (Gemini); OpenAI quando o Gemini falha | EUA | Ler as marcações |
| Conta (código HMAC), perfil, materiais, uso, assinatura | Neon (AWS US East 1) **[confirmar]** | EUA | Banco de dados |
| Arquivos do Blob, logs | Vercel | EUA **[confirmar região]** | Hospedagem |
| Login | Google | EUA | Autenticação |
| Pagamento | Asaas | **Brasil** (não há transferência) | Cobrança |

## O que a Política diz hoje (seção 5)
Cita Google, Vercel e OpenAI nos EUA e invoca "cláusulas e medidas de proteção compatíveis com a LGPD (art. 33)". **Não cita o Neon.**

## Pontos para o advogado
1. **Mecanismo:** a Resolução CD/ANPD nº 19/2024 regulamenta as cláusulas-padrão contratuais. Prazo de adequação informado pela ANPD: agosto de 2025 **[advogado confirmar se os contratos dos fornecedores já usam as cláusulas da ANPD ou só as europeias]**.
2. **Dado de estudante (menor):** a foto do cartão é o ponto mais sensível. Opções técnicas que reduzem o risco, a avaliar:
   - recortar ou borrar a área do nome no aparelho, antes de enviar a foto;
   - oferecer um cartão sem campo de nome, só com número;
   - para redes, usar a chave do Gemini da própria rede, no Google Cloud dela (a "chave própria" do modo Rede). Nesse caso a escolha de região e de contrato fica com a Secretaria.
3. Texto do formulário: a Política já pede que o professor **não escreva nomes de alunos**. Avaliar um aviso na própria tela, junto do campo.
