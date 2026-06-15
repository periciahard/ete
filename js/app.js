const STORE='ete_diagnostico_v9';
let state={students:[],questions:[],map:{},descriptors:[],history:[],meta:{updated:null}};
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
function save(){state.meta.updated=new Date().toLocaleString('pt-BR');localStorage.setItem(STORE,JSON.stringify(state));$('#lastSave').textContent='Último salvamento: '+state.meta.updated;}
function load(){try{Object.assign(state,JSON.parse(localStorage.getItem(STORE)||'{}'))}catch(e){} if(state.meta?.updated)$('#lastSave').textContent='Último salvamento: '+state.meta.updated;}
async function loadDescriptors(){try{let [p,m]=await Promise.all([fetch('descritores/portugues-em.json').then(r=>r.json()),fetch('descritores/matematica-em.json').then(r=>r.json())]);state.descriptors=[...p,...m];}catch(e){state.descriptors=[]} renderDescriptors();}
function pct(n,d){return d?Math.round(n/d*100):0} function level(v){return v>=70?['Consolidado','ok','🟢']:v>=40?['Em desenvolvimento','warn','🟡']:['Crítico','bad','🔴']}
function normalizeCell(x){return String(x||'').trim().replace(/^"|"$/g,'')}
function answerValue(x){x=normalizeCell(x).toLowerCase(); if(!x)return 0; if(/^(1|s|sim|c|certo|correto|acerto|a|✓|✔|ok)$/i.test(x))return 1; if(/^(0|n|não|nao|e|errado|erro|x|✗|✘)$/i.test(x))return 0; return /1|sim|certo|acerto|✓|✔/.test(x)?1:0}

function normalizePdfTokens(text){
  return (text||'')
    .replace(/\u00a0/g,' ')
    .replace(/([A-Za-zÀ-ÿ])\s*\n\s*([a-zà-ÿ])/g,'$1 $2')
    .replace(/D\s*(\d)\s+([0-9])\b/g,'D$1$2')
    .replace(/D\s*(\d{1,2})\b/gi,'D$1')
    .replace(/Q\s*(\d)\s+([0-9])\b/g,'Q$1$2')
    .replace(/Q\s*(\d{1,2})\b/gi,'Q$1')
    .replace(/\s+/g,' ')
    .trim();
}
function parseDescriptorAnswerSheet(text){
  const cleaned=normalizePdfTokens(text);
  const tokens=cleaned.match(/gabarito|D\d{1,2}|[A-Za-zÀ-ÿ]+(?:['’][A-Za-zÀ-ÿ]+)?|\d+/gi)||[];
  const gi=tokens.findIndex(t=>/^gabarito$/i.test(t));
  if(gi<0) return null;
  const after=tokens.slice(gi+1);
  const key=[]; let pos=0;
  while(pos<after.length && key.length<26){
    if(/^D\d{1,2}$/i.test(after[pos])) key.push(after[pos].toUpperCase());
    pos++;
  }
  if(key.length<5) return null;
  const qs=key.map((_,i)=>`Q${i+1}`);
  const students=[]; let name=[]; let answers=[];
  for(;pos<after.length;pos++){
    const tok=after[pos];
    if(/^D\d{1,2}$/i.test(tok)){
      answers.push(tok.toUpperCase());
      if(answers.length===key.length){
        const studentName=name.join(' ').trim();
        if(studentName && !/^gabarito$/i.test(studentName)){
          students.push({name:studentName,answers:answers.map((a,i)=>a===key[i]?1:0),raw:answers.slice()});
        }
        name=[]; answers=[];
      }
    }else if(/^[A-Za-zÀ-ÿ]/.test(tok)){
      if(answers.length===0) name.push(tok);
    }
    if(students.length>=50) break;
  }
  if(!students.length) return null;
  return {qs,students,key};
}

function splitSmart(line){
  if(line.includes(';'))return line.split(';').map(normalizeCell);
  if(line.includes('\t'))return line.split('\t').map(normalizeCell);
  if(line.includes(','))return line.split(',').map(normalizeCell);
  let parts=line.trim().split(/\s{2,}/).map(normalizeCell).filter(Boolean);
  if(parts.length>2)return parts;
  let tokens=line.trim().split(/\s+/).filter(Boolean);
  let firstAns=tokens.findIndex(t=>/^(1|0|C|E|A|S|N|SIM|NAO|NÃO|CERTO|ERRADO|✓|✔|X)$/i.test(t));
  if(firstAns>0)return [tokens.slice(0,firstAns).join(' '),...tokens.slice(firstAns)];
  return [line.trim()];
}
function looksLikeHeader(cols){return cols.slice(1).some(c=>/^q\d+$/i.test(c)||/^quest/i.test(c))||/aluno|nome|estudante/i.test(cols[0]||'')}

function aoaToText(rows){
  return rows.map(r=>r.map(c=>normalizeCell(c)).join('\t')).join('\n');
}
function parseExcelRows(rows){
  rows=(rows||[]).map(r=>(r||[]).map(c=>normalizeCell(c))).filter(r=>r.some(c=>c));
  if(!rows.length) throw new Error('A planilha está vazia.');
  // Remove linhas completamente vazias nas extremidades e limita colunas úteis.
  const headerIndex=rows.findIndex(r=>r.some(c=>/^aluno$/i.test(c)) && r.some(c=>/^Q\s*\d+/i.test(c)));
  const gabaritoIndex=rows.findIndex(r=>r.some(c=>/^gabarito$/i.test(c)));
  // Modelo 1: primeira coluna Aluno, linha gabarito com descritores e alunos respondendo D1/D2...
  if(headerIndex>=0 && gabaritoIndex>=0){
    const header=rows[headerIndex];
    const alunoCol=header.findIndex(c=>/^aluno$/i.test(c));
    const qCols=[];
    header.forEach((c,i)=>{ if(/^Q\s*\d+/i.test(c)) qCols.push(i); });
    if(qCols.length){
      const keyRow=rows[gabaritoIndex];
      const key=qCols.map(i=>normalizeCell(keyRow[i]).toUpperCase()).map(v=>/^D\d{1,2}$/.test(v)?v:'');
      const qs=qCols.map((i,k)=>`Q${k+1}`);
      const students=[];
      rows.slice(gabaritoIndex+1).forEach(r=>{
        let name=normalizeCell(r[alunoCol]);
        if(!name || /^total|m[eé]dia|quest/i.test(name.toLowerCase())) return;
        let raw=qCols.map(i=>normalizeCell(r[i]).toUpperCase());
        let answers=raw.map((v,i)=> /^D\d{1,2}$/.test(v) && key[i] ? (v===key[i]?1:0) : answerValue(v));
        students.push({name,answers,raw});
      });
      if(students.length){ state.questions=qs; state.students=students.slice(0,50); qs.forEach((q,i)=>state.map[q]=key[i]||state.map[q]||''); save(); renderAll(); go('turma'); return true; }
    }
  }
  // Modelo 2: primeira linha com Aluno,Q1,Q2... e valores 1/0/C/E.
  const hi=headerIndex>=0?headerIndex:0;
  const header=rows[hi];
  const alunoCol=header.findIndex(c=>/^aluno|nome/i.test(c));
  if(alunoCol>=0){
    const qCols=[]; header.forEach((c,i)=>{ if(i!==alunoCol && (/^Q\s*\d+/i.test(c)||i>alunoCol)) qCols.push(i); });
    const qs=qCols.map((i,k)=>/^Q\s*\d+/i.test(header[i])?header[i].replace(/\s+/g,''):`Q${k+1}`);
    const students=[];
    rows.slice(hi+1).forEach(r=>{
      let name=normalizeCell(r[alunoCol]);
      if(!name || /^gabarito|total|m[eé]dia|quest/i.test(name.toLowerCase())) return;
      students.push({name,answers:qCols.map(i=>answerValue(r[i]))});
    });
    if(students.length){ state.questions=qs; state.students=students.slice(0,50); qs.forEach(q=>state.map[q]=state.map[q]||''); save(); renderAll(); go('turma'); return true; }
  }
  return false;
}
async function readExcelFile(file){
  if(!window.XLSX) throw new Error('Biblioteca Excel não carregou. Verifique a internet na primeira abertura ou salve a planilha como CSV.');
  const buf=await file.arrayBuffer();
  const wb=XLSX.read(buf,{type:'array'});
  let best=null;
  for(const name of wb.SheetNames){
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:false});
    if(!best || rows.length>best.rows.length) best={name,rows};
  }
  if(!best) throw new Error('Não encontrei abas na planilha.');
  return best;
}

function parseData(text){
  text=(text||'').replace(/\u00a0/g,' ').trim();
  const desc=parseDescriptorAnswerSheet(text);
  if(desc){
    state.questions=desc.qs;
    state.students=desc.students;
    desc.qs.forEach((q,i)=>state.map[q]=desc.key[i]);
    save(); renderAll(); go('turma');
    const st=$('#extractStatus'); if(st)st.textContent=`Arquivo processado como tabela de gabarito por descritor: ${desc.students.length} alunos e ${desc.qs.length} questões.`;
    return;
  }
  let lines=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if(!lines.length){alert('Cole ou extraia uma tabela antes de processar.');return;}
  let rows=lines.map(splitSmart).filter(r=>r.length>1);
  if(!rows.length){alert('Não consegui identificar uma tabela. Ajuste o texto para o modelo Aluno,Q1,Q2...');return;}
  let header=looksLikeHeader(rows[0])?rows.shift():null;
  let maxAnswers=Math.max(...rows.map(r=>r.length-1));
  let qs=header?header.slice(1).map((h,i)=>/^q/i.test(h)?h:`Q${i+1}`):Array.from({length:maxAnswers},(_,i)=>`Q${i+1}`);
  rows=rows.slice(0,50);
  let students=rows.map(r=>({name:normalizeCell(r[0])||'Aluno sem nome',answers:qs.map((q,i)=>answerValue(r[i+1]))})).filter(s=>s.name&&!/^total|m[eé]dia|quest/i.test(s.name.toLowerCase()));
  if(!students.length){alert('Não encontrei alunos válidos na tabela.');return;}
  state.questions=qs; state.students=students; qs.forEach(q=>state.map[q]=state.map[q]||''); save(); renderAll(); go('turma');
}
async function extractPdfText(file){
  if(!window.pdfjsLib)throw new Error('Biblioteca PDF.js não carregou. Verifique a internet ou use CSV/colar tabela.');
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const buf=await file.arrayBuffer(); const pdf=await pdfjsLib.getDocument({data:buf}).promise; let all=[];
  for(let p=1;p<=pdf.numPages;p++){
    const page=await pdf.getPage(p); const content=await page.getTextContent();
    const items=content.items.map(it=>({str:it.str,x:it.transform[4],y:Math.round(it.transform[5])})).filter(it=>it.str.trim());
    const lines={}; items.forEach(it=>{(lines[it.y]=lines[it.y]||[]).push(it)});
    Object.keys(lines).sort((a,b)=>b-a).forEach(y=>{all.push(lines[y].sort((a,b)=>a.x-b.x).map(it=>it.str).join('  '))});
  }
  return all.join('\n');
}
async function extractImageText(file){
  if(!window.Tesseract)throw new Error('Biblioteca OCR não carregou. Verifique a internet ou use CSV/colar tabela.');
  const status=$('#extractStatus');
  const result=await Tesseract.recognize(file,'por+eng',{logger:m=>{if(m.status)status.textContent='OCR: '+m.status+(m.progress?` ${Math.round(m.progress*100)}%`:'')}});
  return result.data.text||'';
}
async function extractSelectedFile(){
  const file=$('#fileInput').files[0]; const status=$('#extractStatus');
  if(!file){alert('Escolha um PDF, imagem, CSV ou TXT primeiro.');return;}
  try{
    status.textContent='Lendo arquivo...'; let text='';
    if(file.name.match(/\.xlsx?$|\.xls$/i)){
      const book=await readExcelFile(file);
      $('#pasteData').value=aoaToText(book.rows);
      const ok=parseExcelRows(book.rows);
      status.textContent=ok?`Excel processado automaticamente pela aba ${book.name}.`:`Excel lido pela aba ${book.name}. Confira a tabela extraída e clique em Processar dados.`;
      return;
    }
    if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)) text=await extractPdfText(file);
    else if(file.type.startsWith('image/')) text=await extractImageText(file);
    else text=await file.text();
    $('#pasteData').value=cleanExtractedTable(text);
    status.textContent='Leitura concluída. Confira a tabela extraída e clique em Processar dados.';
  }catch(err){status.textContent='Não foi possível ler automaticamente: '+err.message;}
}
function cleanExtractedTable(text){
  let lines=(text||'').replace(/\u00a0/g,' ').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  // Remove cabeçalhos comuns que atrapalham a tabela
  lines=lines.filter(l=>!/^p[aá]gina|^resultado geral|^escola|^turma\b|^data\b/i.test(l));
  return lines.join('\n');
}
function calcStudent(s){let total=s.answers.length, ac=s.answers.reduce((a,b)=>a+b,0), p=pct(ac,total);let crit=[];s.answers.forEach((v,i)=>{if(!v&&state.map[state.questions[i]])crit.push(state.map[state.questions[i]])});return {total,ac,p,crit:[...new Set(crit)]}}
function descriptorStats(){let out={};state.questions.forEach((q,i)=>{let d=state.map[q]||'Sem descritor'; if(!out[d])out[d]={d,total:0,ac:0,qs:[]}; out[d].total+=state.students.length; out[d].ac+=state.students.reduce((a,s)=>a+(s.answers[i]||0),0); out[d].qs.push(q)}); return Object.values(out).map(x=>({...x,p:pct(x.ac,x.total)})).sort((a,b)=>a.p-b.p)}
function renderSummary(){let n=state.students.length, q=state.questions.length;let acc=state.students.reduce((a,s)=>a+calcStudent(s).ac,0), total=n*q, p=pct(acc,total);let prior=state.students.filter(s=>calcStudent(s).p<40).length;let crit=descriptorStats().filter(d=>d.p<40&&d.d!='Sem descritor').length;$('#summaryCards').innerHTML=[['👨‍🎓','Alunos avaliados',n],['📋','Questões',q],['📊','Média geral',p+'%'],['🔴','Alunos prioritários',prior],['🧩','Descritores críticos',crit]].map(c=>`<div class="card"><span>${c[0]} ${c[1]}</span><b>${c[2]}</b></div>`).join('')}
function renderMap(){let el=$('#questionMap'); if(!el)return; el.innerHTML=state.questions.map(q=>`<label>${q}<select data-q="${q}"><option value="">Selecionar descritor</option>${state.descriptors.map(d=>`<option ${state.map[q]==d.codigo?'selected':''} value="${d.codigo}">${d.codigo} - ${d.disciplina}</option>`).join('')}</select></label>`).join(''); $$('[data-q]').forEach(x=>x.onchange=()=>{state.map[x.dataset.q]=x.value;save();renderAll()})}
function renderStudents(){let list=$('#studentList'); if(!list)return; let term=($('#studentSearch')?.value||'').toLowerCase(); list.innerHTML=state.students.filter(s=>s.name.toLowerCase().includes(term)).map((s,i)=>{let c=calcStudent(s), l=level(c.p);return `<button data-st="${i}">${l[2]} ${s.name}<br><small>${c.p}% • ${l[0]}</small></button>`}).join('')||'<p class="hint">Nenhum aluno importado.</p>'; $$('[data-st]').forEach(b=>b.onclick=()=>showStudent(+b.dataset.st));}
function showStudent(i){let s=state.students[i], c=calcStudent(s), l=level(c.p);let desc=c.crit.map(code=>state.descriptors.find(d=>d.codigo==code)).filter(Boolean);$('#studentDetail').innerHTML=`<h3>${s.name}</h3><p><span class="badge ${l[1]}">${l[2]} ${l[0]}</span></p><div class="metricgrid"><div class="card"><span>Acertos</span><b>${c.ac}/${c.total}</b></div><div class="card"><span>Percentual</span><b>${c.p}%</b></div><div class="card"><span>Descritores críticos</span><b>${c.crit.length}</b></div></div><h4>Feedback individual</h4><div class="reportbox">${studentFeedback(s)}</div><h4>Descritores para intervenção</h4>${desc.map(d=>`<details open><summary>${d.codigo} — ${d.texto}</summary><p>${d.explicacao}</p><p><b>Intervenção:</b> ${d.intervencao}</p></details>`).join('')||'<p class="hint">Sem descritores críticos mapeados.</p>'}`}
function studentFeedback(s){let c=calcStudent(s), l=level(c.p);let d=c.crit.slice(0,4).join(', ')||'sem descritor crítico mapeado';return `${s.name} apresentou desempenho ${l[0].toLowerCase()}, com ${c.ac} acertos em ${c.total} questões (${c.p}%). Os descritores que merecem maior atenção são: ${d}. Recomenda-se acompanhamento individualizado, retomada dos conteúdos associados aos erros e nova verificação após intervenção curta.`}
function renderClass(){let el=$('#classReport'); if(!el)return;let stats=descriptorStats(), n=state.students.length,q=state.questions.length;let p=pct(state.students.reduce((a,s)=>a+calcStudent(s).ac,0),n*q);let l=level(p);let qs=state.questions.map((q,i)=>({q,p:pct(state.students.reduce((a,s)=>a+(s.answers[i]||0),0),n)})).sort((a,b)=>a.p-b.p);el.innerHTML=`<div class="cards"><div class="card"><span>Resultado da turma</span><b>${p}%</b><span class="badge ${l[1]}">${l[2]} ${l[0]}</span></div><div class="card"><span>Prioritários</span><b>${state.students.filter(s=>calcStudent(s).p<40).length}</b></div><div class="card"><span>Em desenvolvimento</span><b>${state.students.filter(s=>{let p=calcStudent(s).p;return p>=40&&p<70}).length}</b></div><div class="card"><span>Consolidados</span><b>${state.students.filter(s=>calcStudent(s).p>=70).length}</b></div><div class="card"><span>Itens críticos</span><b>${qs.filter(x=>x.p<40).length}</b></div></div><div class="panel"><h3>Descritores críticos</h3>${stats.slice(0,8).map(d=>`<p><b>${d.d}</b>: ${d.p}% de acertos (${d.qs.join(', ')})</p>`).join('')||'<p class="hint">Mapeie descritores para análise.</p>'}</div>`;renderHeatmap();}
function renderHeatmap(){let el=$('#heatmap'); if(!el)return; el.innerHTML=state.students.map(s=>`<div class="heatrow"><span class="heatname">${s.name}</span>${s.answers.map(v=>`<span class="cell c${v}"></span>`).join('')}</div>`).join('')||'<p class="hint">Importe dados para exibir o mapa.</p>'}
function renderDescriptors(){let el=$('#descriptorList'); if(!el)return;let disc=$('#descriptorDiscipline')?.value||'todos', term=($('#descriptorSearch')?.value||'').toLowerCase();let arr=state.descriptors.filter(d=>(disc=='todos'||d.disciplina==disc)&&(`${d.codigo} ${d.texto} ${d.explicacao}`.toLowerCase().includes(term)));el.innerHTML=arr.map(d=>`<details class="desc"><summary>${d.disciplina} • ${d.codigo} — ${d.texto}</summary><p><b>O que avalia:</b> ${d.explicacao}</p><p><b>Intervenção sugerida:</b> ${d.intervencao}</p><p><b>BNCC:</b> ${d.bncc}</p><p><b>Exemplos:</b> ${d.exemplos.join(' | ')}</p></details>`).join('')||'<p class="hint">Nenhum descritor encontrado.</p>'}
function renderTomorrow(){let crit=descriptorStats().filter(d=>d.d!='Sem descritor').slice(0,3), el=$('#tomorrowPlan'); if(!el)return; el.innerHTML=crit.length?`<h3>Prioridades para a próxima aula</h3>${crit.map((d,i)=>{let info=state.descriptors.find(x=>x.codigo==d.d);return `<p><b>${i+1}. ${d.d} — ${d.p}% de acertos.</b><br>${info?info.texto:''}<br><b>Ação:</b> ${info?info.intervencao:'Retomar habilidade com atividade curta e correção comentada.'}</p>`}).join('')}<p><b>Estratégia:</b> 15 min de retomada, 25 min de prática guiada, 20 min de atividade em pares e 10 min de verificação rápida.</p>`:'<p class="hint">Mapeie os descritores para gerar o plano.</p>'}
function renderHistory(){let el=$('#history'); if(!el)return; el.innerHTML=state.history.map((h,i)=>`<div class="panel"><b>${h.date}</b><p>Média: ${h.avg}% • Alunos: ${h.students}</p></div>`).join('')||'<p class="hint">Nenhum diagnóstico salvo.</p>'}
function makeReport(type){let avg=pct(state.students.reduce((a,s)=>a+calcStudent(s).ac,0),state.students.length*state.questions.length);let crit=descriptorStats().slice(0,5).map(d=>`${d.d} (${d.p}%)`).join(', '); if(type=='familia')return state.students.map(studentFeedback).join('\n\n'); if(type=='conselho')return `CONSELHO DE CLASSE\nA turma apresentou média geral de ${avg}%. Alunos prioritários: ${state.students.filter(s=>calcStudent(s).p<40).length}. Descritores que exigem intervenção: ${crit}. Recomenda-se retomada direcionada e acompanhamento dos estudantes com baixo desempenho.`; if(type=='coordenacao')return `RELATÓRIO PARA COORDENAÇÃO\nAlunos avaliados: ${state.students.length}\nQuestões: ${state.questions.length}\nMédia geral: ${avg}%\nDescritores críticos: ${crit}\nEncaminhamento: organizar agrupamentos por dificuldade e nova avaliação curta após intervenção.`; return `RELATÓRIO DA TURMA\nMédia geral: ${avg}%\nDescritores críticos: ${crit}\nPlano: priorizar os descritores de menor acerto, com atividades curtas, correção comentada e reavaliação.`}
function renderAll(){renderSummary();renderMap();renderStudents();renderClass();renderDescriptors();renderTomorrow();renderHistory();}
function go(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id==id));$$('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view==id));renderAll();}
document.addEventListener('click',e=>{let goid=e.target.dataset.go||e.target.dataset.view;if(goid)go(goid); if(e.target.dataset.report)$('#reportOutput').value=makeReport(e.target.dataset.report)});
$('#processData').onclick=()=>parseData($('#pasteData').value);$('#loadExample').onclick=()=>{$('#pasteData').value='Aluno,Q1,Q2,Q3,Q4,Q5,Q6,Q7,Q8\nAna,1,1,0,1,0,1,1,0\nBruno,0,1,0,0,0,1,0,0\nCarla,1,1,1,1,1,0,1,1\nDiego,0,0,1,0,1,0,0,1';parseData($('#pasteData').value)};
$('#fileInput').onchange=async e=>{let f=e.target.files[0]; if(!f)return; $('#extractStatus').textContent='Arquivo selecionado: '+f.name+'. Clique em Ler arquivo.'; if(/csv|text/.test(f.type)||f.name.match(/\.csv|\.txt$/i)){let t=await f.text();$('#pasteData').value=t;} if(f.name.match(/\.xlsx?$|\.xls$/i)){try{let book=await readExcelFile(f);$('#pasteData').value=aoaToText(book.rows);$('#extractStatus').textContent='Planilha lida: aba '+book.name+'. Confira os dados e clique em Processar, ou clique em Ler arquivo para processar automaticamente.';}catch(err){$('#extractStatus').textContent='Não consegui ler a planilha: '+err.message;}}};
$('#extractFile').onclick=extractSelectedFile;
$('#studentSearch').oninput=renderStudents; $('#descriptorSearch').oninput=renderDescriptors; $('#descriptorDiscipline').onchange=renderDescriptors;
$('#saveSnapshot').onclick=()=>{let avg=pct(state.students.reduce((a,s)=>a+calcStudent(s).ac,0),state.students.length*state.questions.length);state.history.push({date:new Date().toLocaleString('pt-BR'),avg,students:state.students.length});save();renderHistory()};
$('#clearSnapshots').onclick=()=>{if(confirm('Limpar histórico?')){state.history=[];save();renderHistory()}};
$('#clearAll').onclick=()=>{if(confirm('Apagar todos os dados salvos?')){localStorage.removeItem(STORE);location.reload()}};
$('#exportJson').onclick=()=>download('backup-diagnostico-ete.json',JSON.stringify(state,null,2));
$('#importJson').onchange=e=>{let f=e.target.files[0]; if(!f)return; let r=new FileReader(); r.onload=()=>{state=JSON.parse(r.result);save();renderAll()}; r.readAsText(f)};
$('#copyReport').onclick=()=>navigator.clipboard.writeText($('#reportOutput').value||'');$('#downloadReport').onclick=()=>download('relatorio-diagnostico.txt',$('#reportOutput').value||'');
function download(name,text){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
if('serviceWorker' in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});
load();loadDescriptors().then(renderAll);
