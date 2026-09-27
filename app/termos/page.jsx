import PaginaLegal, { H2, Lista, CONTATO } from "@/components/PaginaLegal";

export const metadata = {
  title: "Termos de Uso · EduGera",
  description: "Regras de uso do EduGera, gerador de materiais didáticos alinhados à BNCC.",
};

export default function TermosDeUso() {
  return (
    <PaginaLegal titulo="Termos de Uso">
      <p>
        Estes termos valem para o uso do <b>EduGera</b> (edugera.vercel.app), mantido por Paulo Sergio Souza de Jesus (PS
        Souza). Ao entrar com sua conta e usar o serviço, você concorda com eles. O tratamento de dados está descrito na{" "}
        <a className="text-indigo-600 underline" href="/privacidade">Política de Privacidade</a>.
      </p>

      <H2>1. O serviço</H2>
      <p>
        O EduGera gera apostilas, fichas de estudo e exercícios alinhados à BNCC com apoio de inteligência artificial, além de
        prévia em A4, PDF, impressão e links de compartilhamento.
      </p>

      <H2>2. Conta</H2>
      <Lista>
        <li>O acesso é feito com uma conta Google. Na primeira entrada, sua conta no EduGera é criada automaticamente.</li>
        <li>Você é responsável pelo uso da sua conta. Em computadores compartilhados, use <b>Sair</b> ao terminar.</li>
      </Lista>

      <H2>3. Plano gratuito e limites</H2>
      <Lista>
        <li>Cada conta tem um número de gerações gratuitas por mês, informado no próprio site. O limite renova no dia 1º.</li>
        <li>Se a IA falhar e o material não for gerado, a geração não é descontada.</li>
        <li>Os limites e as funções gratuitas podem mudar; mudanças serão avisadas no site. Planos pagos, se houver, terão condições próprias informadas antes da contratação.</li>
      </Lista>

      <H2>4. Conteúdo gerado por IA</H2>
      <Lista>
        <li>
          O material é produzido por inteligência artificial e <b>pode conter erros</b>. Revise conceitos, cálculos e o gabarito
          antes de usar com os estudantes. A decisão pedagógica é sempre do(a) professor(a).
        </li>
        <li>
          O texto oficial das habilidades vem da base da BNCC compilada pelo projeto bncc-dados (licença CC BY 4.0). Os textos
          normativos da BNCC são atos oficiais.
        </li>
        <li>Você pode usar, imprimir, adaptar e distribuir livremente os materiais que gerar, inclusive em sala de aula.</li>
      </Lista>

      <H2>5. Uso adequado</H2>
      <p>Não é permitido:</p>
      <Lista>
        <li>inserir nomes ou dados pessoais de estudantes no formulário;</li>
        <li>gerar conteúdo ilegal, discriminatório, violento ou impróprio para o ambiente escolar;</li>
        <li>tentar burlar os limites de uso, automatizar requisições ou prejudicar o funcionamento do site;</li>
        <li>compartilhar links com conteúdo que viole direitos de terceiros.</li>
      </Lista>
      <p>Contas que descumprirem estas regras podem ser suspensas.</p>

      <H2>6. Links compartilhados</H2>
      <p>
        Quem tem o link pode ver o material. Você controla os seus links e pode revogá-los a qualquer momento em &ldquo;Minhas
        Apostilas&rdquo;.
      </p>

      <H2>7. Disponibilidade e responsabilidade</H2>
      <p>
        O serviço é oferecido gratuitamente e no estado em que se encontra. Trabalhamos para mantê-lo estável, mas pode haver
        interrupções, por exemplo por manutenção ou por limites dos serviços de IA. Guarde cópias (PDF ou backup) dos materiais
        importantes. Nossa responsabilidade se limita ao que a lei determina.
      </p>

      <H2>8. Encerramento</H2>
      <p>
        Você pode deixar de usar o EduGera quando quiser e pedir a exclusão dos seus dados pelo e-mail{" "}
        <a className="text-indigo-600 underline" href={`mailto:${CONTATO}`}>{CONTATO}</a>.
      </p>

      <H2>9. Lei aplicável</H2>
      <p>
        Estes termos seguem a legislação brasileira, incluindo o Código de Defesa do Consumidor e a LGPD. Fica eleito o foro do
        domicílio do usuário.
      </p>

      <H2>10. Contato</H2>
      <p>
        Dúvidas, sugestões ou pedidos: <a className="text-indigo-600 underline" href={`mailto:${CONTATO}`}>{CONTATO}</a>.
      </p>
    </PaginaLegal>
  );
}
