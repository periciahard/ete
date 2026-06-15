(function(){
 const A=()=>window.ETE;
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
 function discriminationLabel(value){return value<10?'Baixa discriminação':value<25?'Discriminação moderada':'Boa discriminação'}
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
 function studentCoherenceSummary(results){
  return results.students.map(s=>({student:s,coh:coherence(results,s)})).sort((a,b)=>a.coh.score-b.coh.score);
 }
 function render(){
  const box=A().$('#triOutput');if(!box)return;const r=A().getResults();
  if(!r.summary.nStudents){box.innerHTML='Importe os dados para gerar a análise.';return;}
  const rows=r.items.map((it,i)=>{const d=itemDiscrimination(r,i);return `<div>${A().safe(it.question)}</div><div>${A().safe(it.descriptor)}</div><div>${it.percent}%</div><div>${difficultyLabel(it.percent)}</div><div>${d}</div><div>${discriminationLabel(d)}</div>`}).join('');
  const coer=studentCoherenceSummary(r).slice(0,8);
  box.innerHTML=`<h3>TRI pedagógica da prova</h3><p class="hint">Esta análise não é a TRI oficial do ENEM. Ela estima dificuldade, discriminação e coerência do padrão de respostas para apoiar a leitura pedagógica da prova e identificar possíveis padrões de chute/oscilação.</p><div class="tri-table"><div>Questão</div><div>Descritor</div><div>Acerto</div><div>Dificuldade</div><div>Discriminação</div><div>Leitura</div>${rows}</div><h4>Índice de coerência por aluno</h4><div class="preview-table">${coer.map(x=>`<div class="preview-row"><span><b>${A().safe(x.student.name)}</b></span><span>${x.coh.score}/100</span><span>${A().safe(x.coh.label)}</span><span>Erros fáceis: ${x.coh.easyErr}</span><span>Acertos difíceis: ${x.coh.hardHit}</span><span>${A().safe(x.coh.flag?'Investigar':'Ok')}</span></div>`).join('')}</div><p class="hint">Leitura: quanto menor o índice, maior a chance de padrão inconsistente. Isso não prova chute; apenas indica necessidade de olhar qualitativo.</p>`;
 }
 window.TRI={render,coherence,itemDiscrimination,difficultyLabel,discriminationLabel,studentCoherenceSummary};
})();
