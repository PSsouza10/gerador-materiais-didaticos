// Logotipo da fachada pública: um livro aberto (criatividade + confiança) com uma folha (BNCC/aprovação).
export function Simbolo({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <path d="M24 13c-4.5-3.6-10.6-5-17-4.4v27.2c6.4-.6 12.5.8 17 4.4z" fill="#5b45d6" />
      <path d="M24 13c4.5-3.6 10.6-5 17-4.4v27.2c-6.4-.6-12.5.8-17 4.4z" fill="#ee6a43" />
      <path d="M24 13v27.2" stroke="#faf6ee" strokeWidth="1.6" />
      <path d="M25.5 11.2c.4-4.6 3.6-7.8 8.6-8.2-.3 4.9-3.5 8.1-8.6 8.2z" fill="#3c9a62" />
      <path d="M22.6 11.4c-.8-3.4-3.3-5.6-6.9-5.8.4 3.6 2.8 5.7 6.9 5.8z" fill="#7cc495" />
    </svg>
  );
}

export default function Marca({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Simbolo />
      <span className="font-titulo text-[1.6rem] font-semibold leading-none tracking-tight text-marinho">EduGera</span>
    </span>
  );
}
