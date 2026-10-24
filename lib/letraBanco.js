// "Minha letra" no banco (migração 0015): uma linha por conta; só a própria conta lê e usa.
import { consultar } from "./banco.js";
import { usuarioId, contaDe } from "./contas.js";

export async function lerLetra(email) {
  const [l] = await consultar("SELECT p.glifos FROM letras_professor p JOIN usuarios u ON u.id = p.usuario_id WHERE u.conta = $1", [contaDe(email)]);
  if (!l) return null;
  return typeof l.glifos === "string" ? JSON.parse(l.glifos) : l.glifos;
}

export async function salvarLetra(email, glifos) {
  const id = await usuarioId(email);
  await consultar(
    "INSERT INTO letras_professor (usuario_id, glifos) VALUES ($1, $2::jsonb) ON CONFLICT (usuario_id) DO UPDATE SET glifos = EXCLUDED.glifos, atualizado_em = now()",
    [id, JSON.stringify(glifos)]
  );
}

export async function apagarLetra(email) {
  const r = await consultar("DELETE FROM letras_professor WHERE usuario_id = (SELECT id FROM usuarios WHERE conta = $1) RETURNING usuario_id", [contaDe(email)]);
  return r.length > 0;
}
