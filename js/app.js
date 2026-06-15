(function(){
  'use strict';
  const VERSION='45.0';
  const STORE='ete_diagnostico_atual';
  const DEFAULT_STATE={
    version:VERSION,
    settings:{discipline:'Língua Portuguesa', supabaseUrl:'', supabaseAnonKey:''},
    assessment:{discipline:'Língua Portuguesa', turma:'', tipo:'diagnostica', date:'', questions:[], descriptors:[], key:[], students:[], title:'Avaliação atual'},
    bank:[], snapshots:[], selectedStudent:null, currentReport:''
  };
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const safe=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const norm=v=>String(v??'').trim();
  const letter=v=>{const m=norm(v).toUpperCase().match(/[A-E]/); return m?m[0]:''};
  const desc=v=>{const m=norm(v).toUpperCase().match(/D\s*0*([0-9]{1,2})/); return m?'D'+parseInt(m[1],10):''};
  const pct=(a,b)=>b?Math.round((a/b)*1000)/10:0;
  const performanceLevel=(percent, discipline='')=>{
    const p=Number(percent)||0;
    let label, cls, description;
    if(p<25){label='Elementar I'; cls='level-e1'; description='Grave defasagem. O estudante ainda não domina competências fundamentais da avaliação e precisa de recomposição imediata.';}
    else if(p<50){label='Elementar II'; cls='level-e2'; description='Desempenho insuficiente. O estudante reconhece estruturas simples, mas apresenta lacunas relevantes nas habilidades avaliadas.';}
    else if(p<75){label='Básico'; cls='level-basic'; description='O mínimo esperado. O estudante demonstra domínio essencial, mas ainda precisa consolidar descritores específicos.';}
    else {label='Desejável'; cls='level-des'; description='Nível de excelência. O estudante demonstra domínio avançado e maior autonomia nas habilidades avaliadas.';}
    return {label, cls, description, percent:p};
  };
  const status=(el,msg,type='work')=>{const node=typeof el==='string'?$(el):el;if(node){node.className='statusbox '+(type==='ok'?'status-ok':type==='error'?'status-error':'status-work');node.innerHTML=msg;}};
  const download=(filename,content,type='text/plain;charset=utf-8')=>{const blob=new Blob([content],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
  const toTSV=(rows)=>rows.map(r=>r.map(v=>String(v??'').replace(/\t/g,' ').replace(/\n/g,' ')).join('\t')).join('\n');
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  function load(){try{return {...structuredClone(DEFAULT_STATE),...(JSON.parse(localStorage.getItem(STORE)||'{}'))};}catch{return structuredClone(DEFAULT_STATE)}}
  const App={VERSION, STORE, state:load(), $, $$, safe, norm, letter, desc, pct, status, download, toTSV, uid,
    save(){this.state.version=VERSION;localStorage.setItem(STORE,JSON.stringify(this.state));this.setSaveStatus();},
    setSaveStatus(){const dt=new Date().toLocaleString('pt-BR'); $('#lastSave')&&( $('#lastSave').textContent='Último salvamento: '+dt); $('#saveStatus')&&($('#saveStatus').textContent='Salvamento automático ativo • V'+VERSION);},
    setAssessment(a){this.state.assessment={...this.state.assessment,...a}; this.state.assessment.discipline=$('#assessmentDiscipline')?.value||this.state.assessment.discipline||this.state.settings.discipline; this.save(); this.renderAll();},
    getResults(){return window.Diagnostico?.compute(this.state.assessment)||{students:[],items:[],descriptorStats:[],summary:{nStudents:0,nQuestions:0,avg:0}}},
    renderAll(){window.Diagnostico?.render(); window.TRI?.render(); window.Relatorios?.renderCoord(); window.BancoQuestoes?.render(); this.renderSelects(); this.renderDescriptors(); this.renderQuestionMap(); this.renderChangelog(); this.renderWizard();},
    renderSelects(){const students=this.state.assessment.students||[]; ['#mapStudent','#sheetStudent','#reportStudent'].forEach(sel=>{const e=$(sel); if(!e)return; const cur=e.value; e.innerHTML='<option value="">Selecione</option>'+students.map((s,i)=>`<option value="${i}">${safe(s.name)}</option>`).join(''); e.value=cur;});},
    renderQuestionMap(){const box=$('#questionMap'); if(!box)return; const a=this.state.assessment; if(!a.questions.length){box.innerHTML='<p class="hint">Nenhuma avaliação carregada.</p>';return;} box.innerHTML=a.questions.map((q,i)=>`<div class="question-card"><b>${safe(q||'Q'+(i+1))}</b><p>Descritor: <strong>${safe(a.descriptors[i]||'-')}</strong></p><p>Gabarito: <strong>${safe(a.key[i]||'-')}</strong></p></div>`).join('');},
    renderDescriptors(){const box=$('#descriptorList'); if(!box)return; const disc=$('#descriptorDiscipline')?.value||this.state.settings.discipline; const term=norm($('#descriptorSearch')?.value).toLowerCase(); const list=window.Descritores?.list(disc)||[]; const res=this.getResults(); const assoc={}; (this.state.assessment.descriptors||[]).forEach((d,i)=>{if(!d)return;(assoc[d]??=[]).push('Q'+(i+1));}); box.innerHTML=list.filter(d=>!term||JSON.stringify(d).toLowerCase().includes(term)).map(d=>`<details class="desc"><summary>${safe(d.codigo)} — ${safe(d.texto)}</summary><p><b>BNCC:</b> ${safe(d.bncc||'Não informada')}</p><p><b>Erros comuns:</b> ${safe(d.erros||'Leitura superficial, confusão conceitual ou estratégia inadequada.')}</p><p><b>Estratégias:</b> ${safe(d.estrategias||'Retomada guiada, modelagem de resolução e prática orientada.')}</p><p><b>Questões associadas nesta avaliação:</b> ${safe((assoc[d.codigo]||[]).join(', ')||'Nenhuma')}</p></details>`).join('')||'<p class="hint">Nenhum descritor encontrado.</p>';},
    renderChangelog(){const box=$('#changelogBox'); if(box) box.innerHTML='<h3>Novidades da V45</h3><ul><li>Classificação dos alunos pelos níveis pedagógicos: Elementar I, Elementar II, Básico e Desejável.</li><li>Relatórios e painéis agora mostram a distribuição da turma por esses níveis.</li><li>Botões e abas foram condensados para reduzir redundância e facilitar o fluxo principal.</li><li>Mapa da Mina permanece individualizado por aluno e por descritores efetivamente errados.</li><li>Fluxo recomendado: importar, validar, confirmar, diagnosticar, intervir e salvar.</li></ul>';},
    isAssessmentValid(){const a=this.state.assessment||{};const issues=[];if(!(a.questions||[]).length)issues.push('nenhuma questão');if((a.descriptors||[]).length!==(a.questions||[]).length||((a.descriptors||[]).some(x=>!x)))issues.push('descritores ausentes');if((a.key||[]).length!==(a.questions||[]).length||((a.key||[]).some(x=>!x)))issues.push('gabarito incompleto');if(!(a.students||[]).length)issues.push('nenhum aluno');if((a.students||[]).some(s=>!s.name))issues.push('aluno sem nome');if((a.students||[]).some(s=>(s.answers||[]).length<(a.questions||[]).length))issues.push('respostas incompletas');const validCodes=window.Descritores?.validCodes?.(a.discipline||this.state.settings.discipline);if(validCodes){const invalid=[...new Set((a.descriptors||[]).filter(d=>d&&!validCodes.has(d)))];if(invalid.length)issues.push('descritores fora da matriz: '+invalid.join(', '));}return {ok:!issues.length,issues};},
    renderWizard(){const box=$('#wizardStatus');if(!box)return;const a=this.state.assessment;const valid=this.isAssessmentValid();const r=this.getResults();const steps=[['Importação',(a.questions||[]).length?'ok':'wait',`${(a.questions||[]).length||0} questões`],['Descritores',valid.issues.includes('descritores ausentes')?'bad':'ok',`${(a.descriptors||[]).filter(Boolean).length}/${(a.questions||[]).length||0}`],['Gabarito',valid.issues.includes('gabarito incompleto')?'bad':'ok',`${(a.key||[]).filter(Boolean).length}/${(a.questions||[]).length||0}`],['Alunos',(a.students||[]).length?'ok':'wait',`${(a.students||[]).length||0} alunos`],['Diagnóstico',r.summary.nStudents?'ok':'wait',r.summary.nStudents?`${r.summary.avg}% média`:'pendente'],['Relatórios',r.summary.nStudents?'ok':'wait',r.summary.nStudents?'prontos':'pendentes']];box.innerHTML=steps.map(([t,st,txt])=>`<div class="wizard-card ${st}"><b>${safe(t)}</b><span>${safe(txt)}</span></div>`).join('');const next=$('#wizardNext');if(next){if(!a.questions?.length)status(next,'Próxima ação: importe uma planilha Excel ou digite os dados manualmente.','work');else if(!valid.ok)status(next,'Ajuste a estrutura antes de analisar: '+valid.issues.join(', ')+'.','error');else if(!r.summary.nStudents)status(next,'Estrutura válida. Clique em Diagnóstico para analisar.','ok');else status(next,'Diagnóstico pronto. Gere relatórios, Mapa da Mina ou salve na nuvem.','ok');}},
    syncMetaFromInputs(){const a=this.state.assessment; const ids={title:'#assessmentTitle',turma:'#assessmentClass',tipo:'#assessmentType',date:'#assessmentDate'}; if($(ids.title)) a.title=norm($(ids.title).value)||a.title; if($(ids.turma)) a.turma=norm($(ids.turma).value); if($(ids.tipo)) a.tipo=$(ids.tipo).value||a.tipo; if($(ids.date)) a.date=$(ids.date).value||a.date;},
    fillMetaInputs(){const a=this.state.assessment; $('#assessmentTitle')&&($('#assessmentTitle').value=a.title||''); $('#assessmentClass')&&($('#assessmentClass').value=a.turma||''); $('#assessmentType')&&($('#assessmentType').value=a.tipo||'diagnostica'); $('#assessmentDate')&&($('#assessmentDate').value=a.date||''); $('#supabaseUrl')&&($('#supabaseUrl').value=this.state.settings.supabaseUrl||localStorage.getItem('ete_supabase_url')||''); $('#supabaseAnonKey')&&($('#supabaseAnonKey').value=this.state.settings.supabaseAnonKey||localStorage.getItem('ete_supabase_anon')||'');},
    bindBase(){
      $$('.nav').forEach(btn=>btn.onclick=()=>this.showView(btn.dataset.view)); $$('[data-go]').forEach(btn=>btn.onclick=()=>this.showView(btn.dataset.go));
      $('#openMenu')&&( $('#openMenu').onclick=()=>$('#sidebar')?.classList.add('open')); $('#closeMenu')&&( $('#closeMenu').onclick=()=>$('#sidebar')?.classList.remove('open'));
      $$('.tabBtn').forEach(btn=>btn.onclick=()=>{ $$('.tabBtn').forEach(b=>b.classList.remove('active')); $$('.tabPane').forEach(p=>p.classList.remove('active')); btn.classList.add('active'); $('#'+btn.dataset.tab)?.classList.add('active'); });
      $('#assessmentDiscipline')&&( $('#assessmentDiscipline').onchange=e=>{this.state.assessment.discipline=e.target.value;this.state.settings.discipline=e.target.value;$('#configDiscipline')&&($('#configDiscipline').value=e.target.value);this.save();this.renderAll();});
      $('#configDiscipline')&&( $('#configDiscipline').onchange=e=>{this.state.settings.discipline=e.target.value;$('#assessmentDiscipline')&&($('#assessmentDiscipline').value=e.target.value);this.save();});
      ['assessmentTitle','assessmentClass','assessmentType','assessmentDate'].forEach(id=>{const el=$('#'+id); if(el) el.onchange=el.oninput=()=>{this.syncMetaFromInputs(); this.save();};});
      $('#descriptorDiscipline')&&( $('#descriptorDiscipline').onchange=()=>this.renderDescriptors()); $('#descriptorSearch')&&( $('#descriptorSearch').oninput=()=>this.renderDescriptors());
      $('#wizardValidate')&&( $('#wizardValidate').onclick=()=>{this.showView('importar'); $('#validateData')?.click();}); $('#wizardAnalyze')&&( $('#wizardAnalyze').onclick=()=>{const v=this.isAssessmentValid(); if(!v.ok){alert('A estrutura ainda não está válida: '+v.issues.join(', ')); this.showView('importar');} else this.showView('diagnostico');});
      $('#studentSearch')&&( $('#studentSearch').oninput=()=>window.Diagnostico?.renderStudents());
      $('#clearAll')&&( $('#clearAll').onclick=()=>{if(confirm('Apagar todos os dados salvos neste navegador?')){localStorage.removeItem(STORE);location.reload();}});
    },
    showView(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===id));$('#sidebar')?.classList.remove('open'); setTimeout(()=>scrollTo({top:0,behavior:'smooth'}),20);},
    init(){this.bindBase(); $('#assessmentDiscipline')&&($('#assessmentDiscipline').value=this.state.assessment.discipline||this.state.settings.discipline); $('#configDiscipline')&&($('#configDiscipline').value=this.state.settings.discipline); this.fillMetaInputs(); this.setSaveStatus(); this.renderAll();}
  };
  App.performanceLevel=performanceLevel;
  window.ETE=App; document.addEventListener('DOMContentLoaded',()=>App.init());
})();
