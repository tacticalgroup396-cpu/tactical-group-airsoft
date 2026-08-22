(()=>{
  const path=(location.pathname.replace(/\/+$/,'')||'/');
  if(path!=='/operador')return;
  const app=document.getElementById('app'),nav=document.getElementById('nav'),menu=document.getElementById('menuToggle');
  if(!app||!nav)return;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=d=>{if(!d)return'—';const s=String(d).slice(0,10),m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:s};
  const tm=t=>t?String(t).slice(0,5):'';
  const elo=n=>({1:['💎','Diamante'],2:['🟩','Esmeralda'],3:['🔷','Platina'],4:['🏆','Ouro'],5:['🥈','Prata'],6:['🥉','Bronze'],7:['⚙️','Ferro']}[Math.min(7,Math.max(1,Number(n)||7))]);
  const photo=u=>u?.photo_url?`<img class="ofdPhoto" src="${esc(u.photo_url)}" alt="Foto de ${esc(u.nickname||'operador')}" loading="lazy" decoding="async">`:`<div class="ofdAvatar">${esc((u?.nickname||'OP').slice(0,2))}</div>`;

  async function fetchJson(url,ms=6000){
    const c=new AbortController(),timer=setTimeout(()=>c.abort(),ms);
    try{
      const r=await window.fetch(url,{credentials:'same-origin',cache:'no-store',signal:c.signal});
      const text=await r.text();let d={};
      try{d=text?JSON.parse(text):{}}catch{}
      if(!r.ok)throw new Error(d.error||`Erro ${r.status}`);
      return d;
    }finally{clearTimeout(timer)}
  }

  function go(href){location.href=href}
  function bindRoutes(){
    document.querySelectorAll('[data-op-route]').forEach(a=>{a.onclick=e=>{e.preventDefault();go(a.getAttribute('href'))}});
  }
  function shell(u={},instagram=''){
    nav.innerHTML=`<div class="navGroup"><a data-op-route href="/visitantes">Equipe</a>${instagram?`<a href="${esc(instagram)}" target="_blank" rel="noopener">Instagram</a>`:''}</div><div class="navGroup navAccess"><a class="active" data-op-route href="/operador">Operador</a>${u.role==='commander'?'<a data-op-route href="/comandante">Comandante</a>':''}<button class="ghost" id="opLogout" type="button">Sair</button></div>`;
    const close=()=>{nav.classList.remove('open');menu?.setAttribute('aria-expanded','false')};
    menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))});
    bindRoutes();
    document.getElementById('opLogout')?.addEventListener('click',async()=>{try{await window.fetch('/api/operator-dashboard?action=logout',{method:'POST',credentials:'same-origin',cache:'no-store'})}catch{}go('/')});
  }
  function subnav(){return `<div class="ofdNavWrap"><div class="operatorNav"><a class="active" data-op-route href="/operador">Visão geral</a><a data-op-route href="/operador/equipe">Ver operadores</a><a data-op-route href="/operador/jogos">Jogos</a><a data-op-route href="/operador/arena">Mini jogos</a><a data-op-route href="/operador/configuracoes">Configurações</a></div></div>`}

  function initial(){
    shell();
    app.innerHTML=`<section class="ofdPage"><div id="opHero" class="ofdHero"><div class="ofdAvatar">OP</div><div><div class="eyebrow">ÁREA DO OPERADOR</div><h1>Visão geral</h1><p class="muted">Validando sua sessão...</p></div></div>${subnav()}<section id="opProgress" class="ofdCard ofdProgress"><div class="eyebrow">PROGRESSÃO</div><h2>Carregando perfil...</h2></section><section class="ofdCard"><div class="eyebrow">PRÓXIMOS JOGOS</div><h2>Presença e escalação</h2><div id="opGames"><p class="muted">Buscando próximos jogos...</p></div><div class="heroActions"><a class="goldbtn" data-op-route href="/operador/jogos">Abrir Jogos</a><a class="outlinebtn" data-op-route href="/operador/arena">Abrir Mini jogos</a></div></section><div id="opResponsible"></div><section class="ofdCard"><div class="eyebrow">FINANCEIRO</div><div id="opFinance"><p class="muted">Carregando situação financeira...</p></div></section></section>`;
    bindRoutes();
  }

  function renderUser(u,instagram=''){
    if(!u)return;
    shell(u,instagram);
    const e=elo(u.elo_level),hero=document.getElementById('opHero');
    if(hero)hero.innerHTML=`${photo(u)}<div><div class="eyebrow">ÁREA DO OPERADOR</div><h1>${esc(u.nickname||'Operador')}</h1>${u.name?`<p class="ofdName">${esc(u.name)}</p>`:''}<p>Patente <b>${esc(u.rank||'Recruta')}</b> · ${Number(u.absences)||0} faltas · ${e[0]} Elo ${Number(u.elo_level)||7} · ${e[1]}</p></div>`;
    const p=document.getElementById('opProgress');
    if(p)p.innerHTML=`<div class="eyebrow">PROGRESSÃO</div><h2>${e[0]} ${esc(u.rank||'Recruta')} · Elo ${Number(u.elo_level)||7} ${e[1]}</h2><div class="ofdStats"><span><b>${Number(u.games_count)||0}</b> jogos</span><span><b>${Number(u.absences)||0}</b> faltas</span><span><b>${u.age??'—'}</b> anos</span></div>`;
    bindRoutes();
  }

  function names(list){return (list||[]).slice(0,8).map(o=>`@${esc(o.nickname||'')}`).join(', ')}
  function gameCard(g){
    const going=g.response==='going',no=g.response==='not_going';
    return `<article class="ofdGame"><div class="ofdGameHead"><div><div class="eyebrow">${fmt(g.game_date)}${g.game_time?' · '+tm(g.game_time):''}</div><h3>${esc(g.title||'Jogo')}</h3><p>${esc(g.field_name||g.location||'Campo não informado')}</p></div><span class="ofdResponse">${going?'✅ Vou':no?'❌ Não vou':'⏳ Não respondeu'}</span></div>${g.briefing?`<p><b>Briefing:</b> ${esc(g.briefing)}</p>`:''}<div class="ofdGameSummary"><span>✅ ${(g.participants||[]).length} vão</span><span>❌ ${(g.not_going_participants||[]).length} não vão</span><span>⏳ ${(g.pending_participants||[]).length} pendentes</span></div>${(g.participants||[]).length?`<p class="muted"><b>Confirmados:</b> ${names(g.participants)}</p>`:''}</article>`;
  }

  function renderExtras(d){
    if(d.user)renderUser(d.user,d.instagram_url||'');
    const games=document.getElementById('opGames');
    if(games)games.innerHTML=(d.games||[]).length?(d.games||[]).map(gameCard).join(''):'<p class="muted">Nenhum jogo ativo.</p>';
    const f=document.getElementById('opFinance');
    if(f){const x=d.finance;f.innerHTML=x?`<h2>${x.status==='paid'?'Mensalidade em dia':x.status==='waived'?'Mensalidade isenta':x.status==='overdue'?'Mensalidade atrasada':'Mensalidade pendente'}</h2><p>${Number(x.amount||0).toLocaleString('pt-BR',{style:'currency',currency:d.financeSettings?.currency||'BRL'})} · vencimento ${fmt(x.due_date)}</p>`:'<h2>Sem cobrança gerada</h2><p class="muted">Nenhuma mensalidade do mês encontrada.</p>'}
    const r=document.getElementById('opResponsible'),list=d.responsibleFor||[];
    if(r)r.innerHTML=list.length?`<section class="ofdCard"><div class="eyebrow">SOB SUA RESPONSABILIDADE</div><h2>Operadores menores vinculados a você</h2><div class="ofdResponsibleGrid">${list.map(o=>`<div class="ofdResponsibleCard">${photo(o)}<div><b>@${esc(o.nickname)}</b><small>${esc(o.rank||'Recruta')} · ${esc(o.function||'Operador')}</small><a data-op-route href="/operador/equipe?operator=${encodeURIComponent(o.id)}">Ver perfil</a></div></div>`).join('')}</div></section>`:'';
    bindRoutes();
  }

  function extrasFail(e){
    const games=document.getElementById('opGames'),f=document.getElementById('opFinance');
    if(games)games.innerHTML=`<div class="ofdLoadError"><p>${esc(e?.name==='AbortError'?'Os jogos demoraram para responder. As abas continuam disponíveis.':e?.message||'Não foi possível carregar os jogos agora.')}</p><button class="outlinebtn" id="opRetry" type="button">Tentar novamente</button></div>`;
    if(f)f.innerHTML='<p class="muted">Financeiro não carregou agora.</p>';
    document.getElementById('opRetry')?.addEventListener('click',loadExtras);
  }

  async function loadExtras(){
    try{renderExtras(await fetchJson('/api/operator-home-fast',8000))}catch(e){extrasFail(e)}
  }

  initial();
  fetchJson('/api/light?action=op-me',5000).then(d=>renderUser(d.user,d.instagram_url||'')).catch(e=>{
    const hero=document.getElementById('opHero');
    if(hero)hero.innerHTML=`<div class="ofdAvatar">!</div><div><div class="eyebrow">ÁREA DO OPERADOR</div><h1>Operador</h1><p class="muted">${esc(e?.name==='AbortError'?'A sessão demorou para responder, mas você pode usar as abas.':e?.message||'Não foi possível validar a sessão.')}</p></div>`;
  });
  loadExtras();
})();