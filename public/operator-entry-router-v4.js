(()=>{
  const p=(location.pathname.replace(/\/+$/,'')||'/');
  if(!p.startsWith('/operador')||p==='/operador/primeiro-acesso')return;

  const app=document.getElementById('app');
  const nav=document.getElementById('nav');
  const menu=document.getElementById('menuToggle');
  if(!app)return;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=d=>{if(!d)return'';const s=String(d).slice(0,10),m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:s};
  const elo=n=>({1:['💎','Diamante'],2:['🟩','Esmeralda'],3:['🔷','Platina'],4:['🏆','Ouro'],5:['🥈','Prata'],6:['🥉','Bronze'],7:['⚙️','Ferro']}[Math.min(7,Math.max(1,Number(n)||7))]);
  const photo=u=>u?.photo_url?`<img class="ofdPhoto" src="${esc(u.photo_url)}" alt="Foto de ${esc(u.nickname||'operador')}">`:`<div class="ofdAvatar">${esc((u?.nickname||'?').slice(0,2))}</div>`;
  const tabs=active=>`<div class="ofdNavWrap"><div class="operatorNav">${[
    ['home','Visão geral','/operador'],['team','Ver operadores','/operador/equipe'],['games','Jogos','/operador/jogos'],['mini','Mini jogos','/operador/arena'],['settings','Configurações','/operador/configuracoes']
  ].map(([id,label,href])=>`<a class="${active===id?'active':''}" href="${href}">${label}</a>`).join('')}</div></div>`;

  async function requestJSON(url,options={},timeout=5500){
    const c=new AbortController();
    const timer=setTimeout(()=>c.abort(),timeout);
    try{
      const r=await fetch(url,{...options,credentials:'same-origin',cache:'no-store',signal:c.signal});
      const d=await r.json().catch(()=>({}));
      if(!r.ok){const e=new Error(d.error||'Erro ao carregar.');e.status=r.status;throw e}
      return d;
    }finally{clearTimeout(timer)}
  }

  function shell(u){
    if(!nav)return;
    nav.innerHTML=`<div class="navGroup"><a href="/visitantes">Equipe</a></div><div class="navGroup navAccess"><a class="active" href="/operador">Operador</a>${u?.role==='commander'?'<a href="/comandante">Comandante</a>':''}<button class="ghost" id="v4Logout">Sair</button></div>`;
    const close=()=>{nav.classList.remove('open');menu?.setAttribute('aria-expanded','false')};
    menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))},{once:false});
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
    document.getElementById('v4Logout')?.addEventListener('click',async()=>{try{await requestJSON('/api/index.js?action=logout',{method:'POST'},4000)}catch{}location.href='/'})
  }

  function showLogin(message=''){
    if(nav)nav.innerHTML='';
    app.innerHTML=`<div class="auth"><form id="operatorLoginV4" class="modalBox accessBox"><img class="accessLogo" src="/logo.webp" alt="Logo"><div class="eyebrow">ENTRADA DO OPERADOR</div><h1>Operador</h1>${message?`<div class="error">${esc(message)}</div>`:''}<input name="identifier" autocomplete="username" placeholder="E-mail ou apelido" required><input name="password" type="password" autocomplete="current-password" placeholder="Senha" required><button class="goldbtn" type="submit">Entrar</button><a class="outlinebtn" href="/operador/primeiro-acesso">Primeiro acesso com código</a><a class="backLogin" href="/entrar">← Voltar</a></form></div>`;
    const form=document.getElementById('operatorLoginV4');
    form?.addEventListener('submit',async e=>{
      e.preventDefault();
      const b=form.querySelector('button[type="submit"]');
      b.disabled=true;b.textContent='Entrando...';
      try{
        await requestJSON('/api/index.js?action=login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))},8000);
        location.replace('/operador?login=ok&t='+Date.now());
      }catch(err){
        showLogin(err?.name==='AbortError'?'O login demorou para responder. Tente novamente.':err.message||'Não foi possível entrar.');
      }
    });
  }

  function showCheck(){app.innerHTML='<div class="ofdLoading"><div class="ofdSpinner"></div><b>Verificando acesso...</b><span>Aguarde no máximo alguns segundos.</span></div>'}
  function showCheckError(message){app.innerHTML=`<div class="ofdLoadError"><h2>Não foi possível abrir sua área</h2><p>${esc(message)}</p><button class="goldbtn" id="v4Retry">Tentar novamente</button><button class="outlinebtn" id="v4Login">Fazer login novamente</button></div>`;document.getElementById('v4Retry')?.addEventListener('click',start);document.getElementById('v4Login')?.addEventListener('click',()=>showLogin())}

  function hero(u){const e=elo(u.elo_level);return `<div class="ofdHero">${photo(u)}<div><div class="eyebrow">ÁREA DO OPERADOR</div><h1>${esc(u.nickname||'OPERADOR')}</h1>${u.name?`<p class="ofdName">${esc(u.name)}</p>`:''}<p>Patente <b>${esc(u.rank||'Recruta')}</b> · ${Number(u.absences)||0} faltas · ${e[0]} Elo ${Number(u.elo_level)||7} · ${e[1]}</p></div></div>`}

  const gameHtml=g=>`<article class="ofdGame"><div class="ofdGameHead"><div><div class="eyebrow">${fmt(g.game_date)}</div><h3>${esc(g.title)}</h3><p>${esc(g.field_name||g.location||'Local não informado')}</p></div><span class="ofdResponse">${g.response==='going'?'✅ Vou':g.response==='not_going'?'❌ Não vou':'⏳ Não respondeu'}</span></div><div class="ofdGameSummary"><span>✅ ${(g.participants||[]).length} vão</span><span>❌ ${(g.not_going_participants||[]).length} não vão</span><span>⏳ ${(g.pending_participants||[]).length} pendentes</span></div></article>`;

  async function fillHome(all=false){
    const box=document.getElementById(all?'gamesList':'homeGames');
    const fin=document.getElementById('homeFinance');
    try{
      const d=await requestJSON('/api/operator-home-fast?dashboard=1&t='+Date.now(),{},7000);
      if(box)box.innerHTML=(d.games||[]).map(gameHtml).join('')||'<p class="muted">Nenhum jogo ativo.</p>';
      if(fin){const f=d.finance;fin.innerHTML=f?`<h2>${f.status==='paid'?'Mensalidade em dia':f.status==='overdue'?'Mensalidade atrasada':'Mensalidade pendente'}</h2><p>${Number(f.amount||0).toLocaleString('pt-BR',{style:'currency',currency:d.financeSettings?.currency||'BRL'})} · vencimento ${fmt(f.due_date)}</p>`:'<h2>Sem cobrança pendente</h2>'}
    }catch{
      if(box)box.innerHTML='<p class="muted">Jogos temporariamente indisponíveis. Sua área continua funcionando.</p>';
      if(fin)fin.innerHTML='<p class="muted">Financeiro temporariamente indisponível.</p>';
    }
  }

  function renderHome(u){
    shell(u);const e=elo(u.elo_level);
    app.innerHTML=`<section class="ofdPage">${hero(u)}${tabs('home')}<section class="ofdCard ofdProgress"><div class="eyebrow">PROGRESSÃO</div><h2>${e[0]} ${esc(u.rank||'Recruta')} · Elo ${Number(u.elo_level)||7} ${e[1]}</h2><div class="ofdStats"><span><b>${Number(u.games_count)||0}</b> jogos</span><span><b>${Number(u.absences)||0}</b> faltas</span><span><b>${u.age??'—'}</b> anos</span></div></section><section class="ofdCard"><div class="eyebrow">PRÓXIMOS JOGOS</div><h2>Presença e escalação</h2><div id="homeGames"><p class="muted">Buscando próximos jogos...</p></div></section><section class="ofdCard"><div class="eyebrow">FINANCEIRO</div><div id="homeFinance"><p class="muted">Buscando situação financeira...</p></div></section></section>`;
    fillHome(false)
  }

  function renderGames(u){
    shell(u);
    app.innerHTML=`<section class="ofdPage">${hero(u)}${tabs('games')}<section class="ofdCard"><div class="eyebrow">JOGOS</div><h2>Presença e escalação</h2><div id="gamesList"><p class="muted">Buscando jogos...</p></div></section></section>`;
    fillHome(true)
  }

  const loadScript=src=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=ok;s.onerror=()=>no(new Error('Não foi possível abrir esta aba.'));document.body.appendChild(s)});
  async function route(u){
    if(p==='/operador')return renderHome(u);
    if(p==='/operador/jogos')return renderGames(u);
    if(p==='/operador/arena')return loadScript('/operator-minigames-v5.js?v=4');
    if(p==='/operador/equipe'||p==='/operador/configuracoes')return loadScript('/operator-profile-v3.js?v=4');
    location.replace('/operador');
  }

  async function start(){
    showCheck();
    try{
      const me=await requestJSON('/api/operator-home-fast?action=me&v=4&t='+Date.now(),{},5500);
      await route(me.user);
    }catch(err){
      if(err.status===401||err.status===403){showLogin();return}
      showCheckError(err?.name==='AbortError'?'O servidor demorou para confirmar a sessão.':err.message||'Erro ao verificar sua sessão.');
    }
  }

  start();
})();