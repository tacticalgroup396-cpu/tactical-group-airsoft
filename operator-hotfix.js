(()=>{
  const app=()=>document.getElementById('app');
  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const photo=o=>o.photo_url?`<img class="profilePhoto" loading="lazy" src="${esc(o.photo_url)}" alt="Foto de ${esc(o.nickname)}">`:`<div class="avatar">${esc((o.nickname||'?').slice(0,2))}</div>`;
  const fmtDate=d=>{if(!d)return 'Data não informada';const s=String(d);const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return new Date(Date.UTC(+m[1],+m[2]-1,+m[3])).toLocaleDateString('pt-BR',{timeZone:'UTC'});const x=new Date(s);return Number.isNaN(x.getTime())?'Data não informada':x.toLocaleDateString('pt-BR')};
  const fmtTime=t=>t?String(t).slice(0,5):'';
  const publicData=async()=>{const r=await fetch('/api/index.js?action=public&_hotfix='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('Falha ao carregar equipe');return r.json()};
  const gamesData=async()=>{const r=await fetch('/api/operator-games?_t='+Date.now(),{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Falha ao carregar jogos');return d};
  const participant=p=>`<a class="operatorGameParticipant" href="/visitantes?operator=${encodeURIComponent(p.operator_id||p.id)}&from=operator"><img loading="lazy" src="${p.photo_url||'/logo.webp'}" alt="Foto de ${esc(p.nickname)}"><div><b>@${esc(p.nickname)}</b>${p.name?`<small>${esc(p.name)}</small>`:''}<span>${esc(p.rank||'Operador')} · ${esc(p.function||'Operador')}</span></div></a>`;
  function injectStyle(){if(document.getElementById('operatorHotfixStyle'))return;const s=document.createElement('style');s.id='operatorHotfixStyle';s.textContent=`
    #operatorTabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}
    #operatorTabs .tabButton{appearance:none;border:1px solid #30353b;background:#12161a;color:#d9dde1;border-radius:8px;padding:10px 16px;font:600 15px Rajdhani,sans-serif;cursor:pointer}
    #operatorTabs .tabButton.active{background:#e3a51a;border-color:#e3a51a;color:#101214}
    .operatorGamesPanel{display:block}
    .operatorGameTabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}
    .operatorGameTabs button{appearance:none;border:1px solid #30353b;background:#12161a;color:#d9dde1;border-radius:8px;padding:9px 14px;font:600 14px Rajdhani,sans-serif;cursor:pointer}
    .operatorGameTabs button.active{background:#e3a51a;border-color:#e3a51a;color:#101214}
    .operatorGameCard{margin-bottom:16px}
    .operatorGameHead{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap}
    .operatorGameHead h2{margin:4px 0 6px}
    .operatorGameMeta{display:flex;gap:7px;flex-wrap:wrap}
    .operatorGameSections{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:18px}
    .operatorGameSection{border:1px solid #2a2f34;border-radius:10px;padding:12px;background:#0d1013}
    .operatorGameSection h3{margin:0 0 10px;font-size:17px}
    .operatorGameParticipantGrid{display:grid;gap:8px}
    .operatorGameParticipant{display:flex;align-items:center;gap:10px;padding:8px;border:1px solid #292e33;border-radius:8px;text-decoration:none;color:inherit;background:#111519}
    .operatorGameParticipant:hover{border-color:#e3a51a}
    .operatorGameParticipant img{width:42px;height:42px;border-radius:50%;object-fit:cover;background:#1b2025}
    .operatorGameParticipant div{min-width:0;display:grid;gap:2px}
    .operatorGameParticipant b,.operatorGameParticipant small,.operatorGameParticipant span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .operatorGameParticipant small,.operatorGameParticipant span{font-size:12px;color:#89939d}
    .operatorFinishedPhoto{width:100%;max-height:420px;object-fit:cover;border-radius:10px;margin-top:15px;cursor:pointer}
    .operatorPresentGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;margin-top:12px}
    .operatorGameEmpty{padding:25px;text-align:center;border:1px dashed #30353b;border-radius:10px;color:#89939d}
    .guardianEditor{margin-top:16px;padding:16px;border:1px solid #30353b;border-radius:10px;background:#0d1013}
    .guardianEditor h3{margin:0 0 6px}
    .guardianEditor p{margin:0 0 12px}
    .guardianEditor .guardianRow{display:flex;gap:10px;align-items:end;flex-wrap:wrap}
    .guardianEditor select{min-width:260px;flex:1}
    .guardianEditor .guardianActions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .guardianEditor .guardianStatus{font-size:13px;color:#89939d}
    @media(max-width:800px){.operatorGameSections{grid-template-columns:1fr}.operatorPresentGrid{grid-template-columns:1fr}.guardianEditor .guardianRow{display:block}.guardianEditor select{width:100%;min-width:0;margin-bottom:10px}.guardianEditor .guardianActions{display:flex}}
  `;document.head.appendChild(s)}

  function activeTab(){
    const root=app();if(!root)return;
    document.getElementById('operatorOverviewPanel')?.setAttribute('hidden','');
    document.getElementById('operatorActivePanel')?.setAttribute('hidden','');
    let panel=document.getElementById('operatorActivePanel');
    if(!panel){panel=document.createElement('section');panel.id='operatorActivePanel';panel.className='panel';root.appendChild(panel)}
    panel.hidden=false;
    panel.innerHTML='<div class="cardKicker">EQUIPE</div><h2>Operadores ativos</h2><p class="muted">Veja o perfil público de cada operador ativo.</p><div class="operatorGrid" id="operatorActiveGrid"><span class="muted">Carregando operadores...</span></div>';
    publicData().then(d=>{
      const list=(d.operators||[]).filter(o=>o.active!==false);
      const grid=document.getElementById('operatorActiveGrid');if(!grid)return;
      grid.innerHTML=list.map(o=>`<a class="card operator" href="/visitantes?operator=${encodeURIComponent(o.id)}&from=operator">${photo(o)}<div><h3>@${esc(o.nickname)}</h3>${o.name?`<div class="operatorRealName">${esc(o.name)}</div>`:''}<div class="rank">${esc(o.rank||'Operador')}</div><p>${esc(o.function||'Operador')}</p><small>${o.airsoft_years?esc(o.airsoft_years)+' anos de airsoft':'Ver perfil'}</small></div></a>`).join('')||'<span class="muted">Nenhum operador ativo encontrado.</span>';
    }).catch(()=>{const grid=document.getElementById('operatorActiveGrid');if(grid)grid.innerHTML='<span class="muted">Não foi possível carregar os operadores agora.</span>'});
  }

  function gamePanel(){
    const root=app();if(!root)return;
    document.getElementById('operatorOverviewPanel')?.setAttribute('hidden','');
    document.getElementById('operatorActivePanel')?.setAttribute('hidden','');
    let panel=document.getElementById('operatorGamesPanel');
    if(!panel){panel=document.createElement('section');panel.id='operatorGamesPanel';panel.className='operatorGamesPanel';root.appendChild(panel)}
    panel.hidden=false;
    panel.innerHTML='<div class="card"><div class="cardKicker">JOGOS</div><h1>Jogos</h1><p class="muted">Acompanhe os jogos ativos, quem vai, quem não vai e o histórico das partidas.</p><div class="operatorGameTabs"><button type="button" class="active" data-game-tab="active">Jogos ativos</button><button type="button" data-game-tab="finished">Jogos finalizados</button></div><div id="operatorGameContent"><div class="operatorGameEmpty">Carregando jogos...</div></div></div>';
    gamesData().then(d=>{
      const content=document.getElementById('operatorGameContent');if(!content)return;
      const renderActive=()=>{const list=d.active||[];content.innerHTML=list.length?list.map(g=>`<article class="card operatorGameCard"><div class="operatorGameHead"><div><div class="date">${fmtDate(g.game_date)}${g.game_time?' · '+fmtTime(g.game_time):''}</div><h2>${esc(g.title)}</h2><p><b>Campo:</b> ${esc(g.field_name||g.field_address||'Não informado')}</p>${g.description?`<p>${esc(g.description)}</p>`:''}${g.briefing?`<p><b>Briefing:</b> ${esc(g.briefing)}</p>`:''}</div><div class="operatorGameMeta"><span class="tag">Ativo</span><span class="tag">${(g.going||[]).length} vão</span><span class="tag">${(g.not_going||[]).length} não vão</span><span class="tag">${(g.pending||[]).length} sem resposta</span></div></div><div class="operatorGameSections"><div class="operatorGameSection"><h3>🟢 Quem vai (${(g.going||[]).length})</h3><div class="operatorGameParticipantGrid">${(g.going||[]).map(participant).join('')||'<span class="muted">Nenhum operador confirmou.</span>'}</div></div><div class="operatorGameSection"><h3>🔴 Quem não vai (${(g.not_going||[]).length})</h3><div class="operatorGameParticipantGrid">${(g.not_going||[]).map(participant).join('')||'<span class="muted">Ninguém marcou Não vou.</span>'}</div></div><div class="operatorGameSection"><h3>🟡 Sem resposta (${(g.pending||[]).length})</h3><div class="operatorGameParticipantGrid">${(g.pending||[]).map(participant).join('')||'<span class="muted">Todos responderam.</span>'}</div></div></div></article>`).join(''):'<div class="operatorGameEmpty">Nenhum jogo ativo no momento.</div>'};
      const renderFinished=()=>{const list=d.finished||[];content.innerHTML=list.length?list.map(g=>`<article class="card operatorGameCard"><div class="operatorGameHead"><div><div class="date">${fmtDate(g.game_date)}${g.game_time?' · '+fmtTime(g.game_time):''}</div><h2>${esc(g.title)}</h2><p><b>Campo:</b> ${esc(g.field_name||g.field_address||'Não informado')} · <span class="tag">Finalizado</span></p></div><span class="tag">${(g.present||[]).length} presente(s)</span></div>${g.photo?.image_data?`<img class="operatorFinishedPhoto" loading="lazy" src="${g.photo.image_data}" alt="${esc(g.photo.caption||'Foto do jogo '+g.title)}" data-game-photo="${esc(g.photo.image_data)}">`:''}<div class="sectionHead compact" style="margin-top:16px"><div><div class="eyebrow">EFETIVO</div><h3>Operadores presentes</h3></div><span class="tag">${(g.present||[]).length}</span></div><div class="operatorPresentGrid">${(g.present||[]).map(participant).join('')||'<span class="muted">Nenhum operador presente registrado.</span>'}</div>${g.photo?.caption?`<p class="muted">${esc(g.photo.caption)}</p>`:''}</article>`).join(''):'<div class="operatorGameEmpty">Nenhum jogo finalizado encontrado.</div>';content.querySelectorAll('[data-game-photo]').forEach(img=>img.onclick=()=>{if(typeof openImageLightbox==='function')openImageLightbox(img.dataset.gamePhoto,img.alt);else window.open(img.dataset.gamePhoto,'_blank')})};
      renderActive();
      panel.querySelector('[data-game-tab="active"]').onclick=()=>{panel.querySelectorAll('[data-game-tab]').forEach(b=>b.classList.toggle('active',b.dataset.gameTab==='active'));renderActive()};
      panel.querySelector('[data-game-tab="finished"]').onclick=()=>{panel.querySelectorAll('[data-game-tab]').forEach(b=>b.classList.toggle('active',b.dataset.gameTab==='finished'));renderFinished()};
    }).catch(e=>{const content=document.getElementById('operatorGameContent');if(content)content.innerHTML=`<div class="error">${esc(e.message)}</div>`});
  }

  async function installGuardianEditor(){
    if(location.pathname!=='/operador')return;
    const form=document.getElementById('pfBirth')?.closest('.formCard');
    if(!form||document.getElementById('guardianEditor'))return;
    let d;
    try{const r=await fetch('/api/index.js?action=profile-data&_guardian='+Date.now(),{cache:'no-store'});if(!r.ok)return;d=await r.json()}catch{return}
    const birth=document.getElementById('pfBirth')?.value||d.user?.birth_date||'';
    if(!birth)return;
    const birthDate=new Date(`${birth}T00:00:00`), cutoff=new Date();cutoff.setFullYear(cutoff.getFullYear()-18);
    if(!(birthDate>cutoff))return;
    const box=document.createElement('div');box.id='guardianEditor';box.className='guardianEditor';
    const options=(d.guardianOptions||[]).map(o=>`<option value="${esc(o.id)}" ${String(d.user?.guardian_operator_id||'')===String(o.id)?'selected':''}>@${esc(o.nickname)}${o.name?' · '+esc(o.name):''} · ${esc(o.rank||'Operador')}</option>`).join('');
    box.innerHTML=`<h3>👤 Responsável pelo operador menor de idade</h3><p class="muted">Este operador tem menos de 18 anos. Selecione um operador ativo como responsável.</p><div class="guardianRow"><div style="flex:1"><label for="pfGuardian"><b>Operador responsável</b></label><select id="pfGuardian"><option value="">Selecione um operador</option>${options}</select></div><div class="guardianActions"><button type="button" class="goldbtn" id="saveGuardian">Salvar responsável</button><span class="guardianStatus" id="guardianStatus"></span></div></div>`;
    const target=document.getElementById('pfPublic')?.closest('.formGrid')||document.getElementById('pfBirth')?.parentElement;
    target?.insertAdjacentElement('afterend',box);
    document.getElementById('saveGuardian').onclick=async()=>{
      const id=document.getElementById('pfGuardian')?.value||'';if(!id){toastMsg('Selecione um operador responsável.');return}
      const status=document.getElementById('guardianStatus');status.textContent='Salvando...';
      try{
        const payload={name:document.getElementById('pfName')?.value||'',email:document.getElementById('pfEmail')?.value||'',birth_date:document.getElementById('pfBirth')?.value||'',age:document.getElementById('pfAge')?.value||'',blood_type:document.getElementById('pfBlood')?.value||'',airsoft_years:document.getElementById('pfYears')?.value||'',play_style:document.getElementById('pfStyle')?.value||'',primary_replica:document.getElementById('pfPrimary')?.value||'',secondary_replica:document.getElementById('pfSecondary')?.value||'',function:document.getElementById('pfFunction')?.value||'',bio:document.getElementById('pfBio')?.value||'',equipment_summary:document.getElementById('pfEquip')?.value||'',public_profile:document.getElementById('pfPublic')?.checked!==false,guardian_operator_id:id};
        const r=await fetch('/api/index.js?action=update-profile&_guardian_save='+Date.now(),{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const out=await r.json();if(!r.ok)throw new Error(out.error||'Não foi possível salvar o responsável.');status.textContent='Responsável salvo com sucesso.';toastMsg('Responsável definido com sucesso.');
      }catch(e){status.textContent=e.message}
    };
  }
  function toastMsg(t){if(typeof toast==='function')toast(t);else{const x=document.createElement('div');x.textContent=t;x.style.cssText='position:fixed;right:18px;bottom:18px;padding:12px 16px;background:#e3a51a;color:#101214;border-radius:8px;z-index:9999;font-weight:700';document.body.appendChild(x);setTimeout(()=>x.remove(),3000)}}

  function installTabs(){
    if(location.pathname!=='/operador')return;
    const root=app();if(!root)return;
    injectStyle();
    if(document.getElementById('operatorTabs')){installGuardianEditor();return}
    const tabs=document.createElement('div');tabs.id='operatorTabs';tabs.className='sectionTabs';tabs.innerHTML='<button type="button" class="tabButton active" data-tab="overview">Visão geral</button><button type="button" class="tabButton" data-tab="active">Operadores ativos</button><button type="button" class="tabButton" data-tab="games">Jogos</button>';
    root.prepend(tabs);
    tabs.querySelector('[data-tab="overview"]').onclick=()=>{document.getElementById('operatorActivePanel')?.setAttribute('hidden','');document.getElementById('operatorGamesPanel')?.setAttribute('hidden','');document.getElementById('operatorOverviewPanel')?.removeAttribute('hidden');tabs.querySelectorAll('.tabButton').forEach(b=>b.classList.toggle('active',b.dataset.tab==='overview'));setTimeout(installGuardianEditor,100)};
    tabs.querySelector('[data-tab="active"]').onclick=()=>{tabs.querySelectorAll('.tabButton').forEach(b=>b.classList.toggle('active',b.dataset.tab==='active'));activeTab()};
    tabs.querySelector('[data-tab="games"]').onclick=()=>{tabs.querySelectorAll('.tabButton').forEach(b=>b.classList.toggle('active',b.dataset.tab==='games'));gamePanel()};
    setTimeout(installGuardianEditor,150);
  }

  function fallback(){
    if(location.pathname!=='/operador')return;
    const root=app();if(!root)return;
    const text=(root.textContent||'').trim();
    if(text==='Carregando...'||root.querySelector('.loading')){
      root.innerHTML='<section class="panel" id="operatorOverviewPanel"><div class="cardKicker">PAINEL DO OPERADOR</div><h1>Visão geral</h1><p class="muted">Sua sessão está ativa. O painel principal está sendo atualizado.</p><div class="infoCard"><div><h2>Operadores ativos</h2><p>Use as abas acima para consultar os perfis públicos e os jogos da equipe.</p></div></div></section>';
      installTabs();
    }
  }

  const observer=new MutationObserver(()=>{if(location.pathname==='/operador'){installTabs();fallback()}});
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{installTabs();fallback()},900);
  window.addEventListener('unhandledrejection',e=>{if(String(e.reason?.message||e.reason).includes('ranks is not defined')){e.preventDefault();fallback();}});
})();
