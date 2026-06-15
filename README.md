# ETE Professor José Luiz de Mendonça — Diagnóstico Pedagógico V43

Sistema Inteligente de Diagnóstico Educacional criado por Felipe Camargo.

## Objetivo principal

Importar resultados de avaliações, analisar desempenho por aluno e por descritor, gerar relatórios pedagógicos, Mapa da Mina, fichas de exercícios e leitura gestora para coordenação.

## Novidades V43

- Aba de Diagnóstico com elementos gráficos: distribuição por nível, barras por nível, descritores críticos e questões críticas.
- Gráfico de pizza em CSS para os níveis Elementar I, Elementar II, Básico e Desejável.
- Gráficos de barras sem dependências externas, mantendo o site leve e compatível com GitHub Pages.
- Nova seção “Análise pedagógica e sugestões ao professor”.
- Sugestões mais objetivas para recomposição, reagrupamento por descritor, correção estratégica e acompanhamento.
- Mapa da Mina permanece individualizado e sem IA paga.
- Leitura por foto/OCR continua removida; o caminho principal é Excel/PDF/manual.

## Formato recomendado do Excel

1. Primeira linha: número das questões, Q1 a Q26.
2. Segunda linha: descritores de cada questão.
3. Terceira linha: gabarito.
4. Demais linhas: respostas dos alunos.

## Supabase

Use apenas:

- Project URL
- Anon public key

Nunca coloque chave secreta/service role no GitHub Pages.

Antes de usar o modo institucional, execute o script `supabase_ete_diagnostico_schema.sql` no SQL Editor do Supabase e cadastre os usuários em Authentication. Depois cadastre os perfis e vínculos professor–turma–disciplina nas tabelas correspondentes.

## Uso recomendado

1. Importar avaliação.
2. Conferir validação.
3. Analisar diagnóstico.
4. Gerar relatórios.
5. Gerar recuperação/ficha.
6. Salvar backup local ou sincronizar na nuvem.
