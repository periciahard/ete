(function(){
 const A=()=>window.ETE;
 function exportJson(){A().download('backup-ete-v38.json',JSON.stringify(A().state,null,2),'application/json')}
 function exportExcel(){const a=A().state.assessment;const rows=[['Aluno',...a.questions],['Descritores',...a.descriptors],['Gabarito',...a.key],...a.students.map(s=>[s.name,...s.answers])];A().download('avaliacao-ete.xls',A().toTSV(rows),'application/vnd.ms-excel;charset=utf-8');}
 function printReport(text,title='Relatório ETE'){
  const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${A().safe(title)}</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{color:#102a56;border-bottom:4px solid #ffd23f;padding-bottom:10px}pre{white-space:pre-wrap;font-family:Arial,sans-serif;line-height:1.5}.foot{margin-top:28px;font-size:12px;color:#666}</style></head><body><h1>${A().safe(title)}</h1><pre>${A().safe(text||'')}</pre><div class="foot">ETE Professor José Luiz de Mendonça • Criado por Felipe Camargo • Versão 47.0</div><script>window.onload=()=>window.print()<\/script></body></html>`;
  const w=window.open('','_blank'); if(!w){alert('Permita pop-ups para gerar o PDF.');return;} w.document.write(html); w.document.close();
 }
 async function restore(file){const data=JSON.parse(await file.text());A().state={...A().state,...data};A().save();A().renderAll();}
 function bind(){A().$('#exportJson')&&(A().$('#exportJson').onclick=exportJson);A().$('#exportFullBackup')&&(A().$('#exportFullBackup').onclick=exportJson);A().$('#exportExcelBackup')&&(A().$('#exportExcelBackup').onclick=exportExcel);A().$('#importJson')&&(A().$('#importJson').onchange=e=>e.target.files[0]&&restore(e.target.files[0]));A().$('#importFullBackup')&&(A().$('#importFullBackup').onchange=e=>e.target.files[0]&&restore(e.target.files[0]));A().$('#restoreBackup')&&(A().$('#restoreBackup').onclick=()=>A().status('#backupStatus','Escolha um arquivo JSON de backup para restaurar.','work'));}
 window.Exportacao={exportJson,exportExcel,restore,printReport};document.addEventListener('DOMContentLoaded',bind);
})();
