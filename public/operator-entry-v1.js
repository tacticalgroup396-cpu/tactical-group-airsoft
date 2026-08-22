(()=>{
  const p=(location.pathname.replace(/\/+$/,'')||'/');
  if(p!=='/operador') return;
  const app=document.getElementById('app'), nav=document.getElementById('nav'), menu=document.getElementById('menuToggle');
  if(!app||!nav) return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=d=>{if(!d)return'';const s=String(d).slice(0,10),m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:s};
  const tm=t=>t?String(t).slice(0,5):'';
  const elo=n=>({1:'💎 Diamante',2:'🟩 Esmeralda',3:'🔷 Platina',4:'🏆 Ouro',5:'🥈 Prata',6:'🥉 Bronze',7:'⚙️ Ferro'}[Math.min(7,Math.max(1,Number(n)||7))]);
  const go=href=>{location.href=href};
  function top(user){
    nav.innerHTML=`<div class="navGroup"><a href="/visitantes">Equipe</a></div><div class="navGroup navAccess"><a class="active" href="/operador">Operador</a>${user?.role==='commander'?'<a href="/comandante">Comandante</a>':''}<button class="ghost" id="entryLogout" type="button">Sair</button></div>`;
    menu?.addEventListener('click',()=>{const o=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(o))});
    document.getElementById('entryLogout')?.addEventListener('click',async()=>{try{await fetch('/api/operator-dashboard?action=logout',{method:'POST',credentials:'same-origin',cache:'no-store'})}catch{}location.href='/'});
  }
  function subnav(){return `<div class="ofdNavWrap"><div class="operatorNav"><a class="active" href="/operador">Visão geral</a><a href="/operador/equipe">Ver operadores</a><a href="/operador/jogos">Jogos</a><a href="/operador/arena">Mini jogos</a><a href="/operador/configuracoes">Configurações</a></div></div>`}
  function renderBase(){
    top(null);
    app.innerHTML=`<section class="ofdPage"><div class="ofdHero"><div class="ofdAvatar" id="entryAvatar">OP</div><div><div class="eyebrow">ÁREA DO OPERADOR</div><h1 id="entryTitle">Visão geral</h1><p id="entrySubtitle">Área liberada. Carregando seu perfil em segundo plano...</p></div></div>${subnav()}<section class="ofdCard"><div class="eyebrow">PROGRESSÃO</div><h2 id="entryProfile">Perfil do operador</h2><div id="entryStats" class="ofdStats"><span>Carregando dados...</span></div></section><section class="ofdCard"><div class="eyebrow">PRÓXIMOS JOGOS</div><h2>Presença e escalação</h2><div id="entryGames"><p class="muted">Buscando próximos jogos em segundo plano...</p></div><div class="heroActions"><a class="goldbtn" href="/operador/jogos">Abrir Jogos</a><a class="outlinebtn" href="/operador/arena">Abrir Mini jogos</a></div></section><section class="ofdCard"><div class="eyebrow">FINANCEIRO</div><div id="entryFinance"><p class="muted">Carregando situação financeira...</p></div></section></section>`;
    document.querySelectorAll('.operatorNav a,.heroActions a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();go(a.getAttribute('href'))}));
  }
  async function get(url,timeout=5000){const c=new AbortController(),id=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:c.signal});const text=await r.text();let d={};try{d=text?JSON.parse(text):{}}catch{}if(!r.ok)throw new Error(d.error||`Erro ${r.status}`);return d}finally{clearTimeout(id)}}
  function applyUser(u,instagram){
    if(!u)return;
    top(u);
    const lvl=Math.min(7,Math.max(1,Number(u.elo_level)||7));
    document.getElementById('entryTitle').textContent=u.nickname?`@${u.nickname}`:'Visão geral';
    document.getElementById('entrySubtitle').textContent=u.name||'Operador ativo';
    const av=document.getElementById('entryAvatar');
    if(u.photo_url){av.outerHTML=`<img class="ofdPhoto" id="entryAvatar" src="${esc(u.photo_url)}" alt="Foto de ${esc(u.nickname||'operador')}">`}else av.textContent=String(u.nickname||'OP').slice(0,2).toUpperCase();
    document.getElementById('entryProfile').textContent=`${u.rank||'Recruta'} · Elo ${lvl} ${elo(lvl)}`;
    document.getElementById('entryStats').innerHTML=`<span><b>${Number(u.games_count)||0}</b> jogos</span><span><b>${Number(u.absences)||0}</b> faltas</span><span><b>${u.age??'—'}</b> anos</span>`;
    if(instagram){const el=document.getElementById('instagramHeader');if(el)el.innerHTML=` · <a href="${esc(instagram)}" target="_blank" rel="noopener">Instagram</a>`}
  }
  function applyDashboard(d){
    if(d?.user)applyUser(d.user,d.instagram_url);
    const games=d?.games||[];
    document.getElementById('entryGames').innerHTML=games.length?games.slice(0,3).map(g=>`<article class="ofdGame"><div class="ofdGameHead"><div><div class="eyebrow">${fmt(g.game_date)}${g.game_time?' · '+tm(g.game_time):''}</div><h3>${esc(g.title||'Jogo')}</h3><p>${esc(g.field_name||g.location||'Campo não informado')}</p></div><span class="ofdResponse">${g.response==='going'?'✅ Vou':g.response==='not_going'?'❌ Não vou':'⏳ Não respondeu'}</span></div></article>`).join(''):'<p class="muted">Nenhum jogo ativo.</p>';
    const f=d?.finance;
    document.getElementById('entryFinance').innerHTML=f?`<h2>${f.status==='paid'?'Mensalidade em dia':f.status==='waived'?'Mensalidade isenta':f.status==='overdue'?'Mensalidade atrasada':'Mensalidade pendente'}</h2><p>${Number(f.amount||0).toLocaleString('pt-BR',{style:'currency',currency:d.financeSettings?.currency||'BRL'})}${f.due_date?' · vencimento '+fmt(f.due_date):''}</p>`:'<p class="muted">Nenhuma cobrança ativa encontrada.</p>';
  }
  renderBase();
  get('/api/light?action=op-me',4500).then(d=>applyUser(d.user,d.instagram_url)).catch(e=>{
    document.getElementById('entrySubtitle').textContent=e.message||'Não foi possível atualizar o perfil agora.';
    document.getElementById('entryStats').innerHTML='<span>As abas continuam disponíveis normalmente.</span>';
  });
  get('/api/light?action=op-dashboard',6500).then(applyDashboard).catch(()=>{
    document.getElementById('entryGames').innerHTML='<p class="muted">Os dados dos jogos demoraram para responder. Use o botão “Abrir Jogos”.</p>';
    document.getElementById('entryFinance').innerHTML='<p class="muted">Financeiro será carregado quando o servidor responder.</p>';
  });
})();
