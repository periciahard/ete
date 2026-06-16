(function(){
 const A=()=>window.ETE;
 const proofStoreKey='ete_proof_map_v47';
 function itemDiscrimination(results,itemIndex){
  if(results.students.length<4)return 0;
  const sorted=[...results.students].sort((a,b)=>b.total-a.total);
  const n=Math.max(1,Math.floor(sorted.length*.27));
  const top=sorted.slice(0,n),bot=sorted.slice(-n);
  const topPct=A().pct(top.reduce((s,x)=>s+(x.correct[itemIndex]||0),0),top.length);
  const botPct=A().pct(bot.reduce((s,x)=>s+(x.correct[itemIndex]||0),0),bot.length);
  return Math.round((topPct-botPct)*10)/10;
 }
 function difficultyLabel(percent){return percent>=70?'Fácil':percent>=40?'Média':'Difícil'}
 function discriminationLabel(value){return value<10?'Fraca':value<25?'Moderada':value<40?'Boa':'Excelente'}
 function discriminationInterpretation(value){
  if(value<10)return 'Pouco separa alunos de maior e menor desempenho. Investigar se o item ficou fácil/difícil demais ou se o enunciado ficou ambíguo.';
  if(value<25)return 'Separa parcialmente os grupos. Pode ser mantido, mas vale revisar clareza e aderência ao descritor.';
  if(value<40)return 'Boa capacidade de diferenciar domínio da habilidade. Item útil para diagnóstico.';
  return 'Excelente separação entre grupos. Item forte para identificar domínio da habilidade.';
 }
 function coherence(results,s){
  let easy=0,easyErr=0,hard=0,hardHit=0,mediumErr=0;
  results.items.forEach((it,i)=>{
   if(it.percent>=70){easy++; if(!s.correct[i])easyErr++;}
   else if(it.percent<=35){hard++; if(s.correct[i])hardHit++;}
   else if(!s.correct[i]) mediumErr++;
  });
  const totalSignals=easyErr+hardHit;
  const score=Math.max(0,Math.min(100,Math.round(100-(totalSignals*18)-(mediumErr*3))));
  let label='Alta'; if(score<55)label='Baixa'; else if(score<75)label='Moderada';
  const flag=easyErr>=2&&hardHit>=2;
  const text=flag?'Padrão incoerente: acertou itens difíceis e errou itens fáceis. Pode indicar chute, oscilação, leitura apressada ou lacuna específica.':'Padrão coerente ou sem forte indício de chute pela análise pedagógica.';
  return {easyErr,hardHit,mediumErr,score,label,flag,text};
 }
 function studentCoherenceSummary(results){return results.students.map(s=>({student:s,coh:coherence(results,s)})).sort((a,b)=>a.coh.score-b.coh.score);}
 function complexityLevel(text){
  const t=String(text||''); const len=t.length; const words=t.split(/\s+/).filter(Boolean).length;
  const nums=(t.match(/\d+[,.]?\d*/g)||[]).length;
  const math=(t.match(/funç|gr[aá]fico|tabela|porcent|probabil|equação|sistema|matriz|trigonom|logarit|exponencial|área|volume|proporcional/ig)||[]).length;
  const lang=(t.match(/infer|impl[ií]cit|tese|argument|coes|ironia|humor|efeito de sentido|g[eê]nero|finalidade|opini[aã]o/ig)||[]).length;
  const multi=(t.match(/analise|compare|relacione|determine|calcule|justifique|interprete|considere/ig)||[]).length;
  let score=0; if(words>90)score+=2; else if(words>45)score+=1; if(nums>=4)score+=2; else if(nums>=2)score+=1; if(math+lang>=3)score+=2; else if(math+lang>=1)score+=1; if(multi>=2)score+=2; else if(multi>=1)score+=1;
  const label=score>=5?'Difícil':score>=3?'Média':'Fácil';
  return {score,label,words,nums,signals:math+lang+multi};
 }
 function splitQuestions(text){
  const clean=String(text||'').replace(/\r/g,' ').replace(/[ \t]+/g,' ').replace(/\n{2,}/g,'\n').trim();
  if(!clean)return [];
  const regex=/(?:^|\n|\s)(?:quest[aã]o\s*)?(\d{1,2})[\).\-:]\s+/ig;
  const marks=[]; let m;
  while((m=regex.exec(clean))){const n=Number(m[1]); if(n>=1&&n<=99)marks.push({n,index:m.index,label:m[0]});}
  if(marks.length>=3){
   return marks.map((mk,i)=>{const start=mk.index+mk.label.length; const end=marks[i+1]?.index??clean.length; return {number:mk.n,text:clean.slice(start,end).trim()};}).filter(q=>q.text.length>10).slice(0,80);
  }
  return clean.split(/\n+/).map((x,i)=>({number:i+1,text:x.trim()})).filter(q=>q.text.length>20).slice(0,80);
 }
 async function readPdf(file){
  if(!window.pdfjsLib)throw new Error('Biblioteca PDF não carregada.');
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const ab=await file.arrayBuffer(); const pdf=await pdfjsLib.getDocument({data:ab}).promise; let text='';
  for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p);const tc=await page.getTextContent(); text+=tc.items.map(i=>i.str).join(' ')+'\n';}
  return text;
 }
 async function readProofFile(){
  try{
   const input=A().$('#proofFileInput'); const f=input?.files?.[0]; if(!f)throw new Error('Selecione um PDF ou TXT da prova.');
   A().status('#proofMapStatus','Lendo prova e separando questões...','work');
   let text=''; if(/pdf/i.test(f.type)||/\.pdf$/i.test(f.name)) text=await readPdf(f); else text=await f.text();
   const qs=splitQuestions(text);
   if(!qs.length)throw new Error('Não foi possível separar as questões. Tente enviar PDF com texto pesquisável ou arquivo TXT.');
   const mapped=qs.map((q,i)=>{const comp=complexityLevel(q.text);const desc=A().state.assessment.descriptors[i]||'';const importedQuestion=A().state.assessment.questions[i]||('Q'+(i+1));return {number:q.number||i+1,question:importedQuestion,descriptor:desc,text:q.text,initialLevel:comp.label,complexity:comp};});
   A().state.proofMap={source:f.name,date:new Date().toLocaleString('pt-BR'),items:mapped}; A().save();
   A().status('#proofMapStatus',`Prova lida: ${mapped.length} questão(ões) encontradas. Confira o mapeamento abaixo.`,'ok');
   renderProofMap(); render();
  }catch(e){A().status('#proofMapStatus','Falha ao ler prova: '+A().safe(e.message),'error');}
 }
 function clearProofMap(){A().state.proofMap=null;A().save();A().status('#proofMapStatus','Mapeamento da prova removido.','work');renderProofMap();render();}
 function finalLevelForItem(results,i,initial){const it=results.items[i]; if(!it)return initial||'Não calibrado'; return difficultyLabel(it.percent);}
 function renderProofMap(){
  const box=A().$('#proofMapOutput'); if(!box)return; const map=A().state.proofMap;
  if(!map||!map.items?.length){box.innerHTML='<p class="hint">Nenhuma prova mapeada ainda. O mapeamento é opcional e ajuda a confrontar a complexidade textual com o resultado real da turma.</p>';return;}
  const r=A().getResults();
  box.innerHTML=`<div class="statusbox status-ok"><b>Arquivo:</b> ${A().safe(map.source)} • <b>Leitura:</b> ${A().safe(map.date)}<br>O nível inicial é estimado pela complexidade do enunciado; o nível final usa a taxa de acertos da turma quando houver resultado importado.</div><div class="preview-table proof-table"><div class="preview-row"><span>Questão</span><span>Descritor</span><span>Nível inicial</span><span>Acerto</span><span>Nível final</span><span>Sinais de complexidade</span></div>${map.items.map((it,i)=>{const ri=r.items[i];return `<div class="preview-row"><span><b>${A().safe(it.question||('Q'+(i+1)))}</b></span><span>${A().safe(it.descriptor||'-')}</span><span>${A().safe(it.initialLevel)}</span><span>${ri?ri.percent+'%':'-'}</span><span>${A().safe(finalLevelForItem(r,i,it.initialLevel))}</span><span>${it.complexity.words} palavras • ${it.complexity.nums} números • índice ${it.complexity.score}</span></div>`}).join('')}</div>`;
 }
 function render(){
  const box=A().$('#triOutput');if(!box)return;const r=A().getResults(); renderProofMap();
  if(!r.summary.nStudents){box.innerHTML='Importe os dados para gerar a análise.';return;}
  const rows=r.items.map((it,i)=>{const d=itemDiscrimination(r,i);return `<div>${A().safe(it.question)}</div><div>${A().safe(it.descriptor)}</div><div>${it.percent}%</div><div>${difficultyLabel(it.percent)}</div><div>${d} p.p.</div><div><b>${discriminationLabel(d)}</b><br><small>${A().safe(discriminationInterpretation(d))}</small></div>`}).join('');
  const coer=studentCoherenceSummary(r).slice(0,10);
  const weakItems=[...r.items].map((it,i)=>({...it,disc:itemDiscrimination(r,i)})).sort((a,b)=>a.percent-b.percent).slice(0,5);
  box.innerHTML=`<h3>TRI pedagógica da prova</h3><p class="hint">Esta análise não é a TRI oficial do ENEM/SAEPE. Ela estima dificuldade, discriminação e coerência do padrão de respostas para apoiar a leitura pedagógica da prova e identificar possíveis padrões de chute/oscilação.</p><div class="grid2"><div class="panel mini-panel"><h4>Questões mais difíceis</h4><ol>${weakItems.map(x=>`<li><b>${A().safe(x.question)}</b> (${A().safe(x.descriptor)}) — ${x.percent}% de acerto</li>`).join('')}</ol></div><div class="panel mini-panel"><h4>Como agir pedagogicamente</h4><ol><li>Revisar itens com baixa discriminação e baixo acerto: podem indicar enunciado confuso ou habilidade não consolidada.</li><li>Usar questões com boa discriminação para identificar alunos que realmente dominam o descritor.</li><li>Conferir alunos com coerência baixa antes de concluir que houve chute.</li></ol></div></div><div class="tri-table"><div>Questão</div><div>Descritor</div><div>Acerto</div><div>Dificuldade</div><div>Discriminação</div><div>Leitura</div>${rows}</div><h4>Índice de coerência por aluno</h4><div class="preview-table">${coer.map(x=>`<div class="preview-row"><span><b>${A().safe(x.student.name)}</b></span><span>${x.coh.score}/100</span><span>${A().safe(x.coh.label)}</span><span>Erros fáceis: ${x.coh.easyErr}</span><span>Acertos difíceis: ${x.coh.hardHit}</span><span>${A().safe(x.coh.flag?'Investigar':'Ok')}</span></div>`).join('')}</div><p class="hint">Leitura: quanto menor o índice, maior a chance de padrão inconsistente. Isso não prova chute; apenas indica necessidade de olhar qualitativo.</p>`;
 }
 function bind(){
  const read=A().$('#readProofFile'); if(read)read.onclick=readProofFile;
  const clear=A().$('#clearProofMap'); if(clear)clear.onclick=clearProofMap;
 }
 window.TRI={render,coherence,itemDiscrimination,difficultyLabel,discriminationLabel,discriminationInterpretation,studentCoherenceSummary,readProofFile,renderProofMap,complexityLevel};
 document.addEventListener('DOMContentLoaded',bind);
})();
