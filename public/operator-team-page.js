(()=>{
  const path=location.pathname;
  if(!path.startsWith('/operador')) return;
  const app=document.getElementById('app');
  if(!app) return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api=async(action,query='')=>{
    const r=await fetch('/api/index.js?action='+encodeURIComponent(action)+query,{cache:'no-store',credentials:'same-origin'});
    const text=await r.text();
    let d={};try{d=text?JSON.parse(text):{}}catch{d={error:'Resposta inválida do servidor.'}}
    if(!r.ok) throw new Error(d.error||'Erro ao carregar.');
    return d;
  };
  const photo=o=>o?.photo_url?`<img class="profilePhoto big" loading="lazy" decoding="async" src="${esc(o.photo_url)}" alt="Foto de ${esc(o.nickname||'operador')}">`:`<div class="avatar big">${esc((o?.nickname||'?').slice(0,2))}</div>`;
  function ensureTab(){
    const nav=document.querySelector('.operatorNav');
    if(!nav) return;
    let a=nav.querySelector('a[href="/operador/equipe"]');
    if(!a){
      a=document.createElement('a');a.href='/operador/equipe';a.textContent='Ver operadores';
      const cfg=nav.querySelector('a[href="/operador/configuracoes"]');
      cfg?nav.insertBefore(a,cfg):nav.appendChild(a);
    }else a.textContent='Ver operadores';
    if(path==='/operador/equipe') a.classList.add('active');
  }
  function subnav(){return `<div class="operatorNav"><a href="/operador">Visão geral</a><a class="active" href="/operador/equipe">Ver operadores</a><a href="/operador/configuracoes">Configurações</a></div>`}
  async function renderTeam(){
    if(path!=='/operador/equipe') return;
    const id=new URLSearchParams(location.search).get('operator');
    try{
      if(id){
        const d=await api('operator','&id='+encodeURIComponent(id));
        const o=d.operator||{};
        app.innerHTML=`<section><div class="pageTitle"><div class="pageBrand">${photo(o)}<div><div class="eyebrow">PERFIL DO OPERADOR</div><h1>@${esc(o.nickname||'Operador')}</h1><p>${esc(o.rank||'Recruta')} · ${esc(o.function||'Operador')}</p></div></div></div>${subnav()}<div class="card"><div class="profileHero">${photo(o)}<div><h2>${esc(o.name||o.nickname||'Operador')}</h2><p>${esc(o.bio||'Sem descrição cadastrada.')}</p><p><b>Patente:</b> ${esc(o.rank||'Recruta')} · <b>Função:</b> ${esc(o.function||'Operador')}</p><p><b>Estilo:</b> ${esc(o.play_style||'Não informado')} · <b>Airsoft:</b> ${esc(o.airsoft_years||'Não informado')}</p><p><b>Primária:</b> ${esc(o.primary_replica||'Não informado')}<br><b>Secundária:</b> ${esc(o.secondary_replica||'Não informado')}</p></div></div><h3>Equipamentos</h3><div class="operatorTeamGrid">${(d.equipment||[]).map(e=>`<article class="card"><b>${esc(e.name)}</b><small>${esc(e.category||'Equipamento')}</small>${e.details?`<p>${esc(e.details)}</p>`:''}</article>`).join('')||'<p class="muted">Nenhum equipamento público cadastrado.</p>'}</div><div class="heroActions"><a class="outlinebtn" href="/operador/equipe">← Voltar para operadores</a></div></div></section>`;
      }else{
        const d=await api('team-members');
        const cards=(d.operators||[]).map(o=>`<a class="card operatorTeamCard" href="/operador/equipe?operator=${encodeURIComponent(o.id)}">${photo(o)}<div class="operatorTeamInfo"><h3>@${esc(o.nickname)}</h3>${o.name?`<div class="operatorRealName">${esc(o.name)}</div>`:''}<div class="rank">${esc(o.rank||'Recruta')}</div><p>${esc(o.function||'Operador')}</p><small>${esc(o.bio||'Abrir perfil completo')}</small></div></a>`).join('');
        app.innerHTML=`<section><div class="pageTitle"><div class="pageBrand"><img src="/logo.webp" alt="Tactical Group Airsoft"><div><div class="eyebrow">ÁREA DO OPERADOR</div><h1>Operadores do time</h1><p>Veja todos os operadores ativos e abra o perfil de cada membro.</p></div></div></div>${subnav()}<div class="card"><div class="sectionHead compact"><div><div class="eyebrow">MEMBROS ATIVOS</div><h2>Equipe Tactical Group</h2></div><span class="tag">${(d.operators||[]).length} operador(es)</span></div><div class="operatorTeamGrid">${cards||'<p class="muted">Nenhum operador ativo encontrado.</p>'}</div></div></section>`;
      }
    }catch(e){app.innerHTML=`<div class="error">${esc(e.message)}</div>`}
  }
  const watch=()=>{ensureTab();if(path==='/operador/equipe')renderTeam()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
  for(const ms of [150,450,900,1600])setTimeout(ensureTab,ms);
  if(path==='/operador/equipe')setTimeout(renderTeam,50);
})();
