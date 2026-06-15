# ETE Professor José Luiz de Mendonça — Diagnóstico Pedagógico V39

Sistema Inteligente de Diagnóstico Educacional criado por Felipe Camargo.

## Objetivo principal

Importar resultados de avaliações, analisar desempenho por aluno e por descritor, gerar relatórios pedagógicos, Mapa da Mina, fichas de exercícios e leitura gestora para coordenação.

## Novidades V39

- Validação obrigatória antes da análise: relatórios só devem ser gerados com estrutura válida.
- Assistente guiado: Importar → Validar → Diagnosticar → Intervir → Salvar.
- Comparação Português × Matemática por turma a partir do histórico local.
- Painel da coordenação ampliado com turma crítica, descritores críticos e leitura gestora.
- Banco local de questões ampliado, com maior cobertura por disciplina e descritor.
- Modo local continua sendo o fluxo principal.
- Supabase permanece opcional e configurável pela tela de Configurações.
- OCR continua como recurso auxiliar, sempre com conferência manual.

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
