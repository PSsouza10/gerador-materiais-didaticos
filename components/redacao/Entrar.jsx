"use client";
import { signIn } from "next-auth/react";

export default function Entrar({ voltarPara = "/redacao" }) {
  return (
    <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
      <p>Entre com sua conta Google para usar a Redação.</p>
      <button type="button" onClick={() => signIn("google", { callbackUrl: voltarPara })} className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">
        Entrar com Google
      </button>
    </div>
  );
}
