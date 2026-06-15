# ETE Professor José Luiz de Mendonça — Diagnóstico Educacional V45

Versão 45.0 do Sistema Inteligente de Diagnóstico Educacional.

## Melhorias da V45

- Aba **Alunos** ampliada com análise individual detalhada.
- Gráficos por aluno: acertos x erros, desempenho por descritor e faixa de desempenho.
- Leitura pedagógica individual: Elementar I, Elementar II, Básico e Desejável.
- Ações sugeridas ao professor com base nos descritores efetivamente errados por aluno.
- Descritores revisados conforme as matrizes SAEB da **3ª série do Ensino Médio** para Língua Portuguesa e Matemática.
- Validação passa a alertar quando o descritor importado não pertence à matriz da disciplina selecionada.
- Mantidos: modo local, Supabase opcional, importação Excel/PDF/manual, relatórios, coordenação, TRI pedagógica, banco de questões e Mapa da Mina individualizado.

## Modelo recomendado de planilha

1ª linha: questões  
2ª linha: descritores  
3ª linha: gabarito  
Demais linhas: respostas dos alunos

Exemplo:

| Aluno | Q1 | Q2 | Q3 |
|---|---|---|---|
| Descritores | D1 | D4 | D16 |
| Gabarito | A | C | D |
| Ana Silva | A | B | D |

## Observação importante

A classificação por nível é pedagógica e estimada a partir do percentual de acertos da avaliação interna. Ela não substitui a escala oficial nem a TRI oficial do SAEPE/SAEB.

Criado por Felipe Camargo.
