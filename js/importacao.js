(function(){
 const A=()=>window.ETE;
 function rowsToAssessment(rows){
  rows=(rows||[]).filter(r=>r&&r.some(c=>A().norm(c))); if(rows.length<3) throw new Error('A planilha precisa ter pelo menos 3 linhas: questões, descritores e gabarito.');
  const first=rows[0], second=rows[1], third=rows[2];
  const start=(A().norm(first[0]).toLowerCase().includes('aluno')||A().norm(first[0])==='')?1:0;
  const questions=first.slice(start).map((v,i)=>A().norm(v)||'Q'+(i+1));
  const descriptors=second.slice(start,start+questions.length).map(v=>A().desc(v)||A().norm(v));
  const key=third.slice(start,start+questions.length).map(v=>A().letter(v));
  const students=rows.slice(3).map(r=>({name:A().norm(r[0]),answers:r.slice(start,start+questions.length).map(v=>A().letter(v))})).filter(s=>s.name);
  const issues=[]; if(!questions.length)issues.push('Nenhuma questão encontrada.'); if(descriptors.some(x=>!x))issues.push('Há questões sem descritor.'); if(key.some(x=>!x))issues.push('Há itens sem gabarito A-E.'); students.forEach(s=>{if(s.answers.length<questions.length)issues.push('Aluno '+s.name+' possui respostas incompletas.')});
  return {questions,descriptors,key,students,issues};
 }
 function renderValidation(data){const box=A().$('#validationResult'); const ok=!data.issues.length; const html=`<b>${ok?'Estrutura válida — análise liberada':'Conferência necessária — análise bloqueada'}</b><div class="checkgrid"><div><b>${data.questions.length}</b><br>questões</div><div><b>${data.descriptors.filter(Boolean).length}</b><br>descritores</div><div><b>${data.key.filter(Boolean).length}</b><br>gabaritos</div><div><b>${data.students.length}</b><br>alunos</div></div>${data.issues.length?'<ul>'+data.issues.map(i=>`<li>${A().safe(i)}</li>`).join('')+'</ul>':'<p>Todos os campos essenciais foram identificados. Clique em Confirmar e analisar.</p>'}`;
  if(box){box.className='statusbox '+(ok?'status-ok':'status-error'); box.innerHTML=html;}
  const gate=A().$('#importGate'); if(gate){gate.className='statusbox '+(ok?'status-ok':'status-error'); gate.innerHTML=ok?'✅ Estrutura válida. A análise está liberada.':'⚠️ Corrija a estrutura antes de analisar. A análise fica bloqueada para evitar relatórios incorretos.';}
  const confirm=A().$('#confirmImport'); if(confirm) confirm.disabled=!ok;
  const prev=A().$('#previewImport'); if(prev){prev.innerHTML='<div class="preview-table"><div class="preview-row"><span>Aluno</span>'+data.questions.slice(0,10).map(q=>`<span>${A().safe(q)}</span>`).join('')+'</div>'+data.students.slice(0,5).map(s=>`<div class="preview-row"><span>${A().safe(s.name)}</span>${s.answers.slice(0,10).map(x=>`<span>${A().safe(x)}</span>`).join('')}</div>`).join('')+'</div>';}
  window.Importacao.pending=data; A().renderWizard?.();
 }
 function parseTextTable(text){return text.trim().split(/\n+/).map(line=>line.split(/\t|;|,/).map(x=>x.trim()));}
 async function readExcel(file){const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:'array'});let best=null;for(const name of wb.SheetNames){const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:false,defval:''}); if(!best||rows.length>(best.rows?.length||0))best={name,rows};}return best.rows;}
 async function readPdf(file){if(!window.pdfjsLib)throw new Error('Biblioteca PDF não carregada.'); pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; const ab=await file.arrayBuffer(); const pdf=await pdfjsLib.getDocument({data:ab}).promise; let text=''; for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p);const tc=await page.getTextContent(); text+=tc.items.map(i=>i.str).join(' ')+'\n';} return text;}
 function confirmData(data=window.Importacao.pending){if(!data) return A().status('#validationResult','Valide ou importe uma tabela primeiro.','error'); if(data.issues?.length){A().status('#validationResult','Análise bloqueada: corrija a estrutura antes de confirmar.','error'); const gate=A().$('#importGate'); if(gate) A().status(gate,'Análise bloqueada: '+data.issues.join('; ')+'.','error'); return;} A().setAssessment({questions:data.questions,descriptors:data.descriptors,key:data.key,students:data.students}); A().status('#validationResult','Dados confirmados e analisados.','ok'); A().status('#importGate','✅ Dados confirmados. Diagnóstico disponível.','ok');}
 function bind(){
  A().$('#extractFile')&&(A().$('#extractFile').onclick=async()=>{try{const f=A().$('#fileInput').files[0];if(!f)throw new Error('Selecione um arquivo Excel, CSV ou TXT.');A().status('#extractStatus','Lendo arquivo...');let rows;if(/\.xlsx?$|\.xls$/i.test(f.name)) rows=await readExcel(f); else rows=parseTextTable(await f.text()); const data=rowsToAssessment(rows); renderValidation(data); A().status('#extractStatus','Arquivo lido. Confira a validação antes de confirmar.','ok');}catch(e){A().status('#extractStatus',A().safe(e.message),'error');}});
  A().$('#readPdfOnly')&&(A().$('#readPdfOnly').onclick=async()=>{try{const f=A().$('#pdfOnlyInput').files[0];if(!f)throw new Error('Selecione um PDF.');const t=await readPdf(f);A().$('#pasteData').value=t;A().status('#validationResult','Texto extraído do PDF e enviado para a digitação manual. Revise a tabela antes de confirmar.','work');document.querySelector('[data-tab="manualTab"]').click();}catch(e){A().status('#validationResult','Falha no PDF: '+A().safe(e.message),'error');}});
  A().$('#validateData')&&(A().$('#validateData').onclick=()=>{try{renderValidation(rowsToAssessment(parseTextTable(A().$('#pasteData').value)));}catch(e){A().status('#validationResult',A().safe(e.message),'error');}});
  A().$('#confirmImport')&&(A().$('#confirmImport').onclick=()=>confirmData());
  A().$('#loadExample')&&(A().$('#loadExample').onclick=()=>{const qs=Array.from({length:26},(_,i)=>'Q'+(i+1));const ds=qs.map((_,i)=>'D'+((i%10)+1));const key=qs.map((_,i)=>'ABCDE'[i%5]);const students=['Ana Silva','Bruno Lima','Carla Souza','Daniel Alves','Eduarda Costa'].map((n,j)=>[n,...qs.map((_,i)=>'ABCDE'[(i+j)%5])]);const rows=[['Aluno',...qs],['Descritores',...ds],['Gabarito',...key],...students];const data=rowsToAssessment(rows);renderValidation(data);A().$('#pasteData').value=A().toTSV(rows);});
 }
 window.Importacao={rowsToAssessment,renderValidation,pending:null,bind,confirmData};document.addEventListener('DOMContentLoaded',bind);
})();
