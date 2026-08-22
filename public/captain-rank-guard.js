(()=>{
  if(!location.pathname.startsWith('/comandante'))return;
  const ranks=['Recruta','Soldado','Cabo','3º Sargento','2º Sargento','1º Sargento','Subtenente','Aspirante','Tenente','Capitão','Major','Tenente-Coronel','Coronel'];
  const captainIndex=ranks.indexOf('Capitão');
  const app=document.getElementById('app');
  let allowed=false;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hideRankAccess=()=>{
    document.querySelectorAll('a[href="/comandante/patentes-elos"]').forEach(a=>{if(!allowed)a.remove()});
    if(!allowed)document.querySelectorAll('[data-rank]').forEach(el=>{el.disabled=true;el.title='Apenas Capitão ou patente superior pode alterar patentes.'});
  };
  const denyPage=user=>{
    if(allowed||location.pathname!=='/comandante/patentes-elos'||!app)return;
    app.innerHTML=`<section><div class="pageTitle"><div class="pageBrand"><img src="/logo.webp" alt="Tactical Group Airsoft"><div><div class="eyebrow">ACESSO RESTRITO</div><h1>Patentes e Elos</h1><p>Esta área é liberada somente quando o comandante alcançar a patente de Capitão.</p></div></div></div><div class="card"><h2>🔒 Acesso do Capitão</h2><p>Sua patente atual é <b>${esc(user?.rank||'Não informada')}</b>.</p><p class="muted">Ao alcançar Capitão, esta área será liberada automaticamente para gerenciamento de patentes. Patentes superiores a Capitão também mantêm o acesso.</p><a class="goldbtn" href="/comandante/equipe">Voltar para Equipe</a></div></section>`;
  };
  fetch('/api/index.js?action=me&_captain_guard='+Date.now(),{cache:'no-store',credentials:'same-origin'})
    .then(r=>r.json()).then(d=>{
      const user=d.user||{};
      const idx=ranks.indexOf(user.rank||'');
      allowed=user.role==='commander'&&idx>=captainIndex;
      if(!allowed){
        const originalFetch=window.fetch.bind(window);
        window.fetch=(input,init)=>{
          try{
            const u=new URL(typeof input==='string'?input:input.url,location.href);
            if(u.pathname==='/api/index.js'&&u.searchParams.get('action')==='rank'){
              return Promise.resolve(new Response(JSON.stringify({error:'Apenas Capitão ou patente superior pode alterar patentes.'}),{status:403,headers:{'Content-Type':'application/json'}}));
            }
          }catch{}
          return originalFetch(input,init);
        };
      }
      hideRankAccess();denyPage(user);
      new MutationObserver(()=>{hideRankAccess();denyPage(user)}).observe(document.body,{childList:true,subtree:true});
    }).catch(()=>{});
})();
