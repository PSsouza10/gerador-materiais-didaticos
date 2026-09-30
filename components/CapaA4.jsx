"use client";
import React, { forwardRef } from "react";
import CapaEscolar from "@/components/CapaEscolar";
import CapaComfy from "@/components/CapaComfy";
import CapaInfografico from "@/components/CapaInfografico";
import { normalizarCapa } from "@/lib/opcoes";

// Escolhe a capa: "infografico" (pôster com mascote, padrão), "escolar" (clara), "comfy" (escura) ou "nenhuma".
const CapaA4 = forwardRef(function CapaA4({ variante, ...props }, ref) {
  const v = normalizarCapa(variante);
  if (v === "nenhuma") return null;
  if (v === "comfy") return <CapaComfy ref={ref} {...props} />;
  if (v === "infografico") return <CapaInfografico ref={ref} {...props} />;
  return <CapaEscolar ref={ref} {...props} />;
});

export default CapaA4;
