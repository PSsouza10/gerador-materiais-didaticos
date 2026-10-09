import GeradorApostilas from "@/components/GeradorApostilas";

// O gerador (o mesmo que ficava em "/"). A fachada pública agora está em "/".
export const metadata = {
  title: "Criar material · EduGera",
  description:
    "Monte sua apostila ou ficha de estudo alinhada à BNCC: escolha tema e habilidade, revise os exercícios e baixe o PDF do aluno e do professor.",
  alternates: { canonical: "/criar" },
  openGraph: { url: "/criar", title: "Criar material · EduGera" },
};

export default function Criar() {
  return <GeradorApostilas />;
}
