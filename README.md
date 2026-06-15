# ETE Professor José Luiz de Mendonça — Diagnóstico Pedagógico Inteligente

Sistema criado por **Felipe Camargo** para análise de resultados por questão, descritores SAEB/SAEPE, relatórios pedagógicos e Mapa da Mina individualizado.

## Versão
20.0

## Modelo de Excel recomendado

A planilha deve seguir este modelo:

| Aluno | Q1 | Q2 | Q3 |
|---|---|---|---|
| Descritores | D16 | D4 | D4 |
| Gabarito | C | C | C |
| Ana Silva | C | D | B |
| Bruno Souza | E | B | E |

O sistema identifica automaticamente:

1. primeira linha: questões;
2. segunda linha: descritores;
3. terceira linha: gabarito;
4. demais linhas: respostas dos alunos.

## IA no Mapa da Mina

No GitHub Pages o site é estático. Portanto, a IA só funciona se uma das opções abaixo for configurada:

### Opção recomendada: backend/proxy na Vercel

1. Publique este projeto também na Vercel.
2. No painel da Vercel, configure a variável de ambiente:

```text
OPENAI_API_KEY=sua_chave
```

3. No site, em **Configurações > Configurar IA**, informe a URL:

```text
https://seu-projeto.vercel.app/api/openai
```

### Opção de teste: chave direta no navegador

É possível informar a chave diretamente no navegador, mas isso não é recomendado para uso institucional, pois a chave pode ficar exposta no dispositivo do usuário.

## Arquivos principais

- `index.html`: página principal.
- `css/style.css`: visual do sistema.
- `js/app.js`: lógica do diagnóstico.
- `api/openai.js`: backend/proxy para Vercel.
- `assets/logo-ete.png`: logo institucional.
- `descritores/`: banco de descritores.

## Publicação no GitHub Pages

Envie todos os arquivos para o repositório e ative:

```text
Settings > Pages > Deploy from branch > main > root
```
