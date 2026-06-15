(function(){
 const A=()=>window.ETE;
 const letras=['A','B','C','D','E'];
 const exemplos={
  'Língua Portuguesa':{
   contexto:'Leia o texto-base apresentado pelo professor e responda à questão.',
   temas:['notícia escolar','crônica curta','charge','artigo de opinião','infográfico','campanha educativa']
  },
  'Matemática':{
   contexto:'Resolva a situação-problema usando as informações fornecidas.',
   temas:['porcentagem em compras','gráfico de desempenho','medidas de uma quadra','função em aplicativo','probabilidade em sorteio','volume de recipiente']
  }
 };
 function builtIn(){
  const out=[];
  const modelos={
   'Língua Portuguesa':[
    {tipo:'localizar informação explícita',cmd:'localize no texto a informação solicitada'},
    {tipo:'inferir sentido',cmd:'infira uma informação implícita a partir das pistas do texto'},
    {tipo:'reconhecer finalidade',cmd:'identifique a finalidade comunicativa do gênero textual'},
    {tipo:'relação texto e imagem',cmd:'relacione elementos verbais e não verbais'},
    {tipo:'opinião e fato',cmd:'diferencie fato, opinião e argumento'}
   ],
   'Matemática':[
    {tipo:'porcentagem e proporção',cmd:'calcule e interprete percentuais em situação cotidiana'},
    {tipo:'gráficos e tabelas',cmd:'extraia e compare informações de representações gráficas'},
    {tipo:'geometria e medidas',cmd:'resolva uma situação com medidas, área, volume ou escala'},
    {tipo:'álgebra e funções',cmd:'modele a relação entre grandezas e encontre o valor pedido'},
    {tipo:'probabilidade e estatística',cmd:'interprete chances, médias ou distribuição de dados'}
   ]
  };
  const maxDesc={'Língua Portuguesa':30,'Matemática':35};
  Object.keys(modelos).forEach(disc=>{
   for(let n=1;n<=maxDesc[disc];n++){
    modelos[disc].forEach((m,j)=>{
     const dif=j<2?'Fácil':j<4?'Média':'Difícil';
     const key=letras[(n+j)%5];
     const desc='D'+n;
     const contexto=disc==='Língua Portuguesa'
      ? `Texto-base: em uma situação escolar envolvendo ${exemplos[disc].temas[(n+j)%exemplos[disc].temas.length]}, o estudante precisa ${m.cmd}.`
      : `Situação-problema: em um contexto de ${exemplos[disc].temas[(n+j)%exemplos[disc].temas.length]}, o estudante precisa ${m.cmd}.`;
     out.push({id:`base-${disc.startsWith('Língua')?'LP':'MAT'}-${desc}-${j}`,builtin:true,discipline:disc,descriptor:desc,difficulty:dif,key,enunciado:`${contexto} Questão vinculada ao ${desc}: assinale a alternativa mais adequada.`,alts:letras.map((l,k)=>`${l}) ${k===letras.indexOf(key)?'Resposta correta construída para o descritor.':'Distrator plausível associado a erro comum do descritor.'}`)});
    });
   }
  });
  return out;
 }
 function allBank(){return [...builtIn(),...(A().state.bank||[])];}
 function priorityDescriptors(studentIndex){const r=A().getResults();const s=r.students[studentIndex];if(!s)return[];const map={};s.correct.forEach((c,i)=>{if(!c){const d=A().state.assessment.descriptors[i]||'Sem descritor';map[d]=(map[d]||0)+1;}});return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([d,n])=>({descriptor:d,errors:n})).slice(0,5);}
 function selectQuestions(priorities,disc,total=10){
  const selected=[]; const pool=allBank().filter(q=>q.discipline===disc);
  const descs=priorities.length?priorities:[{descriptor:'D1',errors:1},{descriptor:'D2',errors:1},{descriptor:'D3',errors:1}];
  const weightSum=descs.reduce((s,x)=>s+x.errors,0)||descs.length;
  descs.forEach((p,idx)=>{
   const quota=idx===descs.length-1?total-selected.length:Math.max(1,Math.round(total*(p.errors/weightSum)));
   const byDesc=pool.filter(q=>q.descriptor===p.descriptor);
   for(let i=0;i<quota && selected.length<total;i++) selected.push(byDesc[i%Math.max(1,byDesc.length)]||localQuestion(p.descriptor,selected.length,disc));
  });
  while(selected.length<total){const p=descs[selected.length%descs.length];selected.push(pool.find(q=>q.descriptor===p.descriptor)||localQuestion(p.descriptor,selected.length,disc));}
  return selected.slice(0,total);
 }
 function localQuestion(desc,i,disc){return {enunciado:`(${disc}) Questão ${i+1}. Resolva uma situação-problema relacionada ao descritor ${desc}, justificando a alternativa escolhida.`,alts:['A) Alternativa conceitualmente incorreta.','B) Alternativa parcialmente correta.','C) Alternativa correta.','D) Alternativa com erro comum.','E) Alternativa incompatível com o enunciado.'],key:'C',descriptor:desc,difficulty:'Média'};}
 function generateSheet(){const idx=Number(A().$('#sheetStudent')?.value);const r=A().getResults();const s=r.students[idx];if(!s){A().$('#sheetOutput').value='Selecione um aluno.';return;}const pr=priorityDescriptors(idx);const disc=A().state.assessment.discipline;const questions=selectQuestions(pr,disc,10);const txt=`FICHA DE EXERCÍCIOS INDIVIDUALIZADA\nAluno: ${s.name}\nDisciplina: ${disc}\nDescritores prioritários: ${pr.map(p=>p.descriptor+' ('+p.errors+' erro(s))').join(', ')||'sem prioridade'}\n\n`+questions.map((q,i)=>`${i+1}. [${q.descriptor} • ${q.difficulty}] ${q.enunciado}\n${(q.alts||[]).join('\n')}`).join('\n\n')+`\n\nGABARITO\n`+questions.map((q,i)=>`${i+1}) ${q.key||'C'}`).join('\n');A().$('#sheetOutput').value=txt;}
 function generateMap(){const idx=Number(A().$('#mapStudent')?.value);const r=A().getResults();const s=r.students[idx];const box=A().$('#mapaOutput');if(!s||!box){return}const pr=priorityDescriptors(idx);const total=pr.reduce((a,b)=>a+b.errors,0)||1;const weeks=[0,1,2,3].map(i=>pr[i%Math.max(1,pr.length)]||{descriptor:'descritor prioritário',errors:1});box.innerHTML=`<h3>Mapa da Mina — ${A().safe(s.name)}</h3><div class="map-summary"><div><b>${s.percent}%</b><br>desempenho</div><div><b>${A().safe(s.level)}</b><br>status</div><div><b>${pr.length}</b><br>descritores</div></div><p><b>Distribuição:</b> as 4 semanas priorizam os descritores em que o aluno mais errou.</p>`+weeks.map((p,w)=>`<div class="question-card"><b>Semana ${w+1} — foco em ${A().safe(p.descriptor)}</b><p><b>1h de estudo:</b> revisar o descritor ${A().safe(p.descriptor)} com exemplos resolvidos, leitura do comando e retomada dos erros mais prováveis.</p><p><b>1h de exercícios:</b> resolver ${Math.max(2,Math.round((p.errors/total)*10))} itens graduados desse descritor e corrigir o raciocínio usado.</p></div>`).join('');}
 function render(){const list=A().$('#bankList');if(list){const userBank=A().state.bank||[];const base=builtIn();const all=[...base,...userBank];const disc=A().state.assessment.discipline||A().state.settings.discipline;const byDesc={};all.filter(q=>q.discipline===disc).forEach(q=>{byDesc[q.descriptor]=(byDesc[q.descriptor]||0)+1;});const coverage=Object.entries(byDesc).sort((a,b)=>Number(a[0].slice(1))-Number(b[0].slice(1))).map(([d,n])=>`<span class="badge ok">${A().safe(d)}: ${n}</span>`).join(' ');list.innerHTML=`<div class="statusbox status-ok"><b>Banco local ativo:</b> ${base.length} questões-modelo internas + ${userBank.length} questão(ões) cadastrada(s) pela escola. Ele alimenta fichas individualizadas, recuperação, simulados e Mapa da Mina sem IA. O ideal é a escola ampliar o banco com itens próprios e validados por professor.</div><div class="panel mini-panel"><h4>Cobertura da disciplina atual: ${A().safe(disc)}</h4><p>${coverage||'Nenhuma questão vinculada à disciplina atual.'}</p></div>`+(userBank.length?userBank.map((q,i)=>`<div class="question-card"><b>${A().safe(q.discipline)} • ${A().safe(q.descriptor)} • ${A().safe(q.difficulty)}</b><button class="smallBtn secondary" data-delbank="${i}">remover</button><pre>${A().safe(q.enunciado)}</pre></div>`).join(''):'<p class="hint">Nenhuma questão própria cadastrada. As questões-modelo internas já estão disponíveis, mas o ideal é a escola criar seu próprio banco por descritor.</p>');list.querySelectorAll('[data-delbank]').forEach(btn=>btn.onclick=()=>{A().state.bank.splice(Number(btn.dataset.delbank),1);A().save();render();});}}
 function bind(){A().$('#generateSheet')&&(A().$('#generateSheet').onclick=generateSheet);A().$('#copySheet')&&(A().$('#copySheet').onclick=()=>navigator.clipboard?.writeText(A().$('#sheetOutput').value||''));A().$('#downloadSheet')&&(A().$('#downloadSheet').onclick=()=>A().download('ficha-individual.txt',A().$('#sheetOutput').value||''));A().$('#printSheet')&&(A().$('#printSheet').onclick=()=>window.Exportacao?.printReport(A().$('#sheetOutput').value||'','Ficha individualizada'));A().$('#generateMap')&&(A().$('#generateMap').onclick=generateMap);A().$('#copyMap')&&(A().$('#copyMap').onclick=()=>navigator.clipboard?.writeText(A().$('#mapaOutput').innerText||''));A().$('#downloadMap')&&(A().$('#downloadMap').onclick=()=>A().download('mapa-da-mina.txt',A().$('#mapaOutput').innerText||''));A().$('#printMap')&&(A().$('#printMap').onclick=()=>window.Exportacao?.printReport(A().$('#mapaOutput').innerText||'','Mapa da Mina'));A().$('#addBankQuestion')&&(A().$('#addBankQuestion').onclick=()=>{const q={id:A().uid(),discipline:A().$('#bankDisc').value,descriptor:A().desc(A().$('#bankDesc').value)||A().norm(A().$('#bankDesc').value),difficulty:A().$('#bankDiff').value,key:A().$('#bankKey').value,enunciado:A().norm(A().$('#bankText').value),alts:A().$('#bankAlts').value.split(/\n+/).filter(Boolean)};if(!q.descriptor||!q.enunciado)return alert('Informe descritor e enunciado.');A().state.bank.push(q);A().save();render();});A().$('#exportBank')&&(A().$('#exportBank').onclick=()=>A().download('banco-questoes.json',JSON.stringify(A().state.bank,null,2),'application/json'));A().$('#importBank')&&(A().$('#importBank').onchange=async e=>{const f=e.target.files[0];if(!f)return;const data=JSON.parse(await f.text());A().state.bank=Array.isArray(data)?data:(data.questoes||[]);A().save();render();});}
 window.BancoQuestoes={render,generateSheet,generateMap,priorityDescriptors,allBank,builtIn,selectQuestions};document.addEventListener('DOMContentLoaded',bind);
})();
