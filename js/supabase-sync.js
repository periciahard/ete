(function(){
  'use strict';
  const A=()=>window.ETE;
  const URL_KEY='ete_supabase_url';
  const ANON_KEY='ete_supabase_anon';
  const Cloud={
    client:null, session:null, profile:null, turmas:[], assessments:[], selectedCloudAssessment:null,
    uiDiscToDb(d){return d==='Matemática'?'matematica':'lingua_portuguesa'},
    dbDiscToUi(d){return d==='matematica'?'Matemática':'Língua Portuguesa'},
    getConfig(){
      const st=A()?.state?.settings||{};
      return {
        url:(st.supabaseUrl||localStorage.getItem(URL_KEY)||'').trim(),
        anon:(st.supabaseAnonKey||localStorage.getItem(ANON_KEY)||'').trim()
      };
    },
    setStatus(msg,type='work'){
      A().status('#cloudStatus',msg,type);
      const mini=A().$('#cloudStatusMini');
      if(mini){mini.textContent= type==='ok' ? 'Nuvem conectada' : 'Modo local'; mini.className='cloud-mini '+(type==='ok'?'ok':'');}
    },
    bind(){
      A().$('#saveSupabaseConfig')&&(A().$('#saveSupabaseConfig').onclick=()=>this.saveConfig());
      A().$('#testSupabaseConfig')&&(A().$('#testSupabaseConfig').onclick=()=>this.testConfig());
      A().$('#cloudLogin')&&(A().$('#cloudLogin').onclick=()=>this.login());
      A().$('#cloudLogout')&&(A().$('#cloudLogout').onclick=()=>this.logout());
      A().$('#cloudRefresh')&&(A().$('#cloudRefresh').onclick=()=>this.loadCloudContext());
      A().$('#cloudSaveAssessment')&&(A().$('#cloudSaveAssessment').onclick=()=>this.saveCurrentAssessment());
      A().$('#cloudLoadAssessments')&&(A().$('#cloudLoadAssessments').onclick=()=>this.listAssessments());
    },
    init(){
      this.bind();
      const cfg=this.getConfig();
      A().$('#supabaseUrl')&&(A().$('#supabaseUrl').value=cfg.url);
      A().$('#supabaseAnonKey')&&(A().$('#supabaseAnonKey').value=cfg.anon);
      if(!cfg.url||!cfg.anon){this.setStatus('Modo local ativo. Configure URL e Anon Key para ativar a nuvem.','work');return;}
      if(!this.initClient())return;
      this.restoreSession();
    },
    initClient(){
      const cfg=this.getConfig();
      if(!window.supabase){this.setStatus('Biblioteca Supabase não carregou. O modo local continua funcionando.', 'error');return false;}
      if(!cfg.url||!cfg.anon){this.setStatus('Supabase não configurado. Informe URL e Anon Key em Configurações.', 'work');return false;}
      try{this.client=window.supabase.createClient(cfg.url,cfg.anon);return true;}
      catch(e){this.setStatus('Erro ao criar cliente Supabase: '+e.message,'error');return false;}
    },
    saveConfig(){
      const url=A().norm(A().$('#supabaseUrl')?.value);
      const anon=A().norm(A().$('#supabaseAnonKey')?.value);
      if(!url||!anon){this.setStatus('Informe URL do Supabase e Anon public key. Não use chave secreta.', 'error');return;}
      if(/secret|service_role/i.test(anon)){this.setStatus('Essa chave parece ser secreta/service role. Não salve chave secreta no site.', 'error');return;}
      A().state.settings.supabaseUrl=url; A().state.settings.supabaseAnonKey=anon; A().save();
      localStorage.setItem(URL_KEY,url); localStorage.setItem(ANON_KEY,anon);
      this.client=null; this.session=null; this.profile=null;
      this.initClient();
      this.setStatus('Configuração salva. Agora faça login institucional.', 'ok');
    },
    async testConfig(){
      this.saveConfig();
      if(!this.client)return;
      try{const {data,error}=await this.client.auth.getSession(); if(error)throw error; this.setStatus('Conexão com Supabase configurada. Faça login para carregar turmas.', 'ok');}
      catch(e){this.setStatus('Falha no teste do Supabase: '+e.message, 'error');}
    },
    async restoreSession(){
      if(!this.client&&!this.initClient())return;
      try{const {data}=await this.client.auth.getSession();this.session=data.session||null;if(this.session)await this.loadCloudContext();else this.setStatus('Modo local ativo. Faça login para sincronizar.', 'work');}
      catch(e){this.setStatus('Não foi possível verificar sessão: '+e.message,'error')}
    },
    async login(){
      if(!this.client&&!this.initClient())return;
      const email=A().$('#cloudEmail')?.value.trim(); const password=A().$('#cloudPassword')?.value;
      if(!email||!password){this.setStatus('Informe e-mail e senha cadastrados no Supabase.','error');return;}
      this.setStatus('Entrando...', 'work');
      const {data,error}=await this.client.auth.signInWithPassword({email,password});
      if(error){this.setStatus('Erro no login: '+error.message,'error');return;}
      this.session=data.session; await this.loadCloudContext();
    },
    async logout(){
      if(this.client)await this.client.auth.signOut();
      this.session=null; this.profile=null; this.turmas=[]; this.assessments=[];
      const turma=A().$('#cloudTurma'); if(turma)turma.innerHTML='<option value="">Faça login para carregar turmas</option>';
      const list=A().$('#cloudAssessmentsList'); if(list)list.innerHTML='';
      const user=A().$('#cloudUserBox'); if(user)user.innerHTML='';
      const dash=A().$('#cloudCoordDashboard'); if(dash)dash.innerHTML='';
      this.setStatus('Saiu da nuvem. Modo local ativo.', 'work');
    },
    async loadCloudContext(){
      if(!this.client&&!this.initClient())return;
      if(!this.session){const {data}=await this.client.auth.getSession();this.session=data.session||null;}
      if(!this.session){this.setStatus('Faça login para carregar turmas e avaliações.','work');return;}
      const uid=this.session.user.id;
      const {data:profile,error:pErr}=await this.client.from('perfis').select('*').eq('id',uid).maybeSingle();
      if(pErr){this.setStatus('Erro ao buscar perfil: '+pErr.message,'error');return;}
      if(!profile){this.setStatus('Usuário autenticado, mas sem perfil cadastrado na tabela perfis. Cadastre o e-mail e o UUID no Supabase.','error');return;}
      this.profile=profile; await this.loadTurmas(); this.renderUserBox(); this.setStatus(`Conectado como ${profile.nome} (${profile.perfil}).`, 'ok'); await this.listAssessments(false);
    },
    async loadTurmas(){
      if(this.profile?.perfil==='coordenador'){
        const {data,error}=await this.client.from('turmas').select('*').eq('ativo',true).order('nome');
        if(error){this.setStatus('Erro ao carregar turmas: '+error.message,'error');return;}
        this.turmas=(data||[]).map(t=>({turma:t,disciplina:null,permissao:'gerenciar'}));
      }else{
        const {data,error}=await this.client.from('professor_turma').select('id,disciplina,permissao,turmas(id,nome,serie,turno)').eq('professor_id',this.profile.id).order('disciplina');
        if(error){this.setStatus('Erro ao carregar vínculos: '+error.message,'error');return;}
        this.turmas=(data||[]).map(x=>({turma:x.turmas,disciplina:x.disciplina,permissao:x.permissao}));
      }
      this.renderTurmas();
    },
    renderUserBox(){
      const box=A().$('#cloudUserBox'); if(!box)return;
      const vinc=this.profile.perfil==='coordenador'?'Acesso de coordenação: visualiza tudo e gerencia a escola.':`${this.turmas.length} vínculo(s) professor–turma–disciplina carregado(s).`;
      box.innerHTML=`<div class="cloud-card"><b>${A().safe(this.profile.nome)}</b><br><span>${A().safe(this.profile.email)}</span><br><span class="badge ok">${A().safe(this.profile.perfil)}</span><p class="hint">${vinc}</p></div>`;
    },
    renderTurmas(){
      const sel=A().$('#cloudTurma'); if(!sel)return;
      if(!this.turmas.length){sel.innerHTML='<option value="">Nenhuma turma vinculada</option>';return;}
      sel.innerHTML='<option value="">Selecione a turma</option>'+this.turmas.map((x,i)=>{const label=this.profile.perfil==='coordenador'?`${x.turma.nome} — coordenação`:`${x.turma.nome} — ${this.dbDiscToUi(x.disciplina)} (${x.permissao})`;return `<option value="${i}">${A().safe(label)}</option>`;}).join('');
    },
    selectedTurmaLink(){const idx=Number(A().$('#cloudTurma')?.value);if(Number.isNaN(idx)||idx<0)return null;return this.turmas[idx]||null;},
    async saveCurrentAssessment(){
      if(!this.profile){this.setStatus('Faça login antes de salvar na nuvem.','error');return;}
      const link=this.selectedTurmaLink(); if(!link){this.setStatus('Selecione uma turma vinculada.','error');return;}
      A().syncMetaFromInputs?.(); const a=A().state.assessment;
      if(!a.questions?.length||!a.students?.length){this.setStatus('Importe e analise uma avaliação antes de salvar.','error');return;}
      const dbDisc=this.profile.perfil==='coordenador'?this.uiDiscToDb(a.discipline):link.disciplina;
      if(this.profile.perfil!=='coordenador'&&dbDisc!==this.uiDiscToDb(a.discipline)){this.setStatus('A disciplina da avaliação não corresponde ao vínculo selecionado. Ajuste a disciplina ou escolha outro vínculo.','error');return;}
      const titulo=A().norm(A().$('#cloudAssessmentTitle')?.value)||a.title||'Avaliação';
      const tipo=A().$('#cloudAssessmentType')?.value||a.tipo||'diagnostica';
      const data_avaliacao=A().$('#cloudAssessmentDate')?.value||a.date||new Date().toISOString().slice(0,10);
      this.setStatus('Salvando avaliação na nuvem...', 'work');
      const payload={turma_id:link.turma.id,professor_id:this.profile.id,disciplina:dbDisc,titulo,tipo,data_avaliacao,questoes:a.questions,descritores:a.descriptors,gabarito:a.key};
      const {data:av,error:avErr}=await this.client.from('avaliacoes').insert(payload).select().single();
      if(avErr){this.setStatus('Erro ao salvar avaliação: '+avErr.message,'error');return;}
      const r=A().getResults();
      const rows=r.students.map(s=>{const weak={};s.correct.forEach((c,i)=>{if(!c){const d=a.descriptors[i]||'Sem descritor';weak[d]=(weak[d]||0)+1;}});const crit=Object.entries(weak).sort((x,y)=>y[1]-x[1]).slice(0,5).map(([d,n])=>({descritor:d,erros:n}));return {avaliacao_id:av.id,aluno_nome:s.name,respostas:s.answers||[],acertos:s.total,total:r.summary.nQuestions,percentual:s.percent,descritores_criticos:crit,relatorio_individual:window.Relatorios?.individual(s.index)||null,mapa_da_mina:null,ficha_exercicios:null};});
      const {error:resErr}=await this.client.from('resultados_alunos').insert(rows);
      if(resErr){this.setStatus('Avaliação salva, mas houve erro nos resultados: '+resErr.message,'error');return;}
      this.setStatus('Avaliação e resultados salvos na nuvem com sucesso.', 'ok'); await this.listAssessments(false);
    },
    async listAssessments(showStatus=true){
      if(!this.profile){if(showStatus)this.setStatus('Faça login para listar avaliações.','error');return;}
      if(showStatus)this.setStatus('Carregando avaliações visíveis...', 'work');
      const {data,error}=await this.client.from('avaliacoes').select('id,titulo,tipo,disciplina,data_avaliacao,criado_em,professor_id,questoes,descritores,gabarito,turmas(nome),perfis(nome,email)').order('criado_em',{ascending:false}).limit(200);
      if(error){this.setStatus('Erro ao listar avaliações: '+error.message,'error');return;}
      this.assessments=data||[]; this.renderAssessments(); this.renderCoordCloudDashboard(); if(showStatus)this.setStatus(`${this.assessments.length} avaliação(ões) visível(is) carregada(s).`, 'ok');
    },
    renderAssessments(){
      const box=A().$('#cloudAssessmentsList'); if(!box)return;
      if(!this.assessments.length){box.innerHTML='<p class="hint">Nenhuma avaliação visível encontrada.</p>';return;}
      box.innerHTML=this.assessments.map(av=>{const canEdit=this.profile?.perfil==='coordenador'||av.professor_id===this.profile?.id;return `<div class="cloud-assessment"><div><b>${A().safe(av.titulo)}</b><br><small>${A().safe(av.turmas?.nome||'-')} • ${A().safe(this.dbDiscToUi(av.disciplina))} • ${A().safe(av.perfis?.nome||'Professor')}</small><br><small>${A().safe(av.data_avaliacao||'sem data')} • ${new Date(av.criado_em).toLocaleString('pt-BR')} • ${canEdit?'Você pode editar seus próprios dados':'Visualização somente leitura'}</small></div><button data-cloud-load="${av.id}">Carregar</button></div>`;}).join('');
      box.querySelectorAll('[data-cloud-load]').forEach(btn=>btn.onclick=()=>this.loadAssessment(btn.dataset.cloudLoad));
    },
    renderCoordCloudDashboard(){
      const box=A().$('#cloudCoordDashboard'); if(!box)return;
      if(!this.profile){box.innerHTML='<h3>Painel institucional</h3><p class="hint">Faça login para visualizar dados salvos na nuvem.</p>';return;}
      const byTurma={}, byDisc={}, byProf={};
      this.assessments.forEach(av=>{const turma=av.turmas?.nome||'Sem turma'; const disc=this.dbDiscToUi(av.disciplina); const prof=av.perfis?.nome||'Professor'; byTurma[turma]=(byTurma[turma]||0)+1; byDisc[disc]=(byDisc[disc]||0)+1; byProf[prof]=(byProf[prof]||0)+1;});
      const list=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<li>${A().safe(k)} — ${v} avaliação(ões)</li>`).join('')||'<li>Nenhum dado</li>';
      box.innerHTML=`<h3>Painel institucional da nuvem</h3><p class="hint">Leitura das avaliações salvas no Supabase. Para médias e descritores críticos, carregue a avaliação desejada ou gere relatórios locais após importar.</p><div class="cards"><div class="card"><span>Avaliações visíveis</span><b>${this.assessments.length}</b></div><div class="card"><span>Turmas com dados</span><b>${Object.keys(byTurma).length}</b></div><div class="card"><span>Professores</span><b>${Object.keys(byProf).length}</b></div><div class="card"><span>Disciplinas</span><b>${Object.keys(byDisc).length}</b></div></div><div class="grid3"><div><h4>Turmas</h4><ul>${list(byTurma)}</ul></div><div><h4>Disciplinas</h4><ul>${list(byDisc)}</ul></div><div><h4>Professores</h4><ul>${list(byProf)}</ul></div></div>`;
    },
    async loadAssessment(id){
      const av=this.assessments.find(x=>x.id===id); if(!av){this.setStatus('Avaliação não encontrada na lista.','error');return;}
      this.setStatus('Carregando avaliação da nuvem...', 'work');
      const {data:rows,error}=await this.client.from('resultados_alunos').select('*').eq('avaliacao_id',id).order('aluno_nome');
      if(error){this.setStatus('Erro ao carregar resultados: '+error.message,'error');return;}
      A().setAssessment({title:av.titulo,turma:av.turmas?.nome||'',tipo:av.tipo||'diagnostica',date:av.data_avaliacao||'',discipline:this.dbDiscToUi(av.disciplina),questions:av.questoes||[],descriptors:av.descritores||[],key:av.gabarito||[],students:(rows||[]).map(r=>({name:r.aluno_nome,answers:r.respostas||[]}))});
      A().fillMetaInputs?.();
      A().$('#assessmentDiscipline')&&(A().$('#assessmentDiscipline').value=this.dbDiscToUi(av.disciplina)); A().$('#configDiscipline')&&(A().$('#configDiscipline').value=this.dbDiscToUi(av.disciplina));
      this.selectedCloudAssessment=av; const readOnly=!(this.profile?.perfil==='coordenador'||av.professor_id===this.profile?.id);
      this.setStatus(`Avaliação carregada da nuvem. ${readOnly?'Você está em modo somente leitura para estes dados.':'Você pode trabalhar com estes dados.'}`, 'ok'); A().showView('diagnostico');
    }
  };
  window.ETESupabase=Cloud;
  document.addEventListener('DOMContentLoaded',()=>Cloud.init());
})();
