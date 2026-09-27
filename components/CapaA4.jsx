"use client";
import React, { forwardRef } from "react";
import CapaEscolar from "@/components/CapaEscolar";
import CapaComfy from "@/components/CapaComfy";
import { normalizarCapa } from "@/lib/opcoes";

// Escolhe a capa: "escolar" (clara, padrão), "comfy" (escura) ou "nenhuma".
const CapaA4 = forwardRef(function CapaA4({ variante, ...props }, ref) {
  const v = normalizarCapa(variante);
  if (v === "nenhuma") return null;
  return v === "comfy" ? <CapaComfy ref={ref} {...props} /> : <CapaEscolar ref={ref} {...props} />;
});

export default CapaA4;
