# LGPD · Direitos dos titulares (art. 18)

> **Estado: rascunho.** Não revisado por advogado. A Política promete resposta em até 15 dias.

Os pedidos chegam pelo e-mail de suporte (Política, seção 9). Cada pedido entra numa planilha simples: data, pedido, resposta, data da resposta.

| Direito | Como atender hoje | Onde no código | Lacuna |
|---|---|---|---|
| Confirmação e acesso | O professor vê seus materiais em "Minhas Apostilas", o perfil em "Minha conta" e o uso na página de planos. Para uma cópia completa, consulta manual ao banco feita pelo Claude Code a pedido do Paulo | "Exportar backup" na tela; `GET /api/conta` | Falta uma exportação completa **pelo próprio professor** (perfil, uso, assinatura) |
| Correção | O professor edita o perfil em "Minha conta" | `PUT /api/conta` | — |
| Exclusão | Botão de excluir a conta, com confirmação digitando EXCLUIR | `DELETE /api/conta` | **Em produção, só com `EXCLUSAO_CONTA=1`** [confirmar]. Sem ela, Paulo pede ao Claude Code a exclusão manual. Registros de pagamento ficam pelo prazo legal |
| Portabilidade | "Exportar backup" baixa a lista de materiais | `components/telas/MinhasApostilas.jsx` | Formato próprio (JSON), sem o conteúdo completo de cada material |
| Informação sobre compartilhamento | Política, seção 5 | `app/privacidade` | Falta citar o Neon |
| Revogação do consentimento / do acesso Google | Sair; revogar o app em myaccount.google.com | — | — |
| Revogar link compartilhado | "Revogar link" em Minhas Apostilas: apaga do banco e do Blob | `app/api/material/[id]` | — |
| Oposição / reclamação | E-mail; ANPD | — | — |

## Dados de estudantes
- O EduGera não guarda dado de aluno no servidor. Para apagar a correção da turma, o professor exclui a correção na tela ou limpa o navegador.
- Se um responsável pedir algo sobre dado de aluno, orientar o contato com a **escola**, que é a controladora. O EduGera não tem como localizar esse dado.

## Modelo de resposta (rascunho)
> Olá, recebemos seu pedido em DD/MM/AAAA. [Ação feita]. Os dados de pagamento ficam com o Asaas e o registro da cobrança é mantido pelo prazo exigido em lei. Qualquer dúvida, responda este e-mail. — EduGera
