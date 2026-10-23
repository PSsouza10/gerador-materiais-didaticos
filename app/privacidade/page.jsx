import PaginaLegal, { H2, Lista, CONTATO } from "@/components/PaginaLegal";
import { DOMINIO } from "@/lib/site";

export const metadata = {
  alternates: { canonical: "/privacidade" },
  openGraph: { type: "article", locale: "pt_BR", siteName: "EduGera", url: "/privacidade", title: "Política de Privacidade · EduGera" },
  title: "Política de Privacidade · EduGera",
  description: "Como o EduGera trata os dados de professores e professoras, em conformidade com a LGPD.",
};

export default function PoliticaPrivacidade() {
  return (
    <PaginaLegal titulo="Política de Privacidade">
      <p>
        O <b>EduGera</b> ({DOMINIO}) é um gerador de apostilas e materiais didáticos alinhados à BNCC, feito para
        professores e professoras. Esta política explica, em linguagem direta, quais dados usamos, para quê e quais são os seus
        direitos, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).
      </p>

      <H2>1. Quem é o responsável</H2>
      <p>
        O controlador dos dados é Paulo Sergio Souza de Jesus (PS Souza), CPF 014.320.325-85, responsável pelo EduGera. Contato do encarregado:{" "}
        <a className="text-indigo-600 underline" href={`mailto:${CONTATO}`}>{CONTATO}</a>.
      </p>

      <H2>2. Quais dados usamos</H2>
      <Lista>
        <li>
          <b>Login com Google:</b> nome, e-mail e foto do perfil, recebidos do Google quando você entra. Usamos só para
          identificar sua sessão. Não pedimos acesso a Gmail, Drive, contatos ou qualquer outro dado da sua conta Google.
        </li>
        <li>
          <b>Contador de uso:</b> quantas gerações e ilustrações você fez no mês. Fica guardado no servidor associado a um código
          irreversível (hash) do seu e-mail, <b>sem o e-mail e sem o nome</b>.
        </li>
        <li>
          <b>O que você escreve no formulário:</b> tema, habilidade da BNCC, orientações, disciplina e nível. Esse texto é enviado
          ao serviço de IA para gerar o material. Seu nome e o da escola <b>não</b> são enviados à IA.
        </li>
        <li>
          <b>Materiais compartilhados:</b> quando você cria um link de compartilhamento, guardamos o conteúdo da apostila, a
          ilustração e, se preenchidos, seu nome e o da escola, exatamente como aparecem na folha.
        </li>
        <li>
          <b>No seu navegador:</b> as preferências ficam só no seu aparelho (armazenamento local).
        </li>
        <li>
          <b>Lista &ldquo;Minhas Apostilas&rdquo;:</b> com login, é guardada também no servidor para aparecer em todos os seus
          aparelhos: título, tema, disciplina, código BNCC, data, link e chave de revogação de cada material. O arquivo não
          contém seu e-mail nem seu nome; é identificado por um código derivado da conta.
        </li>
        <li>
          <b>Assinatura paga (Pro):</b> guardamos o plano, a situação do pagamento, o valor e até quando o Pro vale, ligados à
          sua conta por um código aleatório. Nome, CPF, endereço e cartão você informa direto na página do Asaas; o EduGera
          não recebe nem guarda os dados do cartão.
        </li>
      </Lista>

      <H2>3. Para que usamos e com qual base legal</H2>
      <Lista>
        <li>Criar e manter sua conta e sessão, e aplicar o limite de gerações do plano gratuito: execução do serviço que você solicitou (art. 7º, V, LGPD).</li>
        <li>Gerar o conteúdo e a ilustração a partir do que você preencheu: execução do serviço (art. 7º, V).</li>
        <li>Hospedar os links que você decidiu compartilhar: execução do serviço, por sua iniciativa.</li>
        <li>Segurança e prevenção de abuso (por exemplo, impedir uso automatizado que esgote o serviço): legítimo interesse (art. 7º, IX).</li>
      </Lista>
      <p>Não vendemos dados, não exibimos anúncios e não usamos seus dados para criar perfis de marketing.</p>

      <H2>4. Dados de estudantes</H2>
      <p>
        Para gerar materiais, o EduGera não precisa de nenhum dado de alunos. <b>Não escreva nomes ou informações pessoais de
        estudantes</b> nos campos de tema, orientações ou observações: esse texto é enviado ao serviço de IA.
      </p>
      <p>
        <b>Correção da turma (Avaliação):</b> os nomes e números dos alunos e as respostas que você lança ficam{" "}
        <b>só no seu navegador</b> (armazenamento local) e não são enviados ao servidor do EduGera. Na leitura pela foto, a imagem
        do cartão-resposta é enviada ao serviço de IA (Google Gemini; se ele estiver indisponível, a OpenAI) apenas para
        identificar as letras marcadas. A foto pode mostrar o nome escrito no cartão, mas a IA é instruída a não extraí-lo, e o
        EduGera não guarda a foto. O relatório em PDF ou planilha é gerado no seu aparelho.
      </p>

      <H2>5. Com quem compartilhamos</H2>
      <p>Usamos poucos fornecedores, apenas para o serviço funcionar:</p>
      <Lista>
        <li><b>Google</b>: autenticação (login).</li>
        <li><b>Vercel</b>: hospedagem do site e armazenamento das ilustrações, dos links compartilhados, da lista &ldquo;Minhas Apostilas&rdquo; e do contador de uso.</li>
        <li><b>Asaas</b> (Brasil): processamento dos pagamentos dos planos Pro.</li>
        <li><b>OpenAI</b>: geração do texto e da ilustração a partir do que você preencheu e, como alternativa ao Gemini, leitura da foto do cartão-resposta. Pela política da API da OpenAI, os dados enviados não são usados para treinar modelos.</li>
        <li><b>Google (Gemini)</b>: geração e conferência do texto (inclusive quando a OpenAI está indisponível) e leitura da foto do cartão-resposta na correção da turma.</li>
      </Lista>
      <p>
        Google (inclusive o Gemini), Vercel e OpenAI ficam nos Estados Unidos, o que configura transferência internacional de dados. Ela é feita para
        executar o serviço que você pediu e com fornecedores que adotam cláusulas e medidas de proteção compatíveis com a LGPD
        (art. 33).
      </p>

      <H2>6. Links de compartilhamento</H2>
      <p>
        Qualquer pessoa com o link consegue abrir o material. O endereço é aleatório, não aparece em buscadores e fica ativo até
        você clicar em <b>Revogar link</b> em &ldquo;Minhas Apostilas&rdquo;. Depois de revogado, o material é apagado do
        servidor e cópias em cache expiram em até 1 minuto.
      </p>

      <H2>7. Cookies</H2>
      <p>
        Usamos apenas cookies essenciais: o de sessão (mantém você conectado por até 30 dias), os de segurança do login e um identificador do navegador para evitar uso indevido do plano Grátis. Não
        usamos cookies de publicidade nem de rastreamento.
      </p>

      <H2>8. Por quanto tempo guardamos</H2>
      <Lista>
        <li>Sessão: até 30 dias ou até você clicar em <b>Sair</b>.</li>
        <li>Contador de uso: enquanto sua conta existir; você pode pedir a exclusão a qualquer momento.</li>
        <li>Links compartilhados: até você revogar.</li>
        <li>Dados da assinatura paga: enquanto sua conta existir e pelo prazo que a lei exigir para registros de pagamento.</li>
        <li>O texto enviado à IA não é armazenado por nós depois que o material é gerado.</li>
      </Lista>

      <H2>9. Seus direitos</H2>
      <p>
        Você pode pedir, a qualquer momento: confirmação e acesso aos dados, correção, exclusão, informação sobre
        compartilhamento, portabilidade e revogação do consentimento (art. 18, LGPD). Basta escrever para{" "}
        <a className="text-indigo-600 underline" href={`mailto:${CONTATO}`}>{CONTATO}</a>. Respondemos em até 15 dias. Você
        também pode revogar o acesso do EduGera à sua conta Google em myaccount.google.com, em &ldquo;Segurança&rdquo; →
        &ldquo;Apps de terceiros&rdquo;. Se não ficar satisfeito, pode reclamar à Autoridade Nacional de Proteção de Dados
        (ANPD).
      </p>

      <H2>10. Segurança</H2>
      <p>
        O site usa conexão criptografada (HTTPS), a sessão é assinada, o registro de uso não contém e-mail nem nome e cada link
        compartilhado tem uma chave de revogação que só você (seus aparelhos com login) conhece.
      </p>

      <H2>11. Mudanças nesta política</H2>
      <p>
        Se esta política mudar, a data no topo será atualizada. Mudanças importantes serão avisadas no próprio site.
      </p>
    </PaginaLegal>
  );
}
