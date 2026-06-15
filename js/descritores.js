(function(){
 const comum={
  erros:'Leitura incompleta do comando; confusão entre conceito e procedimento; dificuldade em justificar a alternativa escolhida.',
  estrategias:'Retomada guiada do descritor, resolução modelada pelo professor, treino com itens graduados e devolutiva curta por evidência de aprendizagem.'
 };
 const lp=[
  ['D1','Procedimentos de leitura','Localizar informações explícitas em um texto.','Trabalha a busca direta de informações declaradas no texto.','EM13LP01/EM13LP02'],
  ['D3','Procedimentos de leitura','Inferir o sentido de uma palavra ou expressão.','Exige interpretar vocabulário pelo contexto e pelas pistas textuais.','EM13LP02'],
  ['D4','Procedimentos de leitura','Inferir uma informação implícita em um texto.','Exige leitura inferencial e articulação de pistas não literais.','EM13LP02'],
  ['D6','Procedimentos de leitura','Identificar o tema de um texto.','Verifica a compreensão global e a ideia central do texto.','EM13LP03'],
  ['D14','Procedimentos de leitura','Distinguir um fato da opinião relativa a esse fato.','Avalia diferenciação entre informação verificável e posicionamento opinativo.','EM13LP05'],
  ['D5','Suporte, gênero e enunciador','Interpretar texto com auxílio de material gráfico diverso.','Exige integrar linguagem verbal e não verbal: imagens, gráficos, quadrinhos, fotos e infográficos.','EM13LP14'],
  ['D12','Suporte, gênero e enunciador','Identificar a finalidade de textos de diferentes gêneros.','Avalia reconhecimento do objetivo comunicativo do gênero textual.','EM13LP15'],
  ['D20','Relação entre textos','Reconhecer diferentes formas de tratar uma informação na comparação de textos que tratam do mesmo tema.','Exige comparação entre textos, contexto de produção e formas de abordagem.','EM13LP06'],
  ['D21','Relação entre textos','Reconhecer posições distintas entre duas ou mais opiniões relativas ao mesmo fato ou tema.','Avalia comparação de pontos de vista e posicionamentos argumentativos.','EM13LP05/EM13LP06'],
  ['D2','Coerência e coesão','Estabelecer relações entre partes de um texto, identificando repetições ou substituições que contribuem para sua continuidade.','Avalia coesão referencial e continuidade temática.','EM13LP02'],
  ['D7','Coerência e coesão','Identificar a tese de um texto.','Exige reconhecer a posição central defendida pelo texto.','EM13LP05'],
  ['D8','Coerência e coesão','Estabelecer relação entre a tese e os argumentos oferecidos para sustentá-la.','Avalia articulação argumentativa e sustentação de ponto de vista.','EM13LP05'],
  ['D9','Coerência e coesão','Diferenciar as partes principais das secundárias em um texto.','Exige hierarquização de informações e identificação de ideias centrais.','EM13LP02'],
  ['D10','Coerência e coesão','Identificar o conflito gerador do enredo e os elementos que constroem a narrativa.','Avalia compreensão da estrutura narrativa e de seus elementos.','EM13LP03'],
  ['D11','Coerência e coesão','Estabelecer relação causa/consequência entre partes e elementos do texto.','Exige identificar relações lógicas de causalidade no texto.','EM13LP02'],
  ['D15','Coerência e coesão','Estabelecer relações lógico-discursivas presentes no texto, marcadas por conjunções, advérbios etc.','Avalia conectores e relações de sentido como oposição, causa, conclusão, tempo e condição.','EM13LP02'],
  ['D16','Recursos expressivos e efeitos de sentido','Identificar efeitos de ironia ou humor em textos variados.','Exige compreender sentidos indiretos e efeitos expressivos.','EM13LP06'],
  ['D17','Recursos expressivos e efeitos de sentido','Reconhecer o efeito de sentido decorrente do uso da pontuação e de outras notações.','Avalia efeitos produzidos por pontuação, destaque gráfico e marcações expressivas.','EM13LP06'],
  ['D18','Recursos expressivos e efeitos de sentido','Reconhecer o efeito de sentido decorrente da escolha de uma determinada palavra ou expressão.','Exige reconhecer carga semântica, conotação e escolha lexical.','EM13LP06'],
  ['D19','Recursos expressivos e efeitos de sentido','Reconhecer o efeito de sentido decorrente da exploração de recursos ortográficos e/ou morfossintáticos.','Avalia efeitos produzidos por escolhas gramaticais, ortográficas e sintáticas.','EM13LP06'],
  ['D13','Variação linguística','Identificar as marcas linguísticas que evidenciam o locutor e o interlocutor de um texto.','Avalia adequação linguística, marcas sociais, regionais, situacionais e interlocutivas.','EM13LP10']
 ];
 const mat=[
  ['D1','Espaço e forma','Identificar figuras semelhantes mediante o reconhecimento de relações de proporcionalidade.','Trabalha semelhança, escala e proporcionalidade em figuras.','EM13MAT105'],
  ['D2','Espaço e forma','Reconhecer aplicações das relações métricas do triângulo retângulo em problema com figuras planas ou espaciais.','Exige mobilizar Pitágoras e relações métricas em contexto.','EM13MAT308'],
  ['D3','Espaço e forma','Relacionar diferentes poliedros ou corpos redondos com suas planificações ou vistas.','Avalia visualização espacial, planificações e vistas.','EM13MAT309'],
  ['D4','Espaço e forma','Identificar a relação entre número de vértices, faces e/ou arestas de poliedros expressa em um problema.','Exige propriedades de poliedros e relação de Euler.','EM13MAT309'],
  ['D5','Espaço e forma','Resolver problema que envolva razões trigonométricas no triângulo retângulo.','Avalia seno, cosseno e tangente em situações-problema.','EM13MAT308'],
  ['D6','Espaço e forma','Identificar a localização de pontos no plano cartesiano.','Trabalha leitura de coordenadas e localização no plano.','EM13MAT301'],
  ['D7','Espaço e forma','Interpretar geometricamente os coeficientes da equação de uma reta.','Avalia significado de coeficientes angular e linear.','EM13MAT301'],
  ['D8','Espaço e forma','Identificar a equação de uma reta apresentada a partir de dois pontos dados ou de um ponto e sua inclinação.','Exige modelar retas por informações geométricas.','EM13MAT301'],
  ['D9','Espaço e forma','Relacionar a determinação do ponto de interseção de duas ou mais retas com a resolução de um sistema de equações.','Integra geometria analítica e sistemas lineares.','EM13MAT301'],
  ['D10','Espaço e forma','Reconhecer, dentre equações do 2º grau com duas incógnitas, as que representam circunferências.','Avalia identificação algébrica da circunferência.','EM13MAT301'],
  ['D11','Grandezas e medidas','Resolver problema envolvendo o cálculo de perímetro de figuras planas.','Exige selecionar medidas e calcular contornos.','EM13MAT201'],
  ['D12','Grandezas e medidas','Resolver problema envolvendo o cálculo de área de figuras planas.','Avalia cálculo e composição/decomposição de áreas.','EM13MAT201'],
  ['D13','Grandezas e medidas','Resolver problema envolvendo a área total e/ou volume de um sólido.','Trabalha prismas, pirâmides, cilindros, cones e esferas.','EM13MAT309'],
  ['D14','Números, operações, álgebra e funções','Identificar a localização de números reais na reta numérica.','Avalia ordenação e representação de números reais.','EM13MAT101'],
  ['D15','Números, operações, álgebra e funções','Resolver problema que envolva variação proporcional, direta ou inversa, entre grandezas.','Exige modelar proporcionalidade direta e inversa.','EM13MAT302'],
  ['D16','Números, operações, álgebra e funções','Resolver problema que envolva porcentagem.','Avalia porcentagem, acréscimos, descontos e comparações percentuais.','EM13MAT104'],
  ['D17','Números, operações, álgebra e funções','Resolver problema envolvendo equação do 2º grau.','Exige modelar e resolver situações com equações quadráticas.','EM13MAT302'],
  ['D18','Números, operações, álgebra e funções','Reconhecer expressão algébrica que representa uma função a partir de uma tabela.','Integra padrões em tabelas e representação algébrica.','EM13MAT101'],
  ['D19','Números, operações, álgebra e funções','Resolver problema envolvendo uma função do 1º grau.','Avalia modelagem por função afim.','EM13MAT302'],
  ['D20','Números, operações, álgebra e funções','Analisar crescimento/decrescimento e zeros de funções reais apresentadas em gráficos.','Exige interpretar gráficos de funções e seus comportamentos.','EM13MAT101'],
  ['D21','Números, operações, álgebra e funções','Identificar o gráfico que representa uma situação descrita em um texto.','Avalia tradução entre texto e gráfico.','EM13MAT101'],
  ['D22','Números, operações, álgebra e funções','Resolver problema envolvendo P.A./P.G. dada a fórmula do termo geral.','Trabalha progressões aritméticas e geométricas.','EM13MAT507'],
  ['D23','Números, operações, álgebra e funções','Reconhecer o gráfico de uma função polinomial de 1º grau por meio de seus coeficientes.','Avalia relação entre coeficientes e gráfico da função afim.','EM13MAT302'],
  ['D24','Números, operações, álgebra e funções','Reconhecer a representação algébrica de uma função do 1º grau dado o seu gráfico.','Exige converter gráfico de reta em lei algébrica.','EM13MAT302'],
  ['D25','Números, operações, álgebra e funções','Resolver problemas que envolvam pontos de máximo ou mínimo no gráfico de função polinomial do 2º grau.','Avalia vértice e interpretação de função quadrática.','EM13MAT402'],
  ['D26','Números, operações, álgebra e funções','Relacionar as raízes de um polinômio com sua decomposição em fatores do 1º grau.','Trabalha zeros, fatores e fatoração polinomial.','EM13MAT302'],
  ['D27','Números, operações, álgebra e funções','Identificar a representação algébrica e/ou gráfica de uma função exponencial.','Avalia reconhecimento de crescimento/decrescimento exponencial.','EM13MAT403'],
  ['D28','Números, operações, álgebra e funções','Identificar a representação algébrica e/ou gráfica de uma função logarítmica, reconhecendo-a como inversa da exponencial.','Exige relação entre função exponencial e logarítmica.','EM13MAT403'],
  ['D29','Números, operações, álgebra e funções','Resolver problema que envolva função exponencial.','Avalia modelagem exponencial em situações reais.','EM13MAT403'],
  ['D30','Números, operações, álgebra e funções','Identificar gráficos de funções trigonométricas reconhecendo suas propriedades.','Trabalha periodicidade, amplitude e comportamento de seno, cosseno e tangente.','EM13MAT306'],
  ['D31','Números, operações, álgebra e funções','Determinar a solução de um sistema linear associando-o a uma matriz.','Integra sistemas lineares e representação matricial.','EM13MAT301'],
  ['D32','Números, operações, álgebra e funções','Resolver problema de contagem utilizando princípio multiplicativo, permutação, arranjo ou combinação simples.','Avalia estratégias de contagem e análise combinatória.','EM13MAT310'],
  ['D33','Números, operações, álgebra e funções','Calcular a probabilidade de um evento.','Trabalha razão entre casos favoráveis e possíveis.','EM13MAT311'],
  ['D34','Tratamento da informação','Resolver problema envolvendo informações apresentadas em tabelas e/ou gráficos.','Avalia leitura e interpretação de dados.','EM13MAT102'],
  ['D35','Tratamento da informação','Associar informações apresentadas em listas e/ou tabelas simples aos gráficos que as representam e vice-versa.','Exige converter dados tabulares em representações gráficas e interpretar equivalências.','EM13MAT102']
 ];
 function build(arr,disc){return arr.map(([codigo,topico,texto,explicacao,bncc])=>({codigo,disciplina:disc,topico,texto,explicacao,bncc,erros:comum.erros,estrategias:comum.estrategias,intervencao:comum.estrategias,fonte:'SAEB - Matriz de Referência da 3ª série do Ensino Médio'}));}
 const data={'Língua Portuguesa':build(lp,'Língua Portuguesa'),'Matemática':build(mat,'Matemática')};
 window.Descritores={
  list(disc){if(disc==='todos')return [...data['Língua Portuguesa'],...data['Matemática']];return data[disc]||data['Língua Portuguesa'];},
  get(disc,codigo){return (data[disc]||[]).find(d=>d.codigo===codigo);},
  validCodes(disc){return new Set((data[disc]||[]).map(d=>d.codigo));}
 };
})();
