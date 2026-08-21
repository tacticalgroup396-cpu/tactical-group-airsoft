(()=>{
  const app=()=>document.getElementById('app');
  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const photo=o=>o.photo_url?`<img class="profilePhoto" loading="lazy" src="${esc(o.photo_url)}" alt="Foto de ${esc(o.nickname)}">`:`<div class="avatar">${esc((o.nickname||'?').slice(0,2))}</div>`;
  async function publicData(){const r=await fetch('/api/index.js?action=public&_hotfix='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('Falha ao carregar equipe');return r.json()}
  function activeTab(){
    const root=app();if(!root)return;
    const active=document.getElementById('operatorActivePanel');
    if(active){active.hidden=false;document.getElementById('operatorOverviewPanel')?.setAttribute('hidden','');return}
    const overview=document.getElementById('operatorOverviewPanel');
    if(overview)overview.setAttribute('hidden','');
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
  function installTabs(){
    if(location.pathname!=='/operador')return;
    const root=app();if(!root)return;
    if(document.getElementById('operatorTabs'))return;
    const tabs=document.createElement('div');tabs.id='operatorTabs';tabs.className='sectionTabs';tabs.innerHTML='<button type="button" class="tabButton active" data-tab="overview">Visão geral</button><button type="button" class="tabButton" data-tab="active">Operadores ativos</button>';
    root.prepend(tabs);
    tabs.querySelector('[data-tab="overview"]').onclick=()=>{document.getElementById('operatorActivePanel')?.setAttribute('hidden','');document.getElementById('operatorOverviewPanel')?.removeAttribute('hidden');tabs.querySelectorAll('.tabButton').forEach(b=>b.classList.toggle('active',b.dataset.tab==='overview'))};
    tabs.querySelector('[data-tab="active"]').onclick=()=>{tabs.querySelectorAll('.tabButton').forEach(b=>b.classList.toggle('active',b.dataset.tab==='active'));activeTab()};
  }
  function fallback(){
    if(location.pathname!=='/operador')return;
    const root=app();if(!root)return;
    const text=(root.textContent||'').trim();
    if(text==='Carregando...'||root.querySelector('.loading')){
      root.innerHTML='<section class="panel" id="operatorOverviewPanel"><div class="cardKicker">PAINEL DO OPERADOR</div><h1>Visão geral</h1><p class="muted">Sua sessão está ativa. O painel principal está sendo atualizado.</p><div class="infoCard"><div><h2>Operadores ativos</h2><p>Use a aba ao lado para consultar os perfis públicos da equipe.</p></div></div></section>';
      installTabs();
    }
  }
  const observer=new MutationObserver(()=>{if(location.pathname==='/operador'){installTabs();fallback()}});
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{installTabs();fallback()},900);
  window.addEventListener('unhandledrejection',e=>{if(String(e.reason?.message||e.reason).includes('ranks is not defined')){e.preventDefault();fallback();}});
})();
