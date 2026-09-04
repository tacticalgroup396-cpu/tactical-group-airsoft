(()=>{
  if(!location.pathname.startsWith('/comandante')) return;

  const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=v=>{if(!v)return 'Não informado';const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]}`:String(v)};
  const nav=active=>{const items=[['equipe','Equipe'],['jogos','Jogos'],['patentes-elos','Patentes e Elos'],['historico','Histórico de jogos'],['financeiro','Financeiro'],['visitas','Visitantes'],['configuracoes','Configurações']];return `<div class="commandNav">${items.map(([id,label])=>`<a class="${active===id?'active':''}" href="/comandante/${id}">${label}</a>`).join('')}</div>`};
  const header=(title,sub)=>`<div class="pageTitle"><div class="pageBrand"><img src="/logo.webp" alt="Tactical Group Airsoft"><div><div class="eyebrow">COMANDO TGA</div><h1>${h(title)}</h1><p>${h(sub)}</p></div></div></div>`;
  const statusLabel=s=>({pending:'PENDENTE',approved:'APROVADO',accepted:'APROVADO',rejected:'RECUSADO'}[String(s||'pending').toLowerCase()]||String(s||'PENDENTE').toUpperCase());

  window.renderVisitsPage=function(d){
    const reqs=Array.isArray(d?.requests)?d.requests:[];
    return `<section>${header('Visitantes','Gerencie solicitações de visitantes e acompanhe quem pediu para participar.')}${nav('visitas')}
      <div class="card"><div class="sectionHead compact"><div><div class="eyebrow">SOLICITAÇÕES</div><h2>Visitantes</h2><p class="muted">Aprove ou recuse as solicitações recebidas pelo site.</p></div></div>
      <div class="table">${reqs.map(r=>{const st=String(r.status||'pending').toLowerCase();const assigns=Array.isArray(r.assignments)?r.assignments:[];return `<div class="row visitorAdminRow"><div><b>${h(r.name||'Visitante')}${r.nickname?` · @${h(r.nickname)}`:''}</b><small>${h(r.contact||'Sem contato')}</small>${r.message?`<small>${h(r.message)}</small>`:''}${r.requested_game_title?`<small>Jogo solicitado: <b>${h(r.requested_game_title)}</b>${r.requested_game_date?' · '+date(r.requested_game_date):''}</small>`:''}${assigns.length?`<small>Jogos vinculados: ${assigns.map(a=>h(a.title||a.location||'Jogo')).join(', ')}</small>`:''}</div><span class="tag ${st==='approved'||st==='accepted'?'paid':st==='rejected'?'danger':'pending'}">${statusLabel(st)}</span><div class="heroActions">${st==='pending'?`<button type="button" class="mini" data-visitor-decision="approved" data-id="${h(r.id)}">Aprovar</button><button type="button" class="mini danger" data-visitor-decision="rejected" data-id="${h(r.id)}">Recusar</button>`:`<button type="button" class="mini" data-visitor-decision="pending" data-id="${h(r.id)}">Voltar para pendente</button>`}</div></div>`}).join('')||'<p class="muted">Nenhuma solicitação de visitante recebida.</p>'}</div></div>
    </section>`;
  };

  window.renderSettingsPage=function(d){
    const u=d?.me||{}; const settings=d?.financeSettings||{}; const fields=Array.isArray(d?.fields)?d.fields:[];
    return `<section>${header('Configurações','Ajuste dados do comando, acesso, Instagram, aplicativo e campos de jogo.')}${nav('configuracoes')}
      <div class="adminGrid">
        <form id="instagramForm" class="card formCard"><div class="cardKicker">SITE</div><h2>Instagram da equipe</h2><label>Link do Instagram<input name="instagram_url" type="url" value="${h(settings.instagram_url||'')}" placeholder="https://instagram.com/..."></label><button class="goldbtn">Salvar Instagram</button></form>
        <div class="card"><div class="cardKicker">APLICATIVO</div><h2>Instalar Tactical Group Airsoft</h2><p class="muted">Instale o portal como aplicativo no celular ou computador.</p><button type="button" class="goldbtn" id="installSettings">Instalar aplicativo</button></div>
      </div>
      <form id="loginSettingsForm" class="card formCard"><div class="cardKicker">MINHA CONTA</div><h2>Dados de acesso do comandante</h2><div class="formGrid"><label>Nome<input name="name" value="${h(u.name||'')}"></label><label>Apelido<input name="nickname" value="${h(u.nickname||'')}" required></label><label>E-mail<input name="email" type="email" value="${h(u.email||'')}"></label><label>Senha atual<input name="current_password" type="password" autocomplete="current-password" required></label><label>Nova senha<input name="new_password" type="password" autocomplete="new-password" placeholder="Deixe em branco para manter"></label></div><button class="goldbtn">Salvar dados de acesso</button></form>
      <div class="adminGrid"><form id="fieldForm" class="card formCard"><div class="cardKicker">NOVO CAMPO</div><h2>Cadastrar campo</h2><label>Nome do campo<input name="name" required placeholder="Nome do campo"></label><label>Endereço<input name="address" placeholder="Endereço completo"></label><label>Link do Google Maps<input name="maps_url" type="url" required placeholder="https://maps.google.com/..."></label><label>Observações<textarea name="notes" placeholder="Observações sobre o campo"></textarea></label><button class="goldbtn">Cadastrar campo</button></form>
        <div class="card"><div class="cardKicker">CAMPOS</div><h2>Campos cadastrados</h2>${fields.map(f=>`<div class="fieldItem"><div><b>${h(f.name)}</b><small>${h(f.address||'')}</small></div><div class="heroActions"><a class="mini" href="${h(f.maps_url||'#')}" target="_blank" rel="noopener">Abrir Maps</a><button type="button" class="mini danger" data-delete-field="${h(f.id)}">Excluir</button></div></div>`).join('')||'<p class="muted">Nenhum campo cadastrado.</p>'}</div></div>
    </section>`;
  };

  window.renderHistoryPage=function(d){
    const games=Array.isArray(d?.history)?d.history:[];
    return `<section>${header('Histórico de jogos','Consulte partidas encerradas, presença, faltas e fotos das operações.')}${nav('historico')}
      <div class="stack">${games.map(g=>`<article class="card commandGame"><div class="commandGameHeader"><div><div class="date">${date(g.game_date)}${g.game_time?' · '+String(g.game_time).slice(0,5):''}</div><h2>${h(g.title||'Jogo')}</h2><p>${h(g.location||'Campo não informado')}</p></div><div class="commandGameMeta"><span class="tag">FINALIZADO</span><span>${Number(g.going_count||0)} confirmados · ${Number(g.present_count||0)} presentes · ${Number(g.absence_count||0)} faltas</span></div></div>${g.match_photo_url?`<div class="historyPhotoWrap"><img class="historyMatchPhoto" loading="lazy" src="${h(g.match_photo_url)}" alt="Foto de ${h(g.title||'jogo')}" data-commander-photo></div>`:''}</article>`).join('')||'<div class="card"><p class="muted">Nenhum jogo finalizado no histórico.</p></div>'}</div>
    </section>`;
  };

  async function visitorDecision(btn){
    if(btn.dataset.busy==='1')return; btn.dataset.busy='1';
    try{
      const r=await fetch('/api/visitor-admin?action=decision',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:btn.dataset.id,status:btn.dataset.visitorDecision})});
      const data=await r.json().catch(()=>({})); if(!r.ok)throw new Error(data.error||'Não foi possível atualizar o visitante.');
      if(typeof window.toast==='function')window.toast('Solicitação de visitante atualizada');
      if(typeof window.commanderPage==='function')window.commanderPage('visitas'); else location.reload();
    }catch(e){if(typeof window.toast==='function')window.toast(e.message);else alert(e.message)}finally{btn.dataset.busy='0'}
  }

  function wrapField(grid,name,labelText){
    const el=grid?.querySelector(`[name="${name}"]`); if(!el||el.closest('label'))return;
    const label=document.createElement('label');label.dataset.commanderField='1';label.append(document.createTextNode(labelText));grid.insertBefore(label,el);label.appendChild(el);
  }

  function enhance(){
    document.querySelectorAll('a[href="/comandante/visitas"]').forEach(a=>{if(a.textContent.trim()==='Visitas')a.textContent='Visitantes'});
    const form=document.getElementById('gameForm');
    if(form&&!form.dataset.singleDate){
      form.dataset.singleDate='1';
      form.querySelector('[name="rsvp_deadline_date"]')?.remove();
      form.querySelector('[name="rsvp_deadline_time"]')?.remove();
      const grid=form.querySelector('.formGrid');
      wrapField(grid,'title','Nome da operação');wrapField(grid,'game_date','Data do jogo');wrapField(grid,'game_time','Horário do jogo');wrapField(grid,'field_id','Campo');wrapField(grid,'min_players','Mínimo de operadores');wrapField(grid,'max_players','Máximo de operadores');wrapField(grid,'elo_reward','Elo por participação');wrapField(grid,'status','Status');
      if(grid&&!form.querySelector('.deadlineEditHint')){const p=document.createElement('p');p.className='muted deadlineEditHint';p.textContent='Prazo da lista: depois de criar o jogo, use “Editar jogo” para definir ou alterar o prazo de confirmação.';grid.insertAdjacentElement('afterend',p)}
    }
    document.querySelectorAll('[data-visitor-decision]:not([data-v5-bound])').forEach(b=>{b.dataset.v5Bound='1';b.addEventListener('click',()=>visitorDecision(b))});
    document.querySelectorAll('[data-commander-photo]:not([data-v5-bound])').forEach(img=>{img.dataset.v5Bound='1';img.style.cursor='zoom-in';img.addEventListener('click',()=>{if(typeof window.openImageLightbox==='function')window.openImageLightbox(img.src,img.alt||'Foto do jogo')})});
  }

  const obs=new MutationObserver(enhance);obs.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
})();

(()=>{
  if(!location.pathname.startsWith('/comandante'))return;
  const call=async(action,data={})=>{const r=await fetch('/api/index.js?action='+encodeURIComponent(action),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify(data)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Erro ao atualizar.');return d};
  const say=m=>{if(typeof window.toast==='function')window.toast(m);else alert(m)};
  async function cancelGame(btn){
    if(btn.dataset.busy==='1')return;
    const row=btn.closest('.commandGame');const title=row?.querySelector('b,h2')?.textContent?.trim()||'este jogo';
    if(!confirm(`Cancelar ${title}?\n\nUse esta opção quando o jogo NÃO acontecer. Nenhuma falta será gerada por esse jogo.`))return;
    const reason=prompt('Motivo do cancelamento (opcional):','Jogo não realizado');if(reason===null)return;
    btn.dataset.busy='1';btn.disabled=true;const old=btn.textContent;btn.textContent='Cancelando...';
    try{const d=await call('cancel-game',{game_id:btn.dataset.cancelGame,reason});say(d.message||'Jogo cancelado');if(typeof window.commanderPage==='function')await window.commanderPage('jogos');else location.reload()}catch(e){say(e.message);btn.disabled=false;btn.textContent=old;btn.dataset.busy='0'}
  }
  async function repairAbsences(btn){
    if(btn.dataset.busy==='1')return;
    if(!confirm('Corrigir as faltas automáticas indevidas?\n\nSerão mantidas apenas as faltas registradas manualmente pelo comando.'))return;
    btn.dataset.busy='1';btn.disabled=true;const old=btn.textContent;btn.textContent='Corrigindo...';
    try{const d=await call('repair-auto-absences');say(d.message||'Faltas corrigidas');if(typeof window.commanderPage==='function')await window.commanderPage('equipe');else location.reload()}catch(e){say(e.message);btn.disabled=false;btn.textContent=old;btn.dataset.busy='0'}
  }
  function enhanceGameControls(){
    if(location.pathname==='/comandante/jogos'){
      document.querySelectorAll('.commandGame').forEach(row=>{
        const edit=row.querySelector('[data-editgame]');if(!edit||row.querySelector('[data-cancel-game]'))return;
        const status=(row.querySelector('.tag')?.textContent||'').toLowerCase();if(status.includes('cancelado'))return;
        const b=document.createElement('button');b.type='button';b.className='mini danger';b.dataset.cancelGame=edit.dataset.editgame;b.textContent='Cancelar jogo';b.addEventListener('click',()=>cancelGame(b));edit.insertAdjacentElement('afterend',b);
      });
    }
    if(location.pathname==='/comandante/equipe'){
      const nav=document.querySelector('.commandNav');if(nav&&!document.getElementById('repairAutoAbsences')){
        const box=document.createElement('div');box.className='card';box.style.margin='18px 0';box.innerHTML='<div class="cardKicker">FALTAS</div><h2>Corrigir faltas automáticas</h2><p class="muted">Remove faltas que o sistema marcou apenas porque a data do jogo passou. Faltas registradas manualmente pelo comando são preservadas.</p><button type="button" class="outlinebtn" id="repairAutoAbsences">Corrigir faltas indevidas</button>';nav.insertAdjacentElement('afterend',box);box.querySelector('#repairAutoAbsences').addEventListener('click',e=>repairAbsences(e.currentTarget));
      }
    }
  }
  const obs=new MutationObserver(enhanceGameControls);obs.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhanceGameControls,{once:true});else enhanceGameControls();
})();
