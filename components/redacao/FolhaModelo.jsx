// Folha-modelo "Minha letra" (A4): imprimir, escrever cada letra com caneta escura dentro do
// quadro, sobre a linha pontilhada, e fotografar a folha inteira com os 4 quadrados pretos.
import { FOLHA, MARCADOR, GRADE, CELULA, CARACTERES_MODELO, zonaDaCelula, BASE_NA_ZONA } from "@/lib/letraProfessor";

export default function FolhaModelo() {
  return (
    <svg viewBox={`0 0 ${FOLHA.largura} ${FOLHA.altura}`} className="folha-modelo block h-auto w-full bg-white" xmlns="http://www.w3.org/2000/svg">
      {MARCADOR.cantos.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={MARCADOR.lado} height={MARCADOR.lado} fill="#000" />
      ))}
      <text x={FOLHA.largura / 2} y={18} textAnchor="middle" fontSize="5" fontWeight="700" fill="#333">
        EduGera · Minha letra
      </text>
      <text x={FOLHA.largura / 2} y={25} textAnchor="middle" fontSize="2.8" fill="#666">
        Caneta preta ou azul. Uma letra por quadro, sobre a linha pontilhada, do seu jeito de escrever.
      </text>
      <text x={FOLHA.largura / 2} y={30} textAnchor="middle" fontSize="2.8" fill="#666">
        Depois fotografe a folha inteira, de frente, com os 4 quadrados pretos aparecendo.
      </text>
      {Array.from({ length: GRADE.colunas * GRADE.linhas }, (_, i) => {
        const col = i % GRADE.colunas;
        const lin = Math.floor(i / GRADE.colunas);
        const x = GRADE.x + col * CELULA.largura;
        const y = GRADE.y + lin * CELULA.altura;
        const c = CARACTERES_MODELO[i];
        const z = zonaDaCelula(i);
        return (
          <g key={i}>
            <rect x={x} y={y} width={CELULA.largura} height={CELULA.altura} fill="none" stroke="#d4d4d4" strokeWidth="0.25" />
            {c && (
              <>
                <text x={x + 1} y={y + 2.8} fontSize="2.6" fill="#a3a3a3">
                  {c}
                </text>
                <line x1={z.x + 0.5} x2={z.x + z.largura - 0.5} y1={z.y + z.altura * BASE_NA_ZONA} y2={z.y + z.altura * BASE_NA_ZONA} stroke="#cfcfcf" strokeWidth="0.25" strokeDasharray="0.8 0.8" />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
