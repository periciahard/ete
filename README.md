# Diagnóstico Pedagógico Inteligente

**Versão 15.0** — ETE Professor José Luiz de Mendonça

Sistema leve em HTML/CSS/JS para diagnóstico pedagógico por aluno, turma e descritor, com foco em SAEB, SAEPE, BNCC e Projeto ENEM.

## Recursos

- Painel institucional responsivo.
- Salvamento automático no navegador.
- Apagamento apenas por solicitação do usuário.
- Importação por CSV ou tabela colada.
- Mapeamento questão por questão com descritores.
- Feedback individual automático.
- Resultado geral da turma.
- Semáforo pedagógico.
- Mapa de calor.
- Plano “O que fazer amanhã?”.
- Relatórios para turma, família, conselho de classe e coordenação.
- Biblioteca consultável de descritores de Língua Portuguesa e Matemática do Ensino Médio.
- PWA: pode ser instalado no celular e funciona offline depois do primeiro acesso.

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todos os arquivos desta pasta.
3. Vá em **Settings > Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/root`.
6. Salve.

O site ficará disponível em um endereço parecido com:

`https://SEU_USUARIO.github.io/NOME_DO_REPOSITORIO/`

## Formato de importação recomendado

Use CSV ou cole uma tabela assim:

```csv
Aluno,Q1,Q2,Q3,Q4
Maria,1,0,1,1
João,0,1,1,0
```

Onde `1` significa acerto e `0` significa erro.

## Observação pedagógica

A biblioteca de descritores é editável nos arquivos:

- `descritores/portugues-em.json`
- `descritores/matematica-em.json`

Recomenda-se conferir e ajustar conforme a matriz vigente adotada pela rede, pelo SAEPE/CAEd e pelo SAEB/INEP.


## Modelo de Excel aceito na V13

O sistema agora reconhece automaticamente o modelo usado pela ETE:

| Nome | Q1 | Q2 | Q3 | ... | Q26 |
|---|---|---|---|---|---|
| Descritores | D16 | D4 | D10 | ... | D7 |
| Gabarito | C | A | E | ... | B |
| Nome do aluno | C | B | E | ... | A |

A leitura considera:

1. primeira linha = número das questões;
2. segunda linha = descritor vinculado a cada questão;
3. terceira linha = gabarito oficial;
4. demais linhas = respostas dos alunos.

O sistema compara cada resposta do aluno com o gabarito e usa os descritores da segunda linha para gerar diagnóstico da turma, feedback individual e plano de intervenção.


## Créditos
Criado por Felipe Camargo.

## Atualização V14
- Inclusão da logo da escola.
- Seleção de disciplina: Língua Portuguesa ou Matemática.
- Filtro de descritores conforme a disciplina escolhida.
- Modelo de importação: 1ª linha = questões; 2ª linha = descritores; 3ª linha = gabarito; demais linhas = respostas dos alunos.
