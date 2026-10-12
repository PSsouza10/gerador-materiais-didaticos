// Páginas /atividades montadas sobre a base oficial da BNCC (data/bncc-habilidades.json).
import bnccDados from "@/data/bncc-habilidades.json";
import { montarAtividades } from "@/lib/atividades";

export const ATIVIDADES = montarAtividades(bnccDados.habilidades || []);
