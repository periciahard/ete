# Sistema Inteligente de Diagnóstico Educacional — ETE Professor José Luiz de Mendonça

Criado por **Felipe Camargo**.

Versão **19.0**.

## O que esta versão faz

- Importa Excel no modelo da escola:
  - linha 1: número das questões;
  - linha 2: descritores;
  - linha 3: gabarito;
  - demais linhas: respostas dos alunos.
- Permite selecionar a disciplina: **Língua Portuguesa** ou **Matemática**.
- Filtra descritores, relatórios e intervenções pela disciplina escolhida.
- Gera diagnóstico da turma, análise individual, relatórios e Mapa da Mina.
- Gera Mapa da Mina individualizado por aluno.
- Gera **10 questões individualizadas por aluno**, com base nos descritores prioritários.
- Funciona em GitHub Pages como site estático/PWA.
- Inclui opção de IA por:
  1. chave informada no navegador, para testes rápidos;
  2. backend/proxy, recomendado para uso institucional.

## Publicação no GitHub Pages

Envie todos os arquivos para o repositório e ative:

`Settings > Pages > Deploy from branch > main > /root`

## IA no GitHub Pages

O GitHub Pages é estático. Por isso, não consegue proteger uma chave de API se ela estiver escrita no código do site.

Para testes rápidos, o professor pode informar a chave no navegador, no campo de configuração de IA. Essa chave fica salva apenas no armazenamento local do navegador usado.

Para uso institucional, recomenda-se usar o backend/proxy incluído na pasta `api/`.

## Backend/proxy de IA recomendado

A pasta `api/openai.js` foi preparada para Vercel.

Passos resumidos:

1. Crie uma conta na Vercel.
2. Importe este repositório.
3. Configure a variável de ambiente:

```text
OPENAI_API_KEY=sua_chave_aqui
```

4. Publique o projeto.
5. Copie a URL do endpoint, por exemplo:

```text
https://seu-projeto.vercel.app/api/openai
```

6. Cole essa URL no campo **URL do backend/proxy de IA** dentro do site.

Assim, a chave fica protegida no servidor e não aparece no código público do GitHub Pages.

## Observação

A geração de IA utiliza a **Responses API** da OpenAI. O endpoint local chama `https://api.openai.com/v1/responses`.
