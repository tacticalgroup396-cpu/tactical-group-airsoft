(()=>{
  const path=location.pathname.replace(/\/+$/,'')||'/';
  if(path!=='/comandante/jogos')return;
  if(window.__tgaCommanderGamesV6)return;window.__tgaCommanderGamesV6=true;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=d=>{if(!d)return'';const m=String(d).slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:String(d)};
  const tm=t=>t?String(t).slice(0,5):'';
  const rankOrder=['Recruta','Soldado','Cabo','3º Sargento','2º Sargento','1º Sargento','Subtenente','Aspirante','Tenente','Capitão','Major','Tenente-Coronel','Coronel'];
  const toast=m=>{if(typeof window.toast==='function')return window.toast(m);const x=document.createElement('div');x.className='toast';x.textContent=m;document.body.appendChild(x);setTimeout(()=>x.remove(),3500)};
  const json=async(url,opts={})=>{const r=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Erro ao carregar.');return d};
  const post=(url,body)=>json(url,{method:'POST',body:JSON.stringify(body)});
  const api=(action,body)=>body===undefined?json('/api/index.js?action='+encodeURIComponent(action)):post('/api/index.js?action='+encodeURIComponent(action),body);
  const mission=(action,body)=>body===undefined?json('/api/mission?action='+encodeURIComponent(action)):post('/api/mission?action='+encodeURIComponent(action),body);
  const visitor=(action,body,query='')=>body===undefined?json('/api/visitor-admin?action='+encodeURIComponent(action)+query):post('/api/visitor-admin?action='+encodeURIComponent(action),body);

  let host=null,fields=[],games=[],selectedId='',current=null,visitors=[],booting=false;

  function fieldOptions(){
    return '<option value="">Selecione o campo</option>'+fields.map(f=>`<option value="${esc(f.id)}">${esc(f.name)}${f.address?' — '+esc(f.address):''}</option>`).join('');
  }
  async function loadFields(){
    const d=await api('fields');
    fields=Array.isArray(d.fields)?d.fields:[];
    return fields;
  }
  function fieldCards(){
    if(!fields.length)return '<div class="cmdGamesV6FieldEmpty">Nenhum campo cadastrado. Cadastre o primeiro campo ao lado.</div>';
    return fields.map(f=>`<article class="cmdGamesV6FieldCard" data-field-card="${esc(f.id)}">
      <div class="cmdGamesV6FieldIcon">⌖</div>
      <div class="cmdGamesV6FieldInfo"><b>${esc(f.name)}</b><small>${esc(f.address||'Endereço não informado')}</small>${f.notes?`<p>${esc(f.notes)}</p>`:''}</div>
      <div class="cmdGamesV6FieldActions">${f.maps_url?`<a href="${esc(f.maps_url)}" target="_blank" rel="noopener">ABRIR MAPS</a>`:''}<button type="button" data-delete-field-v6="${esc(f.id)}">EXCLUIR</button></div>
    </article>`).join('');
  }
  function refreshFields(selected=''){
    const select=host?.querySelector('#cmdGamesV6Form [name="field_id"]');
    if(select){
      const keep=selected||select.value;
      select.innerHTML=fieldOptions();
      if(keep&&fields.some(f=>String(f.id)===String(keep)))select.value=keep;
    }
    const list=host?.querySelector('#cmdGamesV6FieldList');
    if(list)list.innerHTML=fieldCards();
    bindFieldDelete();
  }
  function codePreview(){
    const y=new Date().getFullYear();
    return `OP-${y}-NOVA`;
  }
  function render(){
    document.body.classList.add('commander-games-v6-mode');
    host=document.getElementById('commanderGamesV6Host');if(!host)return false;
    host.innerHTML=`<div class="cmdGamesV6Shell">
      <section class="cmdGamesV6Panel cmdGamesV6Create">
        <div class="cmdGamesV6Kicker">PLANEJAMENTO DE OPERAÇÕES</div>
        <h1>CRIAR NOVO JOGO & BRIEFING DE MISSÃO</h1>
        <form id="cmdGamesV6Form">
          <div class="cmdGamesV6Grid two">
            <label><span>CÓDIGO OP</span><input value="${codePreview()}" readonly></label>
            <label><span>NOME DA OPERAÇÃO / JOGO *</span><input name="title" required placeholder="Ex.: OPERAÇÃO TROVÃO NEGRO"></label>
          </div>
          <div class="cmdGamesV6Grid two">
            <label><span>CAMPO DE AIRSOFT *</span><select name="field_id" required>${fieldOptions()}</select></label>
            <label><span>DATA DO JOGO *</span><input name="game_date" type="date" required></label>
          </div>
          <div class="cmdGamesV6Grid two">
            <label><span>HORÁRIO DA OPERAÇÃO</span><input name="game_time" type="time"></label>
            <label><span>PRAZO DE CONFIRMAÇÃO</span><div class="cmdGamesV6Inline"><input name="rsvp_deadline_date" type="date"><input name="rsvp_deadline_time" type="time"></div></label>
          </div>
          <div class="cmdGamesV6Grid two">
            <label><span>MODALIDADE TÁTICA</span><select name="description"><option value="">Selecionar modalidade</option><option>Dominação & CQB Tático</option><option>MilSim</option><option>Resgate / Extração</option><option>Defesa de Base</option><option>Capture the Flag</option><option>Operação Livre</option></select></label>
            <label><span>EFETIVO MÍNIMO / MÁXIMO</span><div class="cmdGamesV6Inline"><input name="min_players" type="number" min="1" value="4"><input name="max_players" type="number" min="1" placeholder="Sem limite"></div></label>
          </div>
          <label><span>BRIEFING DA MISSÃO — OBJETIVO PRIMÁRIO *</span><textarea name="briefing" required placeholder="Descreva a missão principal, objetivos e condição de vitória..."></textarea></label>
          <label><span>REGRAS DE CAMPO / LIMITES FPS, JOULE, RESPAWN E OBSERVAÇÕES</span><textarea name="notes" placeholder="Ex.: Assault 400 FPS | DMR 450 FPS | regras de respawn..."></textarea></label>
          <div class="cmdGamesV6Grid two compact">
            <label><span>ELO POR PARTICIPAÇÃO</span><input name="elo_reward" type="number" min="1" value="1"></label>
            <input type="hidden" name="status" value="confirmado">
          </div>
          <button class="cmdGamesV6Primary" type="submit">＋ PUBLICAR JOGO & CONVOCAR OPERADORES</button>
        </form>
        <p class="cmdGamesV6Hint">Cadastre e gerencie os campos logo abaixo. O campo selecionado será vinculado à operação.</p>
      </section>

      <section class="cmdGamesV6Panel cmdGamesV6Balancer">
        <div class="cmdGamesV6Kicker green">BALANCEADOR AUTOMÁTICO DE ESQUADRÕES</div>
        <h1>SORTEAR TIME A (ALPHA) E TIME B (BRAVO)</h1>
        <select id="cmdGamesV6GameSelect" class="cmdGamesV6GameSelect"><option value="">Carregando operações...</option></select>
        <div id="cmdGamesV6Mission"><div class="cmdGamesV6Empty">Selecione uma operação para carregar os confirmados.</div></div>
      </section>

      <section class="cmdGamesV6Panel cmdGamesV6FieldsPanel">
        <div class="cmdGamesV6FieldsHead">
          <div><div class="cmdGamesV6Kicker">LOGÍSTICA DE OPERAÇÃO</div><h1>CAMPOS DE AIRSOFT</h1><p>Cadastre os locais usados nas operações e mantenha o acesso ao Maps junto da criação dos jogos.</p></div>
          <span>${fields.length} CAMPO${fields.length===1?'':'S'} ATIVO${fields.length===1?'':'S'}</span>
        </div>
        <div class="cmdGamesV6FieldsLayout">
          <form id="cmdGamesV6FieldForm" class="cmdGamesV6FieldForm">
            <div class="cmdGamesV6FieldFormTitle"><b>＋ CADASTRAR NOVO CAMPO</b><small>O campo ficará disponível imediatamente no seletor de criação de jogo.</small></div>
            <label><span>NOME DO CAMPO *</span><input name="name" required placeholder="Ex.: Campo Cidade Nova"></label>
            <label><span>ENDEREÇO / REFERÊNCIA</span><input name="address" placeholder="Rua, bairro, cidade ou ponto de referência"></label>
            <label><span>LINK DO GOOGLE MAPS *</span><input name="maps_url" type="url" required placeholder="https://maps.google.com/..."></label>
            <label><span>OBSERVAÇÕES DO CAMPO</span><textarea name="notes" placeholder="Regras locais, estacionamento, estrutura, observações..."></textarea></label>
            <button class="cmdGamesV6Primary" type="submit">＋ SALVAR CAMPO</button>
          </form>
          <div class="cmdGamesV6FieldListWrap">
            <div class="cmdGamesV6FieldListTitle"><b>CAMPOS CADASTRADOS</b><small>Use o Maps para conferir a localização antes de publicar a operação.</small></div>
            <div id="cmdGamesV6FieldList" class="cmdGamesV6FieldList">${fieldCards()}</div>
          </div>
        </div>
      </section>
    </div>`;
    bindCreate();
    bindFieldManager();
    loadGames();
    return true;
  }

  function bindCreate(){
    const form=host.querySelector('#cmdGamesV6Form');if(!form)return;
    const field=form.elements.field_id;
    form.onsubmit=async e=>{
      e.preventDefault();const btn=e.submitter;btn.disabled=true;const old=btn.textContent;btn.textContent='PUBLICANDO OPERAÇÃO...';
      try{
        const data=Object.fromEntries(new FormData(form));
        if(data.rsvp_deadline_date&&!data.rsvp_deadline_time)data.rsvp_deadline_time='23:59';
        const r=await api('create-game',data);
        toast('Jogo publicado e operadores convocados.');
        form.reset();form.elements.min_players.value='4';form.elements.elo_reward.value='1';
        await loadGames(r.game?.id||'');
      }catch(err){toast(err.message)}finally{btn.disabled=false;btn.textContent=old}
    };
    field?.addEventListener('change',()=>{
      const f=fields.find(x=>String(x.id)===String(field.value));
      if(f?.address)field.title=f.address;
    });
  }

  function bindFieldDelete(){
    host?.querySelectorAll('[data-delete-field-v6]').forEach(btn=>{
      if(btn.dataset.bound==='1')return;btn.dataset.bound='1';
      btn.onclick=async()=>{
        const id=btn.dataset.deleteFieldV6;
        const f=fields.find(x=>String(x.id)===String(id));
        if(!confirm(`Excluir o campo "${f?.name||'selecionado'}"?`))return;
        btn.disabled=true;
        try{
          await api('delete-field',{id});
          fields=fields.filter(x=>String(x.id)!==String(id));
          refreshFields();
          toast('Campo removido.');
        }catch(e){toast(e.message);btn.disabled=false}
      };
    });
  }

  function bindFieldManager(){
    const form=host?.querySelector('#cmdGamesV6FieldForm');if(!form)return;
    bindFieldDelete();
    form.onsubmit=async e=>{
      e.preventDefault();
      const btn=e.submitter||form.querySelector('button[type="submit"]');
      const old=btn.textContent;btn.disabled=true;btn.textContent='SALVANDO CAMPO...';
      try{
        const data=Object.fromEntries(new FormData(form));
        const r=await api('create-field',data);
        if(r.field){
          fields=[...fields.filter(x=>String(x.id)!==String(r.field.id)),r.field].sort((a,b)=>String(a.name).localeCompare(String(b.name),'pt-BR'));
          refreshFields(r.field.id);
        }
        form.reset();
        toast('Campo cadastrado e disponível para o novo jogo.');
      }catch(err){toast(err.message)}finally{btn.disabled=false;btn.textContent=old}
    };
  }

  async function loadGames(forceId=''){
    const select=host?.querySelector('#cmdGamesV6GameSelect');if(!select)return;
    try{
      const d=await mission('games');games=d.games||[];
      const queryId=new URLSearchParams(location.search).get('game')||'';
      const wanted=forceId||queryId||selectedId||games[0]?.id||'';
      select.innerHTML='<option value="">Selecione a operação ativa</option>'+games.map(g=>`<option value="${esc(g.id)}" ${String(g.id)===String(wanted)?'selected':''}>${esc(g.title)} — ${fmt(g.game_date)} (${Number(g.going_count||0)} vão)</option>`).join('');
      select.onchange=()=>{selectedId=select.value;if(selectedId){history.replaceState(null,'','/comandante/jogos?game='+encodeURIComponent(selectedId));loadSelected()}else host.querySelector('#cmdGamesV6Mission').innerHTML='<div class="cmdGamesV6Empty">Selecione uma operação.</div>'};
      selectedId=wanted;
      if(selectedId)await loadSelected();
      else host.querySelector('#cmdGamesV6Mission').innerHTML='<div class="cmdGamesV6Empty">Nenhuma operação ativa cadastrada.</div>';
    }catch(e){select.innerHTML='<option>Erro ao carregar jogos</option>';host.querySelector('#cmdGamesV6Mission').innerHTML=`<div class="cmdGamesV6Empty error">${esc(e.message)}</div>`}
  }

  async function loadSelected(){
    const box=host?.querySelector('#cmdGamesV6Mission');if(!box||!selectedId)return;
    box.innerHTML='<div class="cmdGamesV6Empty">CARREGANDO EFETIVO...</div>';
    try{
      current=await json('/api/mission?action=get&game_id='+encodeURIComponent(selectedId));
      const vd=await visitor('game-visitors',undefined,'&game_id='+encodeURIComponent(selectedId)).catch(()=>({visitors:[]}));
      visitors=vd.visitors||[];
      renderMission();
    }catch(e){box.innerHTML=`<div class="cmdGamesV6Empty error">${esc(e.message)}</div>`}
  }

  function memberRow(o,isVisitor=false){
    const name=isVisitor?(o.nickname||o.name||'Visitante'):(o.nickname||o.name||'Operador');
    const role=isVisitor?'Visitante':(o.function||o.mission_role||'Operador');
    const attendance=isVisitor?'':`<button type="button" class="cmdGamesV6Attendance ${o.present?'present':''}" data-attendance="${esc(o.id)}" data-present="${o.present?'1':'0'}">${o.present?'PRESENTE':'CONFIRMAR PRESENÇA'}</button>`;
    return `<div class="cmdGamesV6Member ${isVisitor?'visitor':''}"><span class="cmdGamesV6Badge">◆</span><div><b>@${esc(name)}</b><small>${esc(isVisitor?'VISITANTE':(o.rank||'Operador'))}</small></div><em>${esc(role)}</em>${attendance}</div>`;
  }

  function rsvpMemberRow(o,state){
    const name=o.nickname||o.name||'Operador';
    const label=state==='going'?'VAI':state==='not_going'?'NÃO VAI':'PENDENTE';
    const photo=o.photo_url?`<img src="${esc(o.photo_url)}" alt="" loading="lazy" decoding="async">`:`<span class="cmdGamesV6RsvpAvatar">${esc(String(name).slice(0,2).toUpperCase())}</span>`;
    return `<div class="cmdGamesV6RsvpMember ${state}">${photo}<div><b>@${esc(name)}</b><small>${esc(o.rank||'Operador')} • ${esc(o.function||'Operador')}</small></div><em>${label}</em></div>`;
  }

  function renderMission(){
    const box=host.querySelector('#cmdGamesV6Mission'),g=current.game,m=current.mission||{},people=current.people||[],roster=current.roster||[];
    const goingVisitors=visitors.filter(v=>v.response==='going');
    const goingOps=roster.filter(x=>['going','attended'].includes(x.response));
    const noOps=roster.filter(x=>x.response==='not_going');
    const pendingOps=roster.filter(x=>!['going','attended','not_going'].includes(x.response));
    const aOps=people.filter(x=>x.team_code==='A'),bOps=people.filter(x=>x.team_code==='B');
    const aVis=goingVisitors.filter(x=>x.team_code==='A'),bVis=goingVisitors.filter(x=>x.team_code==='B');
    const total=people.length+goingVisitors.length;
    box.innerHTML=`<article class="cmdGamesV6Selected">
      <div><div class="cmdGamesV6Kicker">OPERAÇÃO ATIVA</div><h2>${esc(g.title)}</h2><p>${esc(g.location||'Campo não informado')} • ${fmt(g.game_date)}${g.game_time?' • '+tm(g.game_time):''}</p></div>
      <span>${total} CONFIRMADO${total===1?'':'S'}</span>
    </article>
    <section class="cmdGamesV6RsvpBoard">
      <div class="cmdGamesV6RsvpHead"><div><span>EFETIVO CONVOCADO</span><b>RESPOSTAS DOS OPERADORES</b></div><small>${roster.length} OPERADORES ATIVOS</small></div>
      <div class="cmdGamesV6RsvpGrid">
        <div class="cmdGamesV6RsvpCol going"><header><b>✓ VÃO</b><span>${goingOps.length}</span></header><div>${goingOps.map(o=>rsvpMemberRow(o,'going')).join('')||'<p>Nenhum operador confirmou.</p>'}</div></div>
        <div class="cmdGamesV6RsvpCol notgoing"><header><b>× NÃO VÃO</b><span>${noOps.length}</span></header><div>${noOps.map(o=>rsvpMemberRow(o,'not_going')).join('')||'<p>Nenhum operador recusou.</p>'}</div></div>
        <div class="cmdGamesV6RsvpCol pending"><header><b>… PENDENTES</b><span>${pendingOps.length}</span></header><div>${pendingOps.map(o=>rsvpMemberRow(o,'pending')).join('')||'<p>Ninguém pendente.</p>'}</div></div>
      </div>
    </section>
    <div class="cmdGamesV6Actions">
      <button type="button" class="cmdGamesV6Primary small" id="cmdGamesV6Balance">⬡ BALANCEAR POR PATENTE</button>
      <button type="button" class="cmdGamesV6Secondary" id="cmdGamesV6Random">⤨ SORTEIO ALEATÓRIO A/B</button>
    </div>
    <div class="cmdGamesV6Teams">
      <section class="cmdGamesV6Team alpha"><div class="cmdGamesV6TeamHead"><div><h3>TIME ALPHA <span>(FITA AMARELA)</span></h3><small>${esc(m.team_a_name||'Time A')}</small></div><b>${aOps.length+aVis.length} OPS</b></div><div class="cmdGamesV6Members">${[...aOps.map(x=>memberRow(x)),...aVis.map(x=>memberRow(x,true))].join('')||'<p class="cmdGamesV6NoTeam">Aguardando sorteio.</p>'}</div></section>
      <section class="cmdGamesV6Team bravo"><div class="cmdGamesV6TeamHead"><div><h3>TIME BRAVO <span>(FITA VERMELHA)</span></h3><small>${esc(m.team_b_name||'Time B')}</small></div><b>${bOps.length+bVis.length} OPS</b></div><div class="cmdGamesV6Members">${[...bOps.map(x=>memberRow(x)),...bVis.map(x=>memberRow(x,true))].join('')||'<p class="cmdGamesV6NoTeam">Aguardando sorteio.</p>'}</div></section>
    </div>
    <section class="cmdGamesV6Finalize">
      <div><b>ENCERRAR OPERAÇÃO & GERAR RELATÓRIO FINAL</b><small>O resultado usa as presenças confirmadas e as regras de Elo da missão.</small></div>
      <div><button type="button" id="cmdGamesV6WinA" class="cmdGamesV6Win alpha">🏆 VITÓRIA ALPHA</button><button type="button" id="cmdGamesV6WinB" class="cmdGamesV6Win bravo">🏆 VITÓRIA BRAVO</button></div>
    </section>`;
    box.querySelector('#cmdGamesV6Balance').onclick=balanceByRank;
    box.querySelector('#cmdGamesV6Random').onclick=randomDraw;
    box.querySelector('#cmdGamesV6WinA').onclick=()=>finalize('A');
    box.querySelector('#cmdGamesV6WinB').onclick=()=>finalize('B');
    box.querySelectorAll('[data-attendance]').forEach(b=>b.onclick=()=>setAttendance(b));
  }

  function missionPayload(members){
    const m=current.mission||{};
    return {
      game_id:selectedId,
      team_a_name:m.team_a_name||'Time Alpha',
      team_b_name:m.team_b_name||'Time Bravo',
      mission_objective:m.mission_objective||'',
      mission_rules:m.mission_rules||'',
      respawn_rules:m.respawn_rules||'',
      mission_duration:m.mission_duration||'',
      secondary_objectives:m.secondary_objectives||'',
      total_rounds:Number(m.total_rounds)||1,
      round_win_elo:Number(m.round_win_elo)||0,
      winner_elo:Number(m.winner_elo)||0,
      loser_penalty:Number(m.loser_penalty)||0,
      absence_penalty:Number(m.absence_penalty)||0,
      no_response_penalty:Number(m.no_response_penalty)||0,
      members
    };
  }

  async function drawVisitors(){
    try{return await visitor('draw-visitors',{game_id:selectedId})}catch(e){if(!/Nenhum visitante marcou Vou/i.test(e.message))throw e;return {count:0}}
  }

  async function balanceByRank(){
    const people=[...(current.people||[])];if(people.length<2)return toast('É preciso ter pelo menos 2 operadores marcados como Vou.');
    const btn=host.querySelector('#cmdGamesV6Balance');btn.disabled=true;
    try{
      const sorted=people.sort((a,b)=>rankOrder.indexOf(b.rank)-rankOrder.indexOf(a.rank)||String(a.nickname).localeCompare(String(b.nickname)));
      let scoreA=0,scoreB=0,countA=0,countB=0;
      const members=sorted.map(o=>{
        const score=Math.max(1,rankOrder.indexOf(o.rank)+1);let team;
        if(countA<countB)team='A';else if(countB<countA)team='B';else team=scoreA<=scoreB?'A':'B';
        if(team==='A'){scoreA+=score;countA++}else{scoreB+=score;countB++}
        return {operator_id:o.id,team_code:team,mission_role:o.mission_role||'operator',kills:Number(o.kills)||0,deaths:Number(o.deaths)||0};
      });
      await mission('save',missionPayload(members));await drawVisitors();toast('Times balanceados por patente.');await loadSelected();
    }catch(e){toast(e.message)}finally{btn.disabled=false}
  }

  async function randomDraw(){
    const btn=host.querySelector('#cmdGamesV6Random');btn.disabled=true;
    try{await mission('draw-teams',{game_id:selectedId});await drawVisitors();toast('Sorteio A/B concluído com operadores e visitantes.');await loadSelected()}catch(e){toast(e.message)}finally{btn.disabled=false}
  }

  async function setAttendance(btn){
    const present=btn.dataset.present!=='1';btn.disabled=true;
    try{await mission('attendance',{game_id:selectedId,operator_id:btn.dataset.attendance,present});toast(present?'Presença confirmada.':'Presença desmarcada.');await loadSelected()}catch(e){toast(e.message)}finally{btn.disabled=false}
  }

  async function finalize(team){
    const m=current.mission||{},rounds=Math.max(1,Number(m.total_rounds)||1);
    const label=team==='A'?'ALPHA':'BRAVO';
    if(!confirm(`Encerrar a operação com vitória do Time ${label}?\n\nSomente operadores com presença confirmada receberão as recompensas de presença/vitória.`))return;
    try{
      await mission('finalize',{game_id:selectedId,team_a_wins:team==='A'?rounds:0,team_b_wins:team==='B'?rounds:0});
      toast('Operação encerrada e relatório gerado.');location.assign('/comandante/historico');
    }catch(e){toast(e.message)}
  }

  async function boot(){
    if(booting)return false;
    const h=document.getElementById('commanderGamesV6Host');if(!h)return false;
    booting=true;host=h;
    host.innerHTML='<div class="cmdGamesV6Loading">PREPARANDO CENTRAL DE OPERAÇÕES...</div>';
    try{await loadFields()}catch(e){fields=[];toast('Não foi possível carregar os campos: '+e.message)}
    render();
    booting=false;
    return true;
  }

  const obs=new MutationObserver(()=>{if(!host||!document.documentElement.contains(host))boot()});
  obs.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  window.addEventListener('tga:commander-games-ready',()=>boot());
  let tries=0;const t=setInterval(async()=>{if(await boot()||++tries>40)clearInterval(t)},100);
  boot();
})();