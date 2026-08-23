(()=>{
  if(!location.pathname.startsWith('/operador'))return;
  const previousFetch=window.fetch.bind(window);
  const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
  async function getJson(url,timeout=6500){
    const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);
    try{
      const r=await previousFetch(url,{credentials:'same-origin',cache:'no-store',signal:c.signal});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw Object.assign(new Error(d.error||'Erro ao carregar.'),{status:r.status});
      return d;
    }finally{clearTimeout(timer)}
  }
  window.fetch=async(input,init={})=>{
    try{
      const raw=typeof input==='string'?input:input?.url;if(!raw)return previousFetch(input,init);
      const u=new URL(raw,location.origin),method=String(init?.method||'GET').toUpperCase(),action=u.searchParams.get('action')||'';
      if(method==='GET'&&(u.pathname==='/api/operator-game'||u.pathname==='/api/operator-game.js')&&action==='leaderboard'){
        try{
          const [me,team]=await Promise.all([getJson('/api/light?action=op-me'),getJson('/api/light?action=op-team')]);
          return response({user:me.user,operators:team.operators||[],leaderboard:[],myBest:0,myBestLevel:1,myBestKills:0});
        }catch(e){return response({error:e?.name==='AbortError'?'O servidor demorou para responder.':e.message||'Erro ao abrir mini jogos.'},e.status||504)}
      }
      if(method==='GET'&&(u.pathname==='/api/operator-profile'||u.pathname==='/api/operator-profile.js')&&action==='team'){
        try{
          const [me,team]=await Promise.all([getJson('/api/light?action=op-me'),getJson('/api/light?action=op-team')]);
          return response({user:me.user,operators:team.operators||[],instagram_url:me.instagram_url||team.instagram_url||null});
        }catch(e){return response({error:e?.name==='AbortError'?'O servidor demorou para responder.':e.message||'Erro ao carregar operadores.'},e.status||504)}
      }
      if(method==='GET'&&(u.pathname==='/api/operator-profile'||u.pathname==='/api/operator-profile.js')&&(action==='profile'||action==='settings')){
        const c=new AbortController(),timer=setTimeout(()=>c.abort(),9000);
        try{return await previousFetch(input,{...init,signal:c.signal,cache:'no-store',credentials:init?.credentials||'same-origin'})}
        catch(e){if(e?.name==='AbortError')return response({error:'Esta área demorou para responder. Tente novamente.'},504);throw e}
        finally{clearTimeout(timer)}
      }
      return previousFetch(input,init);
    }catch(e){return previousFetch(input,init)}
  };
  const wanted=[['/operador','Visão geral'],['/operador/equipe','Ver operadores'],['/operador/jogos','Jogos'],['/operador/arena','Mini jogos'],['/operador/configuracoes','Configurações']];
  function fixNav(){
    const n=document.querySelector('.operatorNav');if(!n)return false;
    const p=location.pathname.replace(/\/+$/,'')||'/';
    const target=wanted.map(x=>x[0]).join('|'),current=[...n.querySelectorAll('a')].map(a=>a.getAttribute('href')||'').join('|');
    if(current!==target)n.innerHTML=wanted.map(([href,label])=>`<a class="${p===href?'active':''}" href="${href}">${label}</a>`).join('');
    else n.querySelectorAll('a').forEach(a=>a.classList.toggle('active',(a.getAttribute('href')||'')===p));
    return true;
  }
  if(!document.getElementById('operatorCompatCss')){
    const s=document.createElement('style');s.id='operatorCompatCss';s.textContent=`.operatorNav{position:relative!important;z-index:20!important;pointer-events:auto!important}.operatorNav a{pointer-events:auto!important;touch-action:manipulation}@media(max-width:760px){.operatorNav{display:flex!important;width:100%!important;max-width:100%!important;overflow-x:auto!important;overflow-y:hidden!important;white-space:nowrap!important;-webkit-overflow-scrolling:touch!important;scrollbar-width:thin}.operatorNav a{flex:0 0 auto!important;min-width:max-content!important}.ofdNavWrap{position:relative!important;z-index:20!important;overflow-x:auto!important;overflow-y:hidden!important;pointer-events:auto!important}}`;
    document.head.appendChild(s)
  }
  fixNav();
  const root=document.getElementById('app')||document.body;
  new MutationObserver(fixNav).observe(root,{childList:true,subtree:true});
  let i=0,t=setInterval(()=>{if(fixNav()||++i>120)clearInterval(t)},100);
})();