"use client";
import { signIn } from "next-auth/react";

export default function Entrar({ voltarPara = "/redacao" }) {
  return (
    <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
      <p>Entre com sua conta Google para usar a Redação.</p>
      <button type="button" onClick={() => signIn("google", { callbackUrl: voltarPara })} className="mt-3 rounded-full app-btn-principal px-4 py-2 font-semibold text-white hover:brightness-110">
        Entrar com Google
      </button>
    </div>
  );
}
