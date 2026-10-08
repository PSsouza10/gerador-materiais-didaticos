// Regras das migrações (sem acesso a banco — testáveis): quais arquivos existem,
// como dividir o SQL em instruções, e QUANDO é permitido migrar.
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { ehProducao } from "./ambiente.js";
import { urlBanco } from "./banco.js";

// Cada migração = par NNNN_nome.up.sql + NNNN_nome.down.sql (o down desfaz o up)
export function listarMigracoes(pasta) {
  const arquivos = readdirSync(pasta);
  return arquivos
    .filter((a) => /^\d{4}_[\w-]+\.up\.sql$/.test(a))
    .sort()
    .map((up) => {
      const nome = up.replace(/\.up\.sql$/, "");
      const down = `${nome}.down.sql`;
      return { nome, up: join(pasta, up), down: arquivos.includes(down) ? join(pasta, down) : null };
    });
}

// Divide o arquivo em instruções: tira comentários "--" e corta nos ";" de fim de linha
export function instrucoes(sql) {
  return String(sql)
    .split("\n")
    .filter((l) => !/^\s*--/.test(l))
    .join("\n")
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const lerInstrucoes = (arquivo) => instrucoes(readFileSync(arquivo, "utf8"));

// Migrar só no banco de TESTE: nunca em produção, nunca sem DATABASE_URL_TESTE
export function podeMigrar(env = process.env) {
  if (ehProducao(env)) return { ok: false, motivo: "produção: migrações desligadas na Fase 0" };
  if (!urlBanco(env)) return { ok: false, motivo: "DATABASE_URL_TESTE não configurada" };
  return { ok: true };
}

// O que falta aplicar (up) ou o que desfazer (down: só a ÚLTIMA aplicada)
export function planejar(todas, aplicadas, comando) {
  const feitas = new Set(aplicadas);
  if (comando === "up") return todas.filter((m) => !feitas.has(m.nome));
  if (comando === "down") {
    const ultima = [...todas].reverse().find((m) => feitas.has(m.nome));
    return ultima ? [ultima] : [];
  }
  return [];
}
