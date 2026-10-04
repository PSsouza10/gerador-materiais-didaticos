import BateriaQualidade from "@/components/BateriaQualidade";

// Página interna do administrador: não aparece em buscadores nem no menu.
export const metadata = {
  title: "Bateria de qualidade · EduGera",
  robots: { index: false, follow: false },
};

export default function Qualidade() {
  return <BateriaQualidade />;
}
