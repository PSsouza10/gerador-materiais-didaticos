import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// Login de TESTE para testes automatizados locais. Nunca liga na Vercel.
const authTeste = process.env.AUTH_TESTE === "1" && !process.env.VERCEL && !!process.env.NEXTAUTH_SECRET;
import { getServerSession } from "next-auth/next";

// Login com Google (NextAuth, sessão em cookie JWT — sem banco de dados).
// Variáveis na Vercel: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL.
export const authConfigurado =
  authTeste || !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.NEXTAUTH_SECRET);

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: { params: { prompt: "select_account" } },
          }),
        ]
      : []),
    ...(authTeste
      ? [
          CredentialsProvider({
            id: "teste",
            name: "Teste",
            credentials: { email: { label: "E-mail", type: "email" } },
            authorize: async (c) => (c?.email ? { id: c.email, email: c.email, name: "Professor Teste" } : null),
          }),
        ]
      : []),
  ],
  callbacks: {
    // só aceita contas Google com e-mail verificado
    async signIn({ account, profile }) {
      if (account?.provider === "google") return profile?.email_verified !== false;
      return true;
    },
  },
};

export async function usuarioAtual() {
  if (!authConfigurado) return null;
  const s = await getServerSession(authOptions);
  return s?.user?.email ? { email: s.user.email.toLowerCase(), nome: s.user.name || "" } : null;
}
