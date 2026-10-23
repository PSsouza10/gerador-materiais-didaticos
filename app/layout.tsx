import "@fontsource/fredoka/600.css";
import "@fontsource/fredoka/700.css";
import "./globals.css";
import Provedores from "@/components/Provedores";
import { SITE } from "@/lib/site";

const DESCRICAO =
  "Gere apostilas, fichas de estudo e exercícios com gabarito alinhados à BNCC, com prévia A4, PDF e ilustração. Grátis para professores.";

export const metadata = {
  metadataBase: new URL(SITE),
  title: "EduGera · Apostilas BNCC",
  description: DESCRICAO,
  applicationName: "EduGera",
  robots: { index: true, follow: true },
  verification: { google: "6SVO3CKpg0QArMjEuQz58MlGSoUOBy6iJmbqWs8J8Xs" },
  keywords: ["apostilas BNCC", "atividades BNCC", "gerador de atividades", "fichas de estudo", "exercícios com gabarito", "BNCC por ano"],
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
