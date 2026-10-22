// Páginas /prova-paulista e /bncc montadas sobre a base oficial da BNCC.
import bnccDados from "@/data/bncc-habilidades.json";
import { montarProvaPaulista } from "@/lib/provaPaulistaSeo";

export const PROVA_PAULISTA = montarProvaPaulista(bnccDados.habilidades || []);
