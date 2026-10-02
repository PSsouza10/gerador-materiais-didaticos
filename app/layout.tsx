import "@fontsource/fredoka/600.css";
import "@fontsource/fredoka/700.css";
import "./globals.css";
import Provedores from "@/components/Provedores";

const DESCRICAO =
  "Gere apostilas, fichas de estudo e exercícios com gabarito alinhados à BNCC, com prévia A4, PDF e ilustração. Grátis para professores.";

export const metadata = {
  metadataBase: new URL("https://edugera.vercel.app"),
  title: "EduGera · Apostilas BNCC",
  description: DESCRICAO,
  applicationName: "EduGera",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "EduGera",
    title: "EduGera · Apostilas BNCC",
    description: DESCRICAO,
  },
  twitter: { card: "summary", title: "EduGera · Apostilas BNCC", description: DESCRICAO },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <Provedores>{children}</Provedores>
      </body>
    </html>
  );
}
