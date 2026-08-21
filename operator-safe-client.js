(()=>{
  const DEFAULT_RANKS=['Recruta','Soldado','Cabo','3º Sargento','2º Sargento','1º Sargento','Subtenente','Aspirante','Tenente','Capitão','Major','Tenente-Coronel','Coronel'];
  if(!window.ranks)window.ranks=DEFAULT_RANKS;
  const safeActions=new Set(['login','me','logout','profile-data','team-members','public','operator']);
  const previousFetch=window.fetch.bind(window);
  window.fetch=(input,init)=>{
    try{
      const u=new URL(typeof input==='string'?input:input.url,location.href);
      if(u.pathname==='/api/index.js'&&u.searchParams.get('action')==='games'){
        u.pathname='/api/operator-games-safe.js';
        return previousFetch(u.toString(),init);
      }
      if(u.pathname==='/api/index.js'&&safeActions.has(u.searchParams.get('action'))){
        u.pathname='/api/operator-safe.js';
        return previousFetch(u.toString(),init);
      }
    }catch{}
    return previousFetch(input,init);
  };
  window.addEventListener('unhandledrejection',event=>{
    if(location.pathname!=='/operador'&&!location.pathname.startsWith('/operador/'))return;
    const message=event.reason?.message||String(event.reason||'Erro ao carregar o painel.');
    const app=document.getElementById('app');
    if(app&&!app.dataset.safeError){
      app.dataset.safeError='1';
      app.innerHTML=`<div class="error"><b>Não foi possível carregar o painel do operador.</b><br>${String(message).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</div>`;
    }
  });
  if(location.pathname==='/operador'){
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmt=d=>{if(!d)return 'Data não informada';const m=String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]}`:String(d)};
    const run=async()=>{
      const app=document.getElementById('app');if(!app||!String(app.innerText||'').toLowerCase().includes('carregando'))return;
      try{
        const [p,g]=await Promise.all([
          fetch('/api/operator-safe.js?action=profile-data&_safe_boot='+Date.now(),{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Sessão não encontrada.');return d}),
          fetch('/api/operator-games-safe.js?action=games&_safe_boot='+Date.now(),{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível carregar os jogos.');return d})
        ]);
        const u=p.user||{};const games=Array.isArray(g.games)?g.games:[];
        app.innerHTML=`<section class="operatorDashboard operatorBootFallback"><div class="pageTitle"><div class="pageBrand"><img class="profilePhoto big" src="${esc(u.photo_url||'/logo.webp')}" alt="Foto de ${esc(u.nickname||'Operador')}"><div><div class="eyebrow">ÁREA DO OPERADOR</div><h1>${esc(u.nickname||u.name||'Operador')}</h1>${u.name?`<div class="operatorRealName pageRealName">${esc(u.name)}</div>`:''}<p>Patente <b>${esc(u.rank||'Recruta')}</b> · ${Number(u.absences||0)} faltas</p></div></div></div><div class="operatorSubnav"><a class="goldbtn" href="/operador">Visão geral</a><a class="outlinebtn" href="/operador?tab=configuracoes">Configurações</a></div><h2 class="sectionTitle">Próximos jogos</h2><div class="stack">${games.map(x=>`<article class="card game"><div class="date">${fmt(x.game_date)}${x.game_time?' · '+esc(String(x.game_time).slice(0,5)):''}</div><h2>${esc(x.title||'Jogo')}</h2><p><b>Campo:</b> ${esc(x.field_name||x.location||'Não informado')}</p><p><b>Status:</b> ${esc(x.status||'confirmado')} · <b>Resposta:</b> ${x.response==='going'?'Vou':x.response==='not_going'?'Não vou':'Pendente'}</p><div class="gameActions"><button class="mini" data-safe-rsvp="${esc(x.id)}" data-safe-response="going">✓ Vou</button><button class="mini" data-safe-rsvp="${esc(x.id)}" data-safe-response="not_going">Não vou</button></div></article>`).join('')||'<div class="card"><p class="muted">Nenhum próximo jogo.</p></div>'}</div><div class="card"><div class="cardKicker">MEU PERFIL</div><h2>Informações do operador</h2><div class="profileStats"><div><b>Nome</b><span>${esc(u.name||'Não informado')}</span></div><div><b>Patente</b><span>${esc(u.rank||'Recruta')}</span></div><div><b>Airsoft</b><span>${u.airsoft_years?esc(u.airsoft_years)+' anos':'Não informado'}</span></div><div><b>Estilo</b><span>${esc(u.play_style||'Não informado')}</span></div></div><div class="heroActions"><a class="goldbtn" href="/operador?tab=configuracoes">Abrir configurações</a><a class="outlinebtn" href="/visitantes?operator=${encodeURIComponent(u.id||'')}">Ver meu perfil público</a></div></div></section>`;
        app.querySelectorAll('[data-safe-rsvp]').forEach(b=>b.onclick=async()=>{try{const r=await fetch('/api/index.js?action=rsvp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game_id:b.dataset.safeRsvp,response:b.dataset.safeResponse})});if(!r.ok){const d=await r.json();throw Error(d.error||'Não foi possível registrar.')}location.reload()}catch(e){alert(e.message)}});
      }catch(e){console.warn('Resgate do operador falhou:',e)}
    };
    setTimeout(run,3000);setTimeout(run,7000);
  }
})();
