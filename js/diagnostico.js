(function(){
 const A=()=>window.ETE;
 function levelBadge(level){
  if(level==='Elementar I')return 'bad level-e1';
  if(level==='Elementar II')return 'warn level-e2';
  if(level==='Básico')return 'warn level-basic';
  return 'ok level-des';
 }
 function compute(assessment){
  const q=assessment.questions||[], desc=assessment.descriptors||[], key=assessment.key||[], students=assessment.students||[];
  const itemCorrect=Array(q.length).fill(0), descMap={};
  const results=students.map((s,idx)=>{
    const answers=s.answers||[];
    const correct=answers.map((v,i)=>A().letter(v)&&A().letter(v)===A().letter(key[i])?1:0);
    const total=correct.reduce((a,b)=>a+b,0);
    const percent=A().pct(total,q.length);
    const levelObj=A().performanceLevel(percent,assessment.discipline);
    correct.forEach((c,i)=>{itemCorrect[i]+=c; const d=desc[i]||'Sem descritor'; (descMap[d]??={descritor:d,total:0,correct:0,students:[]}); descMap[d].total++; descMap[d].correct+=c; if(!c) descMap[d].students.push(s.name);});
    return {...s,index:idx,correct,total,percent,level:levelObj.label,levelClass:levelObj.cls,levelDescription:levelObj.description};
  });
  const items=q.map((name,i)=>({index:i,question:name||'Q'+(i+1),descriptor:desc[i]||'',key:key[i]||'',correct:itemCorrect[i],percent:A().pct(itemCorrect[i],students.length)}));
  const descriptorStats=Object.values(descMap).map(d=>({...d,percent:A().pct(d.correct,d.total),students:[...new Set(d.students)]})).sort((a,b)=>a.percent-b.percent);
  const counts={}; results.forEach(s=>counts[s.level]=(counts[s.level]||0)+1);
  return {students:results,items,descriptorStats,summary:{nStudents:students.length,nQuestions:q.length,avg:A().pct(results.reduce((a,s)=>a+s.total,0),students.length*q.length),priority:results.filter(s=>s.level==='Elementar I'||s.level==='Elementar II').length,levels:counts}};
 }
 function render(){renderSummary();renderClassReport();renderCharts();renderInsights();renderHeatmap();renderStudents();renderTomorrow();A().renderSelects();A().renderWizard?.();}
 function renderSummary(){const r=compute(A().state.assessment);const box=A().$('#summaryCards'); if(!box)return; box.innerHTML=`<div class="card"><span>Alunos</span><b>${r.summary.nStudents}</b></div><div class="card"><span>Questões</span><b>${r.summary.nQuestions}</b></div><div class="card"><span>Média</span><b>${r.summary.avg}%</b></div><div class="card"><span>Elementar I/II</span><b>${r.summary.priority}</b></div><div class="card"><span>Descritores críticos</span><b>${r.descriptorStats.filter(d=>d.percent<40).length}</b></div>`;}
 function renderClassReport(){
  const r=compute(A().state.assessment);const box=A().$('#classReport'); if(!box)return; const valid=A().isAssessmentValid?.();
  if(valid&&!valid.ok&&A().state.assessment.questions?.length){box.innerHTML='<div class="panel statusbox status-error"><b>Análise bloqueada pela validação.</b><p>Volte à Importação e corrija: '+A().safe(valid.issues.join(', '))+'.</p></div>';return;}
  if(!r.summary.nStudents){box.innerHTML='<div class="panel empty">Importe uma avaliação para gerar o diagnóstico.</div>';return;}
  const crit=r.descriptorStats.slice(0,5).map(d=>`<li><b>${d.descritor}</b> — ${d.percent}% de aproveitamento</li>`).join('');
  const levels=['Elementar I','Elementar II','Básico','Desejável'];
  const lvlCards=levels.map(l=>`<div class="card"><span>${l}</span><b>${r.summary.levels[l]||0}</b></div>`).join('');
  box.innerHTML=`<div class="statusbox status-work"><b>Escala pedagógica estimada:</b> a classificação usa o percentual de acertos da avaliação interna e adota a linguagem Elementar I, Elementar II, Básico e Desejável como referência pedagógica. Não substitui a escala oficial/TRI do SAEPE.</div><div class="cards"><div class="card"><span>Média geral</span><b>${r.summary.avg}%</b></div>${lvlCards}<div class="card"><span>Disciplina</span><b style="font-size:18px">${A().safe(A().state.assessment.discipline)}</b></div></div><div class="panel"><h3>Descritores mais críticos</h3><ol>${crit}</ol></div>`;
 }

 function barRows(data, opts={}){
  const max=Math.max(1,...data.map(x=>Number(x.value)||0));
  return `<div class="bar-chart ${opts.compact?'bar-compact':''}">`+data.map(x=>{
    const val=Number(x.value)||0;
    const w=Math.max(3,Math.round((val/max)*100));
    return `<div class="bar-row"><span class="bar-label">${A().safe(x.label)}</span><div class="bar-track"><div class="bar-fill" style="width:${w}%"></div></div><span class="bar-value">${A().safe(x.suffix?val+x.suffix:val)}</span></div>`;
  }).join('')+`</div>`;
 }
 function pieChart(levels){
  const labels=['Elementar I','Elementar II','Básico','Desejável'];
  const total=labels.reduce((a,l)=>a+(levels[l]||0),0);
  if(!total)return '<p class="hint">Sem dados para gráfico.</p>';
  const colors=['#e63242','#f4a62a','#ffd23f','#009b61'];
  let acc=0;
  const stops=labels.map((l,i)=>{
    const start=acc; acc+=((levels[l]||0)/total)*100;
    return `${colors[i]} ${start}% ${acc}%`;
  }).join(',');
  return `<div class="pie-wrap"><div class="pie" style="background:conic-gradient(${stops})"><span>${total}<small>alunos</small></span></div><div class="legend">${labels.map((l,i)=>`<span><i style="background:${colors[i]}"></i>${l}: <b>${levels[l]||0}</b></span>`).join('')}</div></div>`;
 }
 function renderCharts(){
  const box=A().$('#resultCharts'); if(!box)return; const r=compute(A().state.assessment);
  if(!r.summary.nStudents){box.innerHTML='';return;}
  const levelsPie=pieChart(r.summary.levels||{});
  const descBars=barRows(r.descriptorStats.slice(0,8).map(d=>({label:d.descritor,value:d.percent,suffix:'%'})),{compact:true});
  const itemBars=barRows([...r.items].sort((a,b)=>a.percent-b.percent).slice(0,8).map(it=>({label:`${it.question} • ${it.descriptor||'sem descritor'}`,value:it.percent,suffix:'%'})),{compact:true});
  const levelBars=barRows(['Elementar I','Elementar II','Básico','Desejável'].map(l=>({label:l,value:r.summary.levels?.[l]||0})),{compact:true});
  box.innerHTML=`<div class="chart-grid">
    <div class="panel chart-card"><h3>Distribuição por nível</h3><p class="hint">Classificação pedagógica estimada da turma.</p>${levelsPie}</div>
    <div class="panel chart-card"><h3>Níveis em barras</h3><p class="hint">Quantidade de alunos em cada faixa.</p>${levelBars}</div>
    <div class="panel chart-card"><h3>Descritores críticos</h3><p class="hint">Menores aproveitamentos por descritor.</p>${descBars}</div>
    <div class="panel chart-card"><h3>Questões críticas</h3><p class="hint">Itens com menor percentual de acerto.</p>${itemBars}</div>
  </div>`;
 }
 function renderInsights(){
  const box=A().$('#teacherInsights'); if(!box)return; const r=compute(A().state.assessment);
  if(!r.summary.nStudents){box.innerHTML='<p class="hint">Importe os dados para receber sugestões pedagógicas.</p>';return;}
  const low=r.descriptorStats.filter(d=>d.percent<40);
  const mid=r.descriptorStats.filter(d=>d.percent>=40&&d.percent<70);
  const high=r.descriptorStats.filter(d=>d.percent>=70);
  const topLow=low.slice(0,3);
  const itemLow=[...r.items].sort((a,b)=>a.percent-b.percent).slice(0,5);
  const elem=(r.summary.levels['Elementar I']||0)+(r.summary.levels['Elementar II']||0);
  const elemPct=A().pct(elem,r.summary.nStudents);
  const groups=topLow.map(d=>`<li><b>${A().safe(d.descritor)}</b>: ${d.percent}% de aproveitamento; ${d.students.length} aluno(s) com dificuldade. Trabalhar em grupo de recomposição com correção comentada e nova verificação curta.</li>`).join('');
  let focus;
  if(elemPct>=50) focus='A turma exige recomposição estruturada antes de avançar para novos conteúdos. Priorize retomada de habilidades básicas e exercícios guiados.';
  else if(r.summary.avg<60) focus='A turma está em zona intermediária. Combine revisão objetiva dos descritores críticos com prática semanal de itens semelhantes.';
  else focus='A turma apresenta bom desempenho geral. Use os descritores críticos para intervenção pontual e proponha desafios aos alunos em Básico/Desejável.';
  box.innerHTML=`<div class="insight-grid">
    <div class="insight"><b>Leitura geral</b><p>${A().safe(focus)}</p></div>
    <div class="insight"><b>Alunos em atenção</b><p>${elem} aluno(s) em Elementar I/II (${elemPct}%). Priorize acompanhamento individual e Mapa da Mina.</p></div>
    <div class="insight"><b>Pontos fortes</b><p>${high.length?high.slice(0,3).map(d=>`${d.descritor} (${d.percent}%)`).join(', '):'Ainda não há descritores com domínio consolidado acima de 70%.'}</p></div>
  </div>
  <h4>Plano de ação sugerido</h4>
  <ol class="action-list">
    ${groups||'<li>Não há descritores abaixo de 40%. Faça manutenção com questões de revisão e ampliação.</li>'}
    <li><b>Correção estratégica:</b> retome as ${itemLow.length} questões com menor acerto (${itemLow.map(it=>A().safe(it.question)).join(', ')}), pedindo que os alunos expliquem o raciocínio e não apenas marquem a alternativa.</li>
    <li><b>Reagrupamento:</b> forme grupos temporários por descritor crítico e aplique uma atividade curta ao final da semana para verificar avanço.</li>
    <li><b>Registro:</b> salve esta avaliação no histórico e compare com o próximo simulado para verificar evolução por descritor.</li>
  </ol>`;
 }

 function renderHeatmap(){const r=compute(A().state.assessment);const box=A().$('#heatmap'); if(!box)return; box.innerHTML=r.students.map(s=>`<div class="heatrow"><span class="heatname">${A().safe(s.name)}</span>${s.correct.map(c=>`<span class="cell c${c}"></span>`).join('')}</div>`).join('')||'<p class="hint">Sem dados.</p>';}
 function renderStudents(){const r=compute(A().state.assessment);const list=A().$('#studentList'); if(!list)return; const term=A().norm(A().$('#studentSearch')?.value).toLowerCase(); const rows=r.students.filter(s=>!term||s.name.toLowerCase().includes(term)); list.innerHTML=rows.map(s=>`<button data-student="${s.index}"><b>${A().safe(s.name)}</b><br><span class="badge ${levelBadge(s.level)}">${s.level}</span> ${s.total}/${r.summary.nQuestions} (${s.percent}%)</button>`).join('')||'<p class="hint">Nenhum aluno.</p>'; list.querySelectorAll('button').forEach(b=>b.onclick=()=>renderStudentDetail(Number(b.dataset.student)));}
 function renderStudentDetail(i){const r=compute(A().state.assessment);const s=r.students.find(x=>x.index===i);const box=A().$('#studentDetail'); if(!s||!box)return; const weak={}; s.correct.forEach((c,k)=>{if(!c){const d=A().state.assessment.descriptors[k]||'Sem descritor';weak[d]=(weak[d]||0)+1;}}); const weakList=Object.entries(weak).sort((a,b)=>b[1]-a[1]); box.innerHTML=`<h3>${A().safe(s.name)}</h3><p><span class="badge ${levelBadge(s.level)}">${s.level}</span></p><p><b>Acertos:</b> ${s.total}/${r.summary.nQuestions} (${s.percent}%)</p><p><b>Leitura pedagógica:</b> ${A().safe(s.levelDescription)}</p><h4>Descritores prioritários</h4><ul>${weakList.slice(0,5).map(([d,n])=>`<li>${A().safe(d)} — ${n} erro(s)</li>`).join('')||'<li>Nenhum descritor crítico.</li>'}</ul><div class="actions compact"><button onclick="ETE.showView('recuperacao');document.querySelector('#mapStudent').value='${i}';document.querySelector('#sheetStudent').value='${i}'">Gerar recuperação</button></div>`;}
 function renderTomorrow(){const r=compute(A().state.assessment);const box=A().$('#tomorrowPlan'); if(!box)return; const top=r.descriptorStats.slice(0,3); box.innerHTML=top.length?`<ol>${top.map((d,i)=>`<li><b>Prioridade ${i+1}: ${A().safe(d.descritor)}</b> — ${d.percent}% de aproveitamento. Retomar conceito, resolver itens guiados e aplicar atividade curta de verificação.</li>`).join('')}</ol>`:'<p class="hint">Importe dados para gerar prioridade.</p>';}
 window.Diagnostico={compute,render,renderStudents,renderStudentDetail,levelBadge};
})();
