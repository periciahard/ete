# Sistema Inteligente de Diagnóstico Educacional — ETE Professor José Luiz de Mendonça

Criado por Felipe Camargo.

## Versão 25.0

Novidades:

- Remoção da dependência de IA.
- Mapa da Mina local e individualizado.
- Ficha de exercícios individualizada por aluno.
- TRI pedagógica da prova.
- Leitura de gabarito por foto com OCR local no navegador.
- Conferência manual do gabarito antes de salvar.
- Geração de modelo Excel a partir do gabarito lido por foto.
- Salvamento automático local.

## Modelo de Excel recomendado

1ª linha: número das questões: Q1, Q2, Q3...

2ª linha: descritores de cada questão: D1, D2, D3...

3ª linha: gabarito: A, B, C, D, E...

Demais linhas: respostas dos alunos.

Exemplo:

| Aluno | Q1 | Q2 | Q3 |
|---|---|---|---|
| Descritores | D16 | D4 | D4 |
| Gabarito | C | C | C |
| Ana Silva | C | D | B |

## Publicação no GitHub Pages

Envie todos os arquivos do pacote para o repositório e ative o GitHub Pages em Settings > Pages.


## Versão 25.0
- Cabeçalho fixo ao rolar a página.
- Leitura de foto aprimorada com prévia, status de OCR, pré-processamento de imagem e mensagens de erro claras.
- Atualização do service worker para evitar cache antigo no GitHub Pages.


## V25
- Salvamento manual de gabarito oficial digitado.
- Inclusão manual de aluno faltoso, com 26 respostas.
- Exportação dos dados em Excel e PDF.
