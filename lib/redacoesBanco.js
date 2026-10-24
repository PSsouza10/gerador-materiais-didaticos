// Histórico de redações corrigidas (tabela redacoes, migração 0013).
// O texto do aluno é dado pessoal: fica só aqui, nunca em log; a conta pode apagar cada redação
// (e apagar a conta apaga todas, ON DELETE CASCADE).
import { consultar } from "./banco.js";
import { usuarioId, contaDe } from "./contas.js";

export async function salvarRedacao(email, { tema = "", texto, perfil, genero = "dissertacao", resultado }) {
  const id = await usuarioId(email);
  const [l] = await consultar(
    "INSERT INTO redacoes (usuario_id, tema, texto, perfil, genero, resultado) VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING id",
    [id, tema, texto, perfil, genero, JSON.stringify(resultado)]
  );
  return String(l.id);
}

// Lista sem o texto (só o que a tela de histórico mostra)
export async function listarRedacoes(email, limite = 50) {
  const linhas = await consultar(
    "SELECT r.id, r.tema, r.perfil, r.genero, (r.resultado->>'notaTotal')::numeric AS nota, r.criado_em FROM redacoes r JOIN usuarios u ON u.id = r.usuario_id WHERE u.conta = $1 ORDER BY r.criado_em DESC, r.id DESC LIMIT $2",
    [contaDe(email), limite]
  );
  return linhas.map((l) => ({ id: String(l.id), tema: l.tema, perfil: l.perfil, genero: l.genero, nota: l.nota === null ? null : Number(l.nota), criadoEm: new Date(l.criado_em).toISOString() }));
}

const idValido = (id) => /^\d{1,18}$/.test(String(id));

export async function lerRedacao(email, id) {
  if (!idValido(id)) return null;
  const [l] = await consultar(
    "SELECT r.id, r.tema, r.texto, r.perfil, r.genero, r.resultado, r.criado_em FROM redacoes r JOIN usuarios u ON u.id = r.usuario_id WHERE u.conta = $1 AND r.id = $2",
    [contaDe(email), String(id)]
  );
  if (!l) return null;
  const resultado = typeof l.resultado === "string" ? JSON.parse(l.resultado) : l.resultado;
  return { id: String(l.id), tema: l.tema, texto: l.texto, perfil: l.perfil, genero: l.genero, resultado, criadoEm: new Date(l.criado_em).toISOString() };
}

export async function apagarRedacao(email, id) {
  if (!idValido(id)) return false;
  const r = await consultar("DELETE FROM redacoes WHERE id = $2 AND usuario_id = (SELECT id FROM usuarios WHERE conta = $1) RETURNING id", [contaDe(email), String(id)]);
  return r.length > 0;
}
