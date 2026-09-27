"use client";
import { useEffect, useLayoutEffect, useState } from "react";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Capa = página única de tamanho fixo. Em vez de cortar texto com "…", ela
// mede a área disponível e, se o conteúdo não couber, vai simplificando em
// passos (ex.: 1 = sem resumo, 2 = BNCC só com o código, 3 = título menor).
// O texto completo sempre aparece nas páginas de conteúdo.
export function useAjusteAoCaber(ref, chave, maximo = 3) {
  const [nivel, setNivel] = useState(0);
  useIsoLayoutEffect(() => setNivel(0), [chave]);
  useIsoLayoutEffect(() => {
    const c = ref.current;
    if (c && nivel < maximo && c.scrollHeight > c.clientHeight + 1) setNivel((n) => n + 1);
  });
  return nivel;
}

// Tamanho do título da capa conforme o comprimento (sem cortar o texto)
export function tamanhoTitulo(texto = "", base = 44, reduzir = false) {
  const n = texto.length;
  const t = n <= 40 ? base : n <= 70 ? base * 0.86 : n <= 110 ? base * 0.73 : base * 0.62;
  return Math.round(reduzir ? t * 0.85 : t);
}
