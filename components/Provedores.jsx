"use client";
import { SessionProvider } from "next-auth/react";

export default function Provedores({ children }) {
  return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>;
}
