import "./globals.css";

export const metadata = {
  title: "EduGera · Apostilas BNCC",
  description:
    "Gerador de apostilas, fichas de estudo e materiais didáticos visuais alinhados à BNCC.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
