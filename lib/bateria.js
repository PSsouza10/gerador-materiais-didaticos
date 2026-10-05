// Casos da bateria de qualidade: disciplinas, etapas e anos variados, com
// habilidades oficiais da BNCC. Cada caso é um pedido igual ao do formulário.
// Custo aproximado: só texto (sem ilustração), ~US$ 0,02 por caso.

const caso = (disciplina, nivel, ano, bncc, tema, questoes = 5, dificuldade = "padrao", conteudo = "") => ({
  disciplina, nivel, ano, bncc, tema, questoes, dificuldade, conteudo,
  professor: "Bateria de qualidade", escola: "", estilo: "3D colorido", capa: "nenhuma",
});

const F = "Ensino Fundamental";
const M = "Ensino Médio";

export const CASOS_BATERIA = [
  caso("Matemática", F, "1", "EF01MA06", "Fatos básicos da adição"),
  caso("Matemática", F, "3", "EF03MA07", "Multiplicação por 2, 3, 4, 5 e 10"),
  caso("Matemática", F, "4", "EF04MA09", "Frações unitárias na reta numérica", 8),
  caso("Matemática", F, "5", "EF05MA08", "Multiplicação e divisão com decimais"),
  caso("Matemática", F, "6", "EF06MA03", "As 4 operações com números naturais", 8),
  caso("Matemática", F, "7", "EF07MA30", "Volume de blocos retangulares"),
  caso("Matemática", F, "8", "EF08MA01", "Potências e notação científica", 8, "desafio"),
  caso("Matemática", F, "9", "EF09MA09", "Equação do 2º grau", 5, "adaptado"),
  caso("Matemática", M, "EM1", "EM13MAT302", "Função do 1º e 2º grau em situações reais"),
  caso("Português", F, "2", "EF02LP07", "Letra de imprensa e letra cursiva"),
  caso("Português", F, "7", "EF07LP03", "Prefixos e sufixos: palavras derivadas"),
  caso("Português", M, "EM1", "EM13LP01", "Texto e contexto de produção"),
  caso("Ciências", F, "3", "EF03CI05", "Fases da vida: do nascimento à vida adulta"),
  caso("Ciências", F, "5", "EF05CI02", "Mudanças de estado físico da água"),
  caso("Ciências", F, "8", "EF08CI01", "Fontes de energia renováveis e não renováveis"),
  caso("Ciências", F, "9", "EF09CI09", "Hereditariedade: as ideias de Mendel"),
  caso("Geografia", F, "6", "EF06GE04", "Ciclo da água e escoamento superficial"),
  caso("Geografia", F, "4", "EF04GE07", "Trabalho no campo e na cidade"),
  caso("História", F, "7", "EF07HI09", "Impactos da conquista europeia da América"),
  caso("História", F, "5", "EF05HI01", "Formação das culturas e dos povos"),
  caso("Arte", F, "6", "EF69AR01", "Artes visuais: tradicional e contemporânea"),
  caso("Educação Física", F, "9", "EF89EF09", "Exercício físico em excesso e suplementos"),
  caso("Língua Inglesa", F, "6", "EF06LI01", "Apresentações pessoais em inglês"),
];

// Conjunto 2: disciplinas e temas que o conjunto 1 não cobre (Informática, Ensino Religioso,
// Ensino Médio de Ciências e Humanas, alfabetização) e 2 pedidos SEM ano/BNCC, como
// professores costumam fazer (ex.: a apostila "Grandezas" que chegou genérica).
export const CASOS_BATERIA_2 = [
  caso("Matemática", F, "5", "EF05MA19", "Grandezas e medidas: massa, comprimento e capacidade"),
  caso("Matemática", F, "5", "EF05MA12", "Proporcionalidade em receitas"),
  caso("Matemática", F, "7", "EF07MA02", "Porcentagem: acréscimos e descontos"),
  caso("Matemática", F, "8", "EF08MA03", "Princípio multiplicativo da contagem"),
  caso("Matemática", M, "EM1", "EM13MAT303", "Juros simples e compostos"),
  caso("Matemática", F, "", "", "Grandezas"),
  caso("Português", F, "1", "EF01LP02", "Escrita de palavras e frases"),
  caso("Português", F, "4", "EF04LP03", "Uso do dicionário"),
  caso("Português", F, "9", "EF09LP01", "Notícias falsas nas redes sociais"),
  caso("Português", F, "", "", "Pontuação"),
  caso("Ciências", F, "2", "EF02CI03", "Prevenção de acidentes domésticos"),
  caso("Ciências", F, "6", "EF06CI01", "Misturas homogêneas e heterogêneas"),
  caso("Ciências", M, "EM1", "EM13CNT101", "Transformações e conservação de energia"),
  caso("História", F, "6", "EF06HI02", "Fontes históricas"),
  caso("História", M, "EM1", "EM13CHS601", "Protagonismo dos povos indígenas"),
  caso("Geografia", F, "8", "EF08GE03", "Dinâmica demográfica e pirâmide etária"),
  caso("Informática", F, "6", "EF06CO02", "Algoritmos com repetição e seleção"),
  caso("Informática", F, "5", "EF05CO03", "Lógica: verdadeiro, falso, E, OU e NÃO"),
  caso("Ensino Religioso", F, "7", "EF07ER03", "Lideranças nas tradições religiosas"),
  caso("Educação Física", F, "2", "EF12EF01", "Brincadeiras e jogos da cultura popular"),
];

export const CONJUNTOS_BATERIA = { 1: CASOS_BATERIA, 2: CASOS_BATERIA_2 };
