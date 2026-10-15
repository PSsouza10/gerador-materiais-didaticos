# Ficha de fatos do EduGera — versão 3 (situação em 15/10/2026)

Fonte interna de referência. Versão 2 aprovada por Paulo Sergio Souza de Jesus em 10/10/2026; esta versão 3 atualiza preços, cobrança e Plano de Aula conforme o código em produção (aguarda o OK do Paulo).

Use SOMENTE estas informações para descrever o EduGera. O que não estiver aqui não existe ou não está confirmado. Não acrescente recursos, números, clientes ou depoimentos.

## Identificação
- Nome: EduGera, gerador de apostilas e fichas de estudo alinhadas à BNCC, com apoio de inteligência artificial.
- Responsável: Paulo Sergio Souza de Jesus (PS Souza), professor de Matemática.
- Endereço: https://edugera.app (domínio próprio; o endereço antigo edugera.vercel.app redireciona para ele).
- Páginas: início (/), gerador (/criar), Plano de Aula, planos (/planos), painel de uso (/uso), Minhas Apostilas, Configurações, Termos de Uso (/termos), Política de Privacidade (/privacidade).
- Instagram: @edugera.app.
- Usuários e escolas clientes: não divulgar números (há poucas contas; nenhuma escola cliente).

## O que funciona hoje
- Login somente com conta Google; a conta é criada no primeiro acesso, sem formulário nem senha.
- Formulário com:
  - identificação do professor, disciplina, nível e ano/série;
  - turma (opcional), habilidade da BNCC (busca por código ou palavra-chave, com o texto oficial), tema e orientação ao professor (opcional);
  - dificuldade (Acompanhamento/Adaptado, Padrão, Desafio), número de exercícios (5, 8 ou 10), estilo das ilustrações e capa.
- Disciplinas: Matemática, Informática, Português, Ciências, História, Geografia, Arte, Educação Física, Língua Inglesa e Ensino Religioso.
- Níveis: Ensino Fundamental, Ensino Médio, EJA, Concurso e Curso Livre.
- O material gerado tem:
  - capa ilustrada (5 estilos ou sem capa);
  - situação do cotidiano em forma de diálogo entre personagens;
  - conceitos-chave e fórmulas;
  - exercícios de múltipla escolha e abertos;
  - gabarito com a resolução.
- Conferências automáticas: contas, gabarito (a letra marcada bate com o resultado), unidades, figuras e BNCC. A IA ainda pode errar, e o professor deve revisar.
- Antes de imprimir, o professor aprova, edita, corrige com IA ou exclui cada exercício. Há também uma revisão de conteúdo por IA.
- Saída:
  - prévia em folha A4;
  - PDF do aluno (sem gabarito) e PDF do professor (com gabarito);
  - impressão.
- Link de compartilhamento /m/<código>: quem tiver o link vê o material. O nome do professor e o da escola aparecem quando esses dados estão no material. O professor pode revogar o link a qualquer momento, e o link deixa de abrir.
- Minhas Apostilas: lista dos materiais, sincronizada entre computador e celular. Permite exportar a lista para um arquivo (.json) e importar de volta. Esse arquivo não é criptografado; o professor deve guardá-lo como qualquer documento pessoal.
- Painel "Uso e limites": mostra o que foi usado no mês e no dia e quando renova.

## Plano de Aula
- Gera um plano de aula na estrutura do Currículo Paulista: identificação, habilidade, objetivos, desenvolvimento aula a aula (introdução, desenvolvimento e fechamento), recursos, avaliação e recuperação.
- Três jeitos de começar:
  - tema livre (todos os planos);
  - a partir de uma apostila do EduGera (todos os planos);
  - a partir de um PDF próprio, como livro ou apostila da rede, até 3 MB (só no Pro).
- De 1 a 10 aulas (1, 2, 3, 4, 5, 6, 8 ou 10).
- Revisão automática: uma segunda leitura por IA confere o plano antes de mostrar e aponta o que corrigiu.
- Ilustração opcional do tema (gerada por IA). Se a apostila de origem tiver ilustração, ela entra no plano.
- Download em Word (.docx); também dá para imprimir ou salvar em PDF pelo navegador.
- Os planos gerados ficam salvos **neste navegador** (não sincronizam entre aparelhos). Para guardar em outro lugar, baixe em Word.
- Cada plano conta como 1 geração do plano do professor.

## Planos (situação atual)
- Desde 14/10/2026 o Pro pode ser contratado de verdade no site, com pagamento pelo **Asaas**:
  - Pro mensal: no cartão de crédito, renova sozinho todo mês; cancela quando quiser na própria página de planos.
  - Pro anual: no Pix ou no cartão (em até 12x), cobrado uma vez por ano; não renova sozinho.
  - Pro mensal no Pix: paga 1 mês, sem renovação automática (publicado em 15/10/2026).
- Valores e limites (lib/planos.js):

| | Grátis | Pro mensal | Pro anual | Escola |
|---|---|---|---|---|
| Preço | R$ 0 | R$ 39,90/mês | R$ 29,90/mês (R$ 358,80 cobrados uma vez por ano) | Em breve (sem preço) |
| Gerações de apostila | 2/mês (1/dia) | 30/mês (3/dia) | 30/mês (3/dia) | — |
| Revisões de conteúdo | 10/mês | 60/mês | 60/mês | — |
| Correções de exercício | 30/mês | 150/mês | 150/mês | — |
| Ilustrações por apostila | 1 | 2 | 2 | — |
| Biblioteca | 5 materiais mais recentes (os outros ficam guardados) | completa | completa | — |
| Capa Premium "História que Ensina" | não | sim | sim | — |
| Plano de Aula por tema ou a partir da apostila | sim | sim | sim | — |
| Plano de Aula a partir de PDF próprio | não | sim | sim | — |
| Plano de Aula em Word | sim | sim | sim | — |

- Transição dos limites do Grátis:
  - até 31/10/2026: regra antiga (5 gerações por mês, sem limite diário, biblioteca inteira);
  - a partir de 01/11/2026: 2 gerações por mês e 1 por dia, e biblioteca com os 5 materiais mais recentes.
  - O site já mostra esse aviso. Se algum documento for usado depois de 01/11/2026, atualize as datas antes.
- Não existe "prioridade de processamento" nem fila.
- Ao atingir o limite, a geração é bloqueada com uma mensagem clara, até a renovação.

## Dados e privacidade (como está implementado)
- **Login:** Google, com sessão em cookie. O e-mail não é gravado no banco: a conta é identificada por um código técnico gerado a partir do e-mail (HMAC).
- **Dados guardados:**
  - perfil opcional (nome de exibição, escola, disciplinas);
  - materiais gerados (título, tema, disciplina, nível, ano, BNCC e conteúdo);
  - registro de uso (tipo, data e código do pedido).
- **Registros técnicos (logs):** código do pedido (request_id), rota, método, status e duração. Não guardam e-mail, nome nem o texto da apostila.
- **No navegador do professor:** preferências e a lista de materiais (armazenamento local).
- **Alunos:** o EduGera não possui cadastro estruturado de alunos nem solicita nomes de alunos. Entretanto, campos de texto livre (orientação ao professor, tema e turma) podem receber informações inseridas pelo usuário; por isso, o sistema orienta que não sejam incluídos dados pessoais de estudantes.
- **Enviado à IA:** os campos do pedido (tema, orientação, disciplina, nível, ano, BNCC, dificuldade e quantidade). O nome do professor e a escola não fazem parte do pedido à IA.
- **Provedores:**
  - Vercel (hospedagem e armazenamento de arquivos);
  - Neon (banco de dados);
  - Google (login);
  - OpenAI (texto e ilustrações);
  - Google Gemini (reserva para o texto);
  - Asaas (Brasil; pagamentos do Pro). Nome, CPF, endereço e cartão o professor informa direto na página do Asaas; o EduGera identifica a conta por um código aleatório e não vê nem guarda o número do cartão (igual à Política de Privacidade do site).
- **Transferência internacional:** esses provedores são empresas com operação internacional. A localização dos dados depende da infraestrutura e da configuração de cada provedor, e deve ser confirmada na documentação de cada serviço. Por isso, pode haver transferência internacional de dados; a Política de Privacidade atual já menciona essa possibilidade.
- **Retenção:** não há exclusão automática por prazo. Os dados ficam até o professor remover ou até a exclusão da conta.
- **Exclusão da conta:** a exclusão pelo próprio professor ainda NÃO está disponível no site. Diga apenas que o recurso está planejado e que, até lá, a solicitação deve ser feita pelo canal de contato.
- **Contato:** contato.edugera@gmail.com e WhatsApp (11) 99561-4459 (os mesmos que aparecem no site). Ainda não há e-mail com domínio próprio. Não use o e-mail pessoal do responsável como contato comercial.
- **Encarregado (DPO):** ainda não definido formalmente.
- **Venda de dados:** o EduGera não vende dados e não usa ferramentas de anúncio ou de análise de terceiros.
- **Segurança comprovada:** HTTPS ativo, cabeçalhos de segurança presentes, cada professor só acessa os próprios materiais (testado) e as chaves de IA ficam só no servidor (verificado no navegador). Não usar expressões como "100% seguro" ou "criptografia de ponta a ponta".

## Não existe ainda (não divulgar como disponível)
- Plano Escola: aparece só como "Em breve", sem preço, sem número de professores e sem recursos definidos.
- E-mail com domínio próprio, exclusão de conta pelo próprio professor, colaboração entre professores, painel para a coordenação, aplicativo de celular, integração com plataformas escolares.
- Planos de aula sincronizados entre aparelhos (hoje ficam só no navegador).

## Regras para os textos
- Termos e Privacidade são rascunhos, e precisam de revisão de advogado especializado em LGPD antes de publicar.
- Não prometer economia de tempo nem melhoria de resultados sem estudo.
- Imagens: usar só telas reais do site (https://edugera.app e a vitrine da página inicial).
