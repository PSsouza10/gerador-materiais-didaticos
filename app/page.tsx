import Fachada from "@/components/fachada/Fachada";

// Fachada pública. O gerador fica em /criar.
export const metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return <Fachada />;
}
