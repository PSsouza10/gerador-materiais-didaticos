// Dados que ficam no navegador do professor (sem login):
// preferências (Configurações) e a lista de materiais gerados (Minhas Apostilas).
// Todo acesso é protegido: em aba anônima ou com armazenamento bloqueado,
// o app continua funcionando, só não lembra entre visitas.

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
  estilo: "3D Pixar/Disney",
  dificuldade: "padrao",
  capa: "escolar",
};

export const lerConfig = () => ({ ...CONFIG_PADRAO, ...ler(K_CONFIG, {}) });
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
