// Reaudita um relatório baixado da página /qualidade com as regras ATUAIS.
// Uso: npm run auditar -- caminho/edugera-bateria-....json
import { readFileSync } from "node:fs";
import { auditarMaterial, resumirBateria } from "../lib/auditoria.js";

const arquivo = process.argv[2];
if (!arquivo) {
  console.error("Uso: npm run auditar -- relatorio.json");
  process.exit(1);
}
const rel = JSON.parse(readFileSync(arquivo, "utf8"));
const resultados = (rel.resultados || []).map((r) =>
  r.material ? { ...r, auditoria: auditarMaterial(r.caso, r.material, { questoes: r.caso?.questoes }) } : r
);
for (const r of resultados) {
  const a = r.auditoria;
  console.log(`${a ? String(a.nota).padStart(3) : "  —"}  ${r.caso?.disciplina} ${r.caso?.ano} · ${r.caso?.tema}${a ? `  (${a.erros} erro, ${a.avisos} aviso)` : `  FALHOU: ${r.erro}`}`);
  for (const p of a?.problemas || []) console.log(`       ${p.gravidade === "erro" ? "✗" : "·"} ${p.onde} [${p.fonte}]: ${p.motivo}`);
}
const s = resumirBateria(resultados);
console.log(`\nMédia ${s.media} · aprovados ${s.aprovados}/${s.gerados} · falhas ${s.falhas}`);
for (const c of s.comuns) console.log(`  ${c.vezes}× ${c.problema}`);
