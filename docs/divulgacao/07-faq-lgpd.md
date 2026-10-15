# Perguntas frequentes sobre LGPD — EduGera

> **Aviso:** texto informativo preparado em 10/10/2026 e atualizado em 15/10/2026, com base no que está implementado. Antes de publicar ou entregar a uma escola, ele deve ser revisado por advogado ou profissional especializado em LGPD.

Legenda: ✅ implementado · 🕒 planejado · ⚖️ precisa de validação jurídica

---

**1. O EduGera armazena dados de alunos?** ✅
O EduGera não possui cadastro estruturado de alunos nem solicita nomes de alunos. Entretanto, campos de texto livre podem receber informações inseridas pelo usuário; por isso, o sistema orienta que não sejam incluídos dados pessoais de estudantes.

**2. O professor pode inserir nomes de alunos?** ✅
Não deve. O formulário avisa para não escrever nomes ou dados pessoais de alunos, e o campo Turma é só para a identificação da turma (por exemplo, "7º ano B").

**3. Onde os materiais são armazenados?** ✅ / ⚖️
Em provedores de nuvem: banco de dados na Neon e arquivos na Vercel. A localização dos dados depende da infraestrutura e da configuração desses provedores ⚖️ (a confirmar).

**4. Quem pode acessar os materiais?** ✅
Somente o professor dono da conta. Se o professor criar um link de compartilhamento, quem tiver o link pode ver aquele material.

**5. Como funcionam os links públicos?** ✅
O link pode exibir o nome do professor e o da escola, quando esses dados estiverem no material. O professor pode revogar o link a qualquer momento, e ele deixa de abrir.

**6. Como funciona o login?** ✅
Só com conta Google. O EduGera recebe nome, e-mail e foto do perfil para identificar a sessão. Não pede acesso a Gmail, Drive ou contatos e não guarda a senha. No banco, a conta é identificada por um código técnico, e não pelo e-mail.

**7. Como solicitar a exclusão da conta?** 🕒
A exclusão pelo próprio professor ainda não está disponível no site e está planejada. Até lá, a solicitação deve ser feita pelo canal de contato: contato.edugera@gmail.com.

**8. Quais dados vão para os provedores de IA?** ✅ / ⚖️
Os campos do pedido: tema, orientações, disciplina, nível, ano, BNCC, dificuldade e quantidade de exercícios. O nome do professor e o da escola não fazem parte do pedido. Os provedores são a OpenAI e, como reserva, o Google Gemini. Se os dados são guardados ou usados para treinamento, depende das políticas desses provedores ⚖️ (a confirmar).

**8b. E os planos de aula?** ✅
Vão para a IA os campos do pedido do plano (disciplina, nível, ano, tema, BNCC, número de aulas e orientações do professor) e, quando o professor escolhe, o texto da apostila ou o próprio arquivo PDF enviado como base (vai inteiro para a OpenAI). Nome do professor, escola, turma e período não vão para a IA; o pedido também manda a IA ignorar nomes de alunos que apareçam no material. Os planos gerados ficam salvos no navegador do professor.

**8c. Quem processa os pagamentos do Pro?** ✅
O Asaas (empresa brasileira). Nome, CPF, endereço e cartão o professor informa direto na página do Asaas; o EduGera não vê nem guarda o número do cartão.

**9. O EduGera vende dados?** ✅
Não. Também não usa ferramentas de publicidade nem de análise de terceiros.

**10. Há dados de crianças ou adolescentes?** ✅ / ⚖️
O EduGera é usado por professores e não tem cadastro de estudantes. O risco existe apenas se o professor digitar dados de alunos em campos livres, o que o sistema orienta a não fazer. Como tratar esse risco à luz do art. 14 da LGPD ⚖️ precisa de validação jurídica.

**11. Qual é a responsabilidade da escola?** ⚖️
Orientar os professores a não inserir dados de estudantes e a revisar o material antes de usar. A divisão formal de papéis (controlador e operador) precisa de validação jurídica.

**12. Existe contrato de tratamento de dados?** 🕒 / ⚖️
Ainda não. Ele será necessário se houver um plano para escolas, que hoje está "em breve".

**13. Por quanto tempo os dados ficam guardados?** ✅ / ⚖️
Não há exclusão automática por prazo: os dados ficam enquanto a conta existir ou até o professor remover o material. Os prazos dos registros técnicos nos provedores ⚖️ estão a confirmar.

**14. Existe canal para os direitos do titular?** 🕒
Hoje o canal é contato.edugera@gmail.com (WhatsApp (11) 99561-4459); um e-mail com domínio próprio ainda está pendente. Os direitos previstos no art. 18 da LGPD serão atendidos por esse canal.
