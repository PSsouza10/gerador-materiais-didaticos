// Dados que ficam no navegador do professor (sem login):
// preferências (Configurações) e a lista de materiais gerados (Minhas Apostilas).
// Todo acesso é protegido: em aba anônima ou com armazenamento bloqueado,
// o app continua funcionando, só não lembra entre visitas.

import { normalizarEstilo } from "@/lib/opcoes";

const K_CONFIG = "edugera:config";
const K_MATERIAIS = "edugera:materiais";
const LIMITE = 200;

const ler = (k, padrao) => {
  try {
    const v = window.localStorage.getItem(k);
    return v ? JSON.parse(v) : padrao;
  } catch {
    return padrao;
  }
};
const gravar = (k, v) => {
  try {
    window.localStorage.setItem(k, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
};

export const CONFIG_PADRAO = {
  professor: "",
  escola: "",
  disciplina: "Matemática",
  nivel: "Ensino Fundamental",
  estilo: "3D colorido",
  dificuldade: "padrao",
  capa: "escolar",
};

export const lerConfig = () => {
  const c = { ...CONFIG_PADRAO, ...ler(K_CONFIG, {}) };
  return { ...c, estilo: normalizarEstilo(c.estilo) };
};
export const salvarConfig = (cfg) => gravar(K_CONFIG, { ...CONFIG_PADRAO, ...cfg });

export const lerMateriais = () => {
  const l = ler(K_MATERIAIS, []);
  return Array.isArray(l) ? l : [];
};

export function adicionarMaterial(item) {
  const lista = lerMateriais().filter((m) => m.id !== item.id);
  lista.unshift(item);
  gravar(K_MATERIAIS, lista.slice(0, LIMITE));
  return lista;
}

export function removerMaterial(id) {
  const lista = lerMateriais().filter((m) => m.id !== id);
  gravar(K_MATERIAIS, lista);
  return lista;
}

export const limparMateriais = () => gravar(K_MATERIAIS, []);

export function atualizarMaterial(id, campos) {
  const lista = lerMateriais().map((m) => (m.id === id ? { ...m, ...campos } : m));
  gravar(K_MATERIAIS, lista);
  return lista;
}

// Backup em arquivo .json (lista + preferências). Inclui as chaves de
// revogação: guarde o arquivo em local seguro.
export function gerarBackup() {
  return JSON.stringify(
    { app: "EduGera", versao: 1, exportadoEm: new Date().toISOString(), config: lerConfig(), materiais: lerMateriais() },
    null,
    2
  );
}

// Junta o backup com o que já existe (não apaga nada); devolve quantos entraram
export function importarBackup(texto) {
  const dados = JSON.parse(texto);
  if (dados?.app !== "EduGera" || !Array.isArray(dados.materiais)) throw new Error("Arquivo não é um backup do EduGera.");
  const atuais = lerMateriais();
  const ids = new Set(atuais.map((m) => m.id));
  const novos = dados.materiais.filter(
    (m) => m && typeof m.id === "string" && typeof m.url === "string" && /^https?:\/\//.test(m.url) && !ids.has(m.id)
  );
  const lista = [...atuais, ...novos].sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
  gravar(K_MATERIAIS, lista.slice(0, LIMITE));
  if (dados.config && typeof dados.config === "object") salvarConfig({ ...lerConfig(), ...dados.config });
  return { importados: novos.length, lista };
}
