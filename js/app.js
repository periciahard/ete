const STORE='ete_diagnostico_v15';
let state={students:[],questions:[],map:{},answerKey:{},descriptors:[],history:[],meta:{updated:null,modelo:'',disciplina:'Língua Portuguesa'}};
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
function save(){state.meta.updated=new Date().toLocaleString('pt-BR');localStorage.setItem(STORE,JSON.stringify(state));$('#lastSave').textContent='Último salvamento: '+state.meta.updated;}
function load(){try{Object.assign(state,JSON.parse(localStorage.getItem(STORE)||'{}'))}catch(e){} state.meta=state.meta||{}; state.meta.disciplina=state.meta.disciplina||'Língua Portuguesa'; if(state.meta?.updated)$('#lastSave').textContent='Último salvamento: '+state.meta.updated; syncDisciplineControls();}
async function loadDescriptors(){try{let [p,m]=await Promise.all([fetch('descritores/portugues-em.json').then(r=>r.json()),fetch('descritores/matematica-em.json').then(r=>r.json())]);state.descriptors=[...p,...m];}catch(e){state.descriptors=[]} renderDescriptors();}
function syncDisciplineControls(){['#assessmentDiscipline','#configDiscipline'].forEach(sel=>{let el=$(sel); if(el) el.value=state.meta?.disciplina||'Língua Portuguesa';});}
function setDiscipline(v){state.meta=state.meta||{}; state.meta.disciplina=v||'Língua Portuguesa'; syncDisciplineControls(); save(); renderAll();}
function pct(n,d){return d?Math.round(n/d*100):0} function level(v){return v>=70?['Consolidado','ok','🟢']:v>=40?['Em desenvolvimento','warn','🟡']:['Crítico','bad','🔴']}
function normalizeCell(x){return String(x||'').trim().replace(/^"|"$/g,'')}
function answerValue(x){x=normalizeCell(x).toLowerCase(); if(!x)return 0; if(/^(1|s|sim|c|certo|correto|acerto|a|✓|✔|ok)$/i.test(x))return 1; if(/^(0|n|não|nao|e|errado|erro|x|✗|✘)$/i.test(x))return 0; return /1|sim|certo|acerto|✓|✔/.test(x)?1:0}

function normAlt(x){return normalizeCell(x).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]/g,'');}
function isQuestionLabel(x){return /^Q\s*\d+$/i.test(normalizeCell(x));}
function isDescriptorCode(x){return /^D\s*\d{1,2}$/i.test(normalizeCell(x));}
function cleanDescriptor(x){let v=normalizeCell(x).toUpperCase().replace(/\s+/g,''); return /^D\d{1,2}$/.test(v)?v:'';}

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

  // MODELO PADRÃO DA ETE:
  // Linha 1: Nome | Q1 | Q2 | Q3...
  // Linha 2: Descritores | D16 | D4 | D4...
  // Linha 3: Gabarito | C | C | C...
  // Linha 4 em diante: nome do aluno | alternativa marcada em cada questão.
  const qRowIndex=rows.findIndex(r=>r.slice(1).filter(isQuestionLabel).length>=2);
  if(qRowIndex>=0 && rows[qRowIndex+1] && rows[qRowIndex+2]){
    const qRow=rows[qRowIndex];
    const descRow=rows[qRowIndex+1];
    const keyRow=rows[qRowIndex+2];
    const descLabel=normalizeCell(descRow[0]).toLowerCase();
    const keyLabel=normalizeCell(keyRow[0]).toLowerCase();
    const qCols=[];
    qRow.forEach((c,i)=>{ if(i>0 && isQuestionLabel(c)) qCols.push(i); });
    const hasDescritores=/descritor/.test(descLabel) || qCols.some(i=>isDescriptorCode(descRow[i]));
    const hasGabarito=/gabarito/.test(keyLabel) || qCols.some(i=>/^[A-E]$/i.test(normAlt(keyRow[i])));
    if(qCols.length && hasDescritores && hasGabarito){
      const qs=qCols.map(i=>qRow[i].replace(/\s+/g,'').toUpperCase());
      const descriptors=qCols.map(i=>cleanDescriptor(descRow[i]));
      const key=qCols.map(i=>normAlt(keyRow[i]));
      const students=[];
      rows.slice(qRowIndex+3).forEach(r=>{
        const name=normalizeCell(r[0]);
        if(!name || /^total|m[eé]dia|quest|descritor|gabarito/i.test(name)) return;
        const raw=qCols.map(i=>normAlt(r[i]));
        const answers=raw.map((v,i)=> key[i] && v===key[i] ? 1 : 0);
        students.push({name,answers,raw});
      });
      if(students.length){
        state.questions=qs;
        state.students=students.slice(0,50);
        state.map={}; state.answerKey={};
        qs.forEach((q,i)=>{state.map[q]=descriptors[i]||''; state.answerKey[q]=key[i]||'';});
        state.meta.modelo='Linha 1: questões; linha 2: descritores; linha 3: gabarito; demais linhas: respostas dos alunos.'; state.meta.disciplina=state.meta.disciplina||'Língua Portuguesa';
        save(); renderAll(); go('turma');
        const st=$('#extractStatus');
        if(st) st.textContent=`Planilha processada no modelo ETE: ${students.length} alunos, ${qs.length} questões, descritores e gabarito identificados automaticamente.`;
        return true;
      }
    }
  }

  // Modelo antigo: primeira coluna Aluno, linha gabarito com descritores e alunos respondendo D1/D2...
  const headerIndex=rows.findIndex(r=>r.some(c=>/^aluno$/i.test(c)) && r.some(c=>/^Q\s*\d+/i.test(c)));
  const gabaritoIndex=rows.findIndex(r=>r.some(c=>/^gabarito$/i.test(c)));
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
      if(students.length){ state.questions=qs; state.students=students.slice(0,50); state.map={}; state.answerKey={}; qs.forEach((q,i)=>{state.map[q]=key[i]||''; state.answerKey[q]='';}); save(); renderAll(); go('turma'); return true; }
    }
  }

  // Modelo simples: primeira linha Aluno/Nome,Q1,Q2... e valores 1/0/C/E.
  const hi=headerIndex>=0?headerIndex:0;
  const header=rows[hi];
  const alunoCol=header.findIndex(c=>/^aluno|nome/i.test(c));
  if(alunoCol>=0){
    const qCols=[]; header.forEach((c,i)=>{ if(i!==alunoCol && (/^Q\s*\d+/i.test(c)||i>alunoCol)) qCols.push(i); });
    const qs=qCols.map((i,k)=>/^Q\s*\d+/i.test(header[i])?header[i].replace(/\s+/g,'').toUpperCase():`Q${k+1}`);
    const students=[];
    rows.slice(hi+1).forEach(r=>{
      let name=normalizeCell(r[alunoCol]);
      if(!name || /^gabarito|descritor|total|m[eé]dia|quest/i.test(name.toLowerCase())) return;
      students.push({name,answers:qCols.map(i=>answerValue(r[i])),raw:qCols.map(i=>normalizeCell(r[i]))});
    });
    if(students.length){ state.questions=qs; state.students=students.slice(0,50); state.map={}; state.answerKey={}; qs.forEach(q=>{state.map[q]=state.map[q]||''; state.answerKey[q]='';}); save(); renderAll(); go('turma'); return true; }
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
  if(!rows.length){alert('Não consegui identificar uma tabela. Ajuste o texto para o modelo Nome,Q1,Q2...');return;}
  if(parseExcelRows(rows)) return;
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
function renderMap(){let el=$('#questionMap'); if(!el)return; let disc=state.meta?.disciplina||'Língua Portuguesa'; let descs=state.descriptors.filter(d=>d.disciplina===disc); el.innerHTML=state.questions.map(q=>`<label>${q}${state.answerKey&&state.answerKey[q]?`<small>Gabarito: ${state.answerKey[q]}</small>`:''}<select data-q="${q}"><option value="">Selecionar descritor</option>${descs.map(d=>`<option ${state.map[q]==d.codigo?'selected':''} value="${d.codigo}">${d.codigo} - ${d.disciplina}</option>`).join('')}</select></label>`).join(''); $$('[data-q]').forEach(x=>x.onchange=()=>{state.map[x.dataset.q]=x.value;save();renderAll()})}
function renderStudents(){let list=$('#studentList'); if(!list)return; let term=($('#studentSearch')?.value||'').toLowerCase(); list.innerHTML=state.students.filter(s=>s.name.toLowerCase().includes(term)).map((s,i)=>{let c=calcStudent(s), l=level(c.p);return `<button data-st="${i}">${l[2]} ${s.name}<br><small>${c.p}% • ${l[0]}</small></button>`}).join('')||'<p class="hint">Nenhum aluno importado.</p>'; $$('[data-st]').forEach(b=>b.onclick=()=>showStudent(+b.dataset.st));}
function showStudent(i){let s=state.students[i], c=calcStudent(s), l=level(c.p);let desc=c.crit.map(code=>state.descriptors.find(d=>d.codigo==code)).filter(Boolean);$('#studentDetail').innerHTML=`<h3>${s.name}</h3><p><span class="badge ${l[1]}">${l[2]} ${l[0]}</span></p><div class="metricgrid"><div class="card"><span>Acertos</span><b>${c.ac}/${c.total}</b></div><div class="card"><span>Percentual</span><b>${c.p}%</b></div><div class="card"><span>Descritores críticos</span><b>${c.crit.length}</b></div></div><h4>Feedback individual</h4><div class="reportbox">${studentFeedback(s)}</div><h4>Descritores para intervenção</h4>${desc.map(d=>`<details open><summary>${d.codigo} — ${d.texto}</summary><p>${d.explicacao}</p><p><b>Intervenção:</b> ${d.intervencao}</p></details>`).join('')||'<p class="hint">Sem descritores críticos mapeados.</p>'}`}
function studentFeedback(s){let c=calcStudent(s), l=level(c.p);let d=c.crit.slice(0,4).join(', ')||'sem descritor crítico mapeado';return `${s.name} apresentou desempenho ${l[0].toLowerCase()}, com ${c.ac} acertos em ${c.total} questões (${c.p}%). Os descritores que merecem maior atenção são: ${d}. Recomenda-se acompanhamento individualizado, retomada dos conteúdos associados aos erros e nova verificação após intervenção curta.`}
function renderClass(){let el=$('#classReport'); if(!el)return;let stats=descriptorStats(), n=state.students.length,q=state.questions.length;let p=pct(state.students.reduce((a,s)=>a+calcStudent(s).ac,0),n*q);let l=level(p);let qs=state.questions.map((q,i)=>({q,p:pct(state.students.reduce((a,s)=>a+(s.answers[i]||0),0),n)})).sort((a,b)=>a.p-b.p);el.innerHTML=`<div class="cards"><div class="card"><span>Resultado da turma</span><b>${p}%</b><span class="badge ${l[1]}">${l[2]} ${l[0]}</span></div><div class="card"><span>Prioritários</span><b>${state.students.filter(s=>calcStudent(s).p<40).length}</b></div><div class="card"><span>Em desenvolvimento</span><b>${state.students.filter(s=>{let p=calcStudent(s).p;return p>=40&&p<70}).length}</b></div><div class="card"><span>Consolidados</span><b>${state.students.filter(s=>calcStudent(s).p>=70).length}</b></div><div class="card"><span>Itens críticos</span><b>${qs.filter(x=>x.p<40).length}</b></div></div><div class="panel"><h3>Descritores críticos</h3>${stats.slice(0,8).map(d=>`<p><b>${d.d}</b>: ${d.p}% de acertos (${d.qs.join(', ')})</p>`).join('')||'<p class="hint">Mapeie descritores para análise.</p>'}</div>`;renderHeatmap();}
function renderHeatmap(){let el=$('#heatmap'); if(!el)return; el.innerHTML=state.students.map(s=>`<div class="heatrow"><span class="heatname">${s.name}</span>${s.answers.map(v=>`<span class="cell c${v}"></span>`).join('')}</div>`).join('')||'<p class="hint">Importe dados para exibir o mapa.</p>'}
function renderDescriptors(){let el=$('#descriptorList'); if(!el)return;let disc=$('#descriptorDiscipline')?.value||state.meta?.disciplina||'todos', term=($('#descriptorSearch')?.value||'').toLowerCase();let arr=state.descriptors.filter(d=>(disc=='todos'||d.disciplina==disc)&&(`${d.codigo} ${d.texto} ${d.explicacao}`.toLowerCase().includes(term)));el.innerHTML=arr.map(d=>`<details class="desc"><summary>${d.disciplina} • ${d.codigo} — ${d.texto}</summary><p><b>O que avalia:</b> ${d.explicacao}</p><p><b>Intervenção sugerida:</b> ${d.intervencao}</p><p><b>BNCC:</b> ${d.bncc}</p><p><b>Exemplos:</b> ${d.exemplos.join(' | ')}</p></details>`).join('')||'<p class="hint">Nenhum descritor encontrado.</p>'}
function renderTomorrow(){let crit=descriptorStats().filter(d=>d.d!='Sem descritor').slice(0,3), el=$('#tomorrowPlan'); if(!el)return; el.innerHTML=crit.length?`<h3>Prioridades para a próxima aula</h3>${crit.map((d,i)=>{let info=state.descriptors.find(x=>x.codigo==d.d);return `<p><b>${i+1}. ${d.d} — ${d.p}% de acertos.</b><br>${info?info.texto:''}<br><b>Ação:</b> ${info?info.intervencao:'Retomar habilidade com atividade curta e correção comentada.'}</p>`}).join('')}<p><b>Estratégia:</b> 15 min de retomada, 25 min de prática guiada, 20 min de atividade em pares e 10 min de verificação rápida.</p>`:'<p class="hint">Mapeie os descritores para gerar o plano.</p>'}
function renderHistory(){let el=$('#history'); if(!el)return; el.innerHTML=state.history.map((h,i)=>`<div class="panel"><b>${h.date}</b><p>Média: ${h.avg}% • Alunos: ${h.students}</p></div>`).join('')||'<p class="hint">Nenhum diagnóstico salvo.</p>'}
function topStudents(limit=5){return [...state.students].map(s=>({name:s.name,...calcStudent(s)})).sort((a,b)=>b.p-a.p).slice(0,limit)}
function lowStudents(limit=10){return [...state.students].map(s=>({name:s.name,...calcStudent(s)})).sort((a,b)=>a.p-b.p).slice(0,limit)}
function questionStats(){let n=state.students.length;return state.questions.map((q,i)=>({q,descritor:state.map[q]||'Sem descritor',gabarito:state.answerKey?.[q]||'',ac:state.students.reduce((a,s)=>a+(s.answers[i]||0),0),total:n,p:pct(state.students.reduce((a,s)=>a+(s.answers[i]||0),0),n)})).sort((a,b)=>a.p-b.p)}
function performanceBands(){let arr=state.students.map(s=>calcStudent(s).p);return {critico:arr.filter(p=>p<40).length,desenv:arr.filter(p=>p>=40&&p<70).length,consolidado:arr.filter(p=>p>=70).length}}
function reportHeader(title){let total=state.students.length*state.questions.length, ac=state.students.reduce((a,s)=>a+calcStudent(s).ac,0), avg=pct(ac,total);let bands=performanceBands();return `${title}\nETE Professor José Luiz de Mendonça\nSistema Inteligente de Diagnóstico Educacional\nCriado por Felipe Camargo\nVersão 15.0\n\nDisciplina: ${state.meta?.disciplina||'Não informada'}\nData de geração: ${new Date().toLocaleString('pt-BR')}\nAlunos avaliados: ${state.students.length}\nQuestões analisadas: ${state.questions.length}\nTotal de respostas analisadas: ${total}\nMédia geral da turma: ${avg}%\nDistribuição: ${bands.critico} crítico(s), ${bands.desenv} em desenvolvimento, ${bands.consolidado} consolidado(s)\n`;}
function formatDescriptorLine(d){let info=state.descriptors.find(x=>x.codigo==d.d);return `- ${d.d}: ${d.p}% de acertos (${d.ac}/${d.total}) | Questões: ${d.qs.join(', ')}${info?` | ${info.texto}`:''}`}
function formatQuestionLine(q){return `- ${q.q}${q.descritor&&q.descritor!='Sem descritor'?` (${q.descritor})`:''}: ${q.p}% de acertos (${q.ac}/${q.total})${q.gabarito?` | gabarito: ${q.gabarito}`:''}`}
function interventionBlock(){let crit=descriptorStats().filter(d=>d.d!='Sem descritor').slice(0,5);if(!crit.length)return 'Não há descritores mapeados suficientes para sugerir intervenção específica.';return crit.map((d,i)=>{let info=state.descriptors.find(x=>x.codigo==d.d);return `${i+1}. ${d.d} — ${d.p}% de acertos\n   Habilidade: ${info?info.texto:'descritor não localizado na biblioteca'}\n   Ação sugerida: ${info?info.intervencao:'retomada conceitual, atividade guiada e verificação curta.'}\n   Alunos prioritários nesse descritor: ${studentsByDescriptor(d.d).slice(0,12).join(', ')||'não identificado'}`}).join('\n\n')}
function studentsByDescriptor(code){let idx=state.questions.map((q,i)=>state.map[q]===code?i:-1).filter(i=>i>=0);return state.students.filter(s=>idx.some(i=>!s.answers[i])).map(s=>s.name)}
function makeReport(type){
  if(!state.students.length)return 'Nenhum dado importado. Importe uma planilha Excel/CSV ou cole a tabela para gerar relatórios.';
  let avg=pct(state.students.reduce((a,s)=>a+calcStudent(s).ac,0),state.students.length*state.questions.length);
  let desc=descriptorStats(); let crit=desc.filter(d=>d.d!='Sem descritor').slice(0,8); let qs=questionStats(); let bands=performanceBands();
  let best=topStudents(5).map(s=>`- ${s.name}: ${s.ac}/${s.total} (${s.p}%)`).join('\n');
  let attention=lowStudents(12).map(s=>`- ${s.name}: ${s.ac}/${s.total} (${s.p}%) | descritores críticos: ${s.crit.slice(0,5).join(', ')||'não mapeados'}`).join('\n');
  if(type==='familia'){
    return reportHeader('RELATÓRIO INDIVIDUAL PARA FAMÍLIA')+'\n'+state.students.map(s=>{
      let c=calcStudent(s), l=level(c.p), principais=c.crit.slice(0,4).join(', ')||'sem descritor crítico mapeado';
      return `${s.name}\nSituação: ${l[0]} (${c.p}%)\nAcertos: ${c.ac}/${c.total}\nPontos que precisam de apoio: ${principais}\nOrientação: acompanhar a realização das atividades, incentivar revisão dos conteúdos trabalhados em sala e, quando possível, reservar rotina curta de estudo. A escola realizará intervenção pedagógica direcionada aos descritores com maior dificuldade.`
    }).join('\n\n');
  }
  if(type==='conselho'){
    return `${reportHeader('RELATÓRIO PARA CONSELHO DE CLASSE')}\nSÍNTESE PEDAGÓGICA\nA turma apresentou média geral de ${avg}%. Foram identificados ${bands.critico} aluno(s) em situação crítica, ${bands.desenv} em desenvolvimento e ${bands.consolidado} com aprendizagem consolidada.\n\nALUNOS QUE EXIGEM ACOMPANHAMENTO PRIORITÁRIO\n${attention||'Não há alunos cadastrados.'}\n\nDESCRITORES COM MAIOR NECESSIDADE DE INTERVENÇÃO\n${crit.map(formatDescriptorLine).join('\n')||'Não há descritores mapeados.'}\n\nENCAMINHAMENTOS\n- Realizar agrupamento temporário por descritores críticos.\n- Fazer devolutiva individual aos estudantes com menor desempenho.\n- Aplicar atividade curta de retomada e reavaliar os descritores críticos em até duas semanas.\n- Registrar evolução após intervenção para comparação bimestral.`;
  }
  if(type==='coordenacao'){
    return `${reportHeader('RELATÓRIO ANALÍTICO PARA COORDENAÇÃO')}\nINDICADORES GERAIS\nMédia da turma: ${avg}%\nAlunos prioritários: ${bands.critico}\nAlunos em desenvolvimento: ${bands.desenv}\nAlunos consolidados: ${bands.consolidado}\n\nRANKING DE DESCRITORES CRÍTICOS\n${crit.map(formatDescriptorLine).join('\n')||'Não há descritores mapeados.'}\n\nQUESTÕES COM MENOR DESEMPENHO\n${qs.slice(0,10).map(formatQuestionLine).join('\n')}\n\nALUNOS COM MELHOR DESEMPENHO\n${best}\n\nALUNOS PARA BUSCA ATIVA PEDAGÓGICA\n${attention}\n\nPLANO DE INTERVENÇÃO DA COORDENAÇÃO\n${interventionBlock()}\n\nRECOMENDAÇÃO DE GESTÃO\nPlanejar monitoramento semanal dos descritores críticos, acompanhar frequência dos alunos prioritários, orientar professores na elaboração de atividades por habilidade e registrar nova avaliação diagnóstica para medir evolução.`;
  }
  return `${reportHeader('RELATÓRIO GERAL DA TURMA')}\nLEITURA DOS RESULTADOS\nA avaliação indica desempenho médio de ${avg}%. O semáforo pedagógico mostra ${bands.critico} estudante(s) em nível crítico, ${bands.desenv} em desenvolvimento e ${bands.consolidado} consolidado(s).\n\nDESCRITORES MAIS CRÍTICOS\n${crit.map(formatDescriptorLine).join('\n')||'Não há descritores mapeados.'}\n\nQUESTÕES MAIS ERRADAS\n${qs.slice(0,10).map(formatQuestionLine).join('\n')}\n\nPONTOS FORTES DA TURMA\n${desc.filter(d=>d.d!='Sem descritor').sort((a,b)=>b.p-a.p).slice(0,5).map(formatDescriptorLine).join('\n')||'Não há dados suficientes.'}\n\nALUNOS COM MAIOR DESEMPENHO\n${best}\n\nALUNOS QUE NECESSITAM DE APOIO IMEDIATO\n${attention}\n\nO QUE FAZER NAS PRÓXIMAS AULAS\n${interventionBlock()}\n\nSUGESTÃO DE ROTINA\n1. Retomada rápida do descritor mais crítico.\n2. Exercício-modelo resolvido com a turma.\n3. Atividade em duplas por nível de dificuldade.\n4. Correção comentada.\n5. Nova verificação curta com 3 a 5 itens.`;
}
function renderAll(){renderSummary();renderMap();renderStudents();renderClass();renderDescriptors();renderTomorrow();renderHistory();}
function go(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id==id));$$('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view==id));renderAll();}
document.addEventListener('click',e=>{let goid=e.target.dataset.go||e.target.dataset.view;if(goid)go(goid); if(e.target.dataset.report)$('#reportOutput').value=makeReport(e.target.dataset.report)});
$('#processData').onclick=()=>parseData($('#pasteData').value);$('#loadExample').onclick=()=>{$('#pasteData').value='Nome,Q1,Q2,Q3,Q4,Q5,Q6,Q7,Q8\nDescritores,D16,D4,D4,D16,D19,D15,D5,D10\nGabarito,C,C,C,C,C,D,A,B\nAna Silva,C,D,B,B,A,B,A,B\nBruno Souza,E,B,E,B,D,D,B,B\nCarla Lima,C,C,C,D,C,D,A,A\nDiego Costa,B,C,A,C,E,D,C,B';parseData($('#pasteData').value)};
$('#fileInput').onchange=async e=>{let f=e.target.files[0]; if(!f)return; $('#extractStatus').textContent='Arquivo selecionado: '+f.name+'. Clique em Ler arquivo.'; if(/csv|text/.test(f.type)||f.name.match(/\.csv|\.txt$/i)){let t=await f.text();$('#pasteData').value=t;} if(f.name.match(/\.xlsx?$|\.xls$/i)){try{let book=await readExcelFile(f);$('#pasteData').value=aoaToText(book.rows);$('#extractStatus').textContent='Planilha lida: aba '+book.name+'. Confira os dados e clique em Processar, ou clique em Ler arquivo para processar automaticamente.';}catch(err){$('#extractStatus').textContent='Não consegui ler a planilha: '+err.message;}}};
$('#extractFile').onclick=extractSelectedFile;
$('#assessmentDiscipline').onchange=e=>setDiscipline(e.target.value); $('#configDiscipline').onchange=e=>setDiscipline(e.target.value); $('#studentSearch').oninput=renderStudents; $('#descriptorSearch').oninput=renderDescriptors; $('#descriptorDiscipline').onchange=renderDescriptors;
$('#saveSnapshot').onclick=()=>{let avg=pct(state.students.reduce((a,s)=>a+calcStudent(s).ac,0),state.students.length*state.questions.length);state.history.push({date:new Date().toLocaleString('pt-BR'),avg,students:state.students.length});save();renderHistory()};
$('#clearSnapshots').onclick=()=>{if(confirm('Limpar histórico?')){state.history=[];save();renderHistory()}};
$('#clearAll').onclick=()=>{if(confirm('Apagar todos os dados salvos?')){localStorage.removeItem(STORE);location.reload()}};
$('#exportJson').onclick=()=>download('backup-diagnostico-ete.json',JSON.stringify(state,null,2));
$('#importJson').onchange=e=>{let f=e.target.files[0]; if(!f)return; let r=new FileReader(); r.onload=()=>{state=JSON.parse(r.result);save();renderAll()}; r.readAsText(f)};
$('#copyReport').onclick=()=>navigator.clipboard.writeText($('#reportOutput').value||'');$('#downloadReport').onclick=()=>download('relatorio-diagnostico.txt',$('#reportOutput').value||'');
function download(name,text){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
if('serviceWorker' in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});
load();loadDescriptors().then(()=>{syncDisciplineControls();renderAll();});
