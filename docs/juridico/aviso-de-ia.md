# Jurídico · Aviso de conteúdo gerado por IA

> **Estado: rascunho (não revisado por advogado).**

## Onde o aviso aparece hoje
| Lugar | Texto (resumo) | Arquivo |
|---|---|---|
| Termos, seção 5 | O material é produzido por IA e pode ter erros; revise antes de usar; a decisão pedagógica é do professor; a conferência automática não substitui a revisão; confira a leitura da foto | `app/termos/page.jsx` |
| Gerador, abaixo do material | "Material gerado por IA: o EduGera confere contas, gabarito e BNCC, mas revise conceitos, exercícios e…" | `components/GeradorApostilas.jsx` |
| Folha A4 (gabarito) | "Gabarito gerado por IA e conferido automaticamente. Revise antes de aplicar." | `components/FolhaA4.jsx` |
| Avaliação | "Revise antes de…" | `components/telas/Avaliacao.jsx` |
| Plano de aula (tela e arquivo) | "Plano gerado com apoio de IA no EduGera. Revise antes de entregar." | `components/telas/PlanoAula.jsx` |
| Página inicial | "A IA pode errar. Por isso cada material diz 'revise antes de aplicar'…" | `components/fachada/Fachada.jsx` |
| Correção pela foto | O professor confere as letras lidas antes de salvar | `components/CorrecaoTurma.jsx` |

## Regras de comunicação (marketing)
- Dizer "**no formato** da Prova Paulista e do SARESP". Não dizer "oficial", "parceiro da Seduc" ou "questões que vão cair". As páginas públicas têm o aviso de não afiliação (`app/prova-paulista/*`).
- Apoios de acessibilidade: não prometer diagnóstico nem "adaptação para TEA" como laudo. São apoios escolhidos pelo professor (`lib/apoiosAcessibilidade.js`).
- Não dizer "registrada" sem confirmar o registro.

## Pontos para o advogado
1. Se o aviso na folha impressa basta, ou se o material entregue ao aluno também precisa dizer que foi gerado com IA.
2. PL 2338/2023 (marco legal da IA): acompanhar as regras de transparência, caso aprovado **[situação atual a confirmar]**.
