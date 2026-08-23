(()=>{
  if(!location.pathname.startsWith('/operador'))return;
  const previousFetch=window.fetch.bind(window);
  const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
  async function getJson(url,timeout=4000){const c=new AbortController();let timer;const timeoutP=new Promise((_,rej)=>{timer=setTimeout(()=>{c.abort();const e=new Error('Tempo limite.');e.code='TIMEOUT';rej(e)},timeout)});try{return await Promise.race([(async()=>{const r=await previousFetch(url,{credentials:'same-origin',cache:'no-store',signal:c.signal});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||'Erro ao carregar.');e.status=r.status;throw e}return d})(),timeoutP])}finally{clearTimeout(timer)}}
  window.fetch=async(input,init={})=>{
    try{
      const raw=typeof input==='string'?input:input?.url;if(!raw)return previousFetch(input,init);
      const u=new URL(raw,location.origin),method=String(init?.method||'GET').toUpperCase(),action=u.searchParams.get('action')||'';
      if(method==='GET'&&(u.pathname==='/api/operator-game'||u.pathname==='/api/operator-game.js')&&action==='leaderboard'){
        const [meR,teamR]=await Promise.allSettled([getJson('/api/operator-home-fast?action=me&compat=2&ts='+Date.now()),getJson('/api/light?action=op-team&compat=2&ts='+Date.now())]);
        if(meR.status!=='fulfilled')return response({error:meR.reason?.message||'Não foi possível abrir mini jogos.'},meR.reason?.status||504);
        const me=meR.value,team=teamR.status==='fulfilled'?teamR.value:{operators:[]};
        const operators=(team.operators||[]).length?team.operators:[me.user];
        return response({user:me.user,operators,leaderboard:[],myBest:0,myBestLevel:1,myBestKills:0});
      }
      if(method==='GET'&&(u.pathname==='/api/operator-profile'||u.pathname==='/api/operator-profile.js')&&action==='team'){
        const [meR,teamR]=await Promise.allSettled([getJson('/api/operator-home-fast?action=me&compat=2&ts='+Date.now()),getJson('/api/light?action=op-team&compat=2&ts='+Date.now())]);
        if(meR.status!=='fulfilled')return response({error:meR.reason?.message||'Não foi possível carregar operadores.'},meR.reason?.status||504);
        const team=teamR.status==='fulfilled'?teamR.value:{operators:[]};
        return response({user:meR.value.user,operators:team.operators||[],instagram_url:team.instagram_url||null});
      }
      if(method==='GET'&&(u.pathname==='/api/operator-profile'||u.pathname==='/api/operator-profile.js')&&(action==='profile'||action==='settings')){
        const c=new AbortController();const timer=setTimeout(()=>c.abort(),7000);
        try{return await previousFetch(input,{...init,signal:c.signal,cache:'no-store',credentials:init?.credentials||'same-origin'})}
        catch(e){if(e?.name==='AbortError')return response({error:'Esta área demorou para responder. Tente novamente.'},504);throw e}
        finally{clearTimeout(timer)}
      }
      return previousFetch(input,init);
    }catch(e){return previousFetch(input,init)}
  };
  const wanted=[['/operador','Visão geral'],['/operador/equipe','Ver operadores'],['/operador/jogos','Jogos'],['/operador/arena','Mini jogos'],['/operador/configuracoes','Configurações']];
  function fixNav(){const n=document.querySelector('.operatorNav');if(!n)return false;const p=location.pathname.replace(/\/+$/,'')||'/';const target=wanted.map(x=>x[0]).join('|'),current=[...n.querySelectorAll('a')].map(a=>a.getAttribute('href')||'').join('|');if(current!==target)n.innerHTML=wanted.map(([href,label])=>`<a class="${p===href?'active':''}" href="${href}">${label}</a>`).join('');else n.querySelectorAll('a').forEach(a=>a.classList.toggle('active',(a.getAttribute('href')||'')===p));return true}
  if(!document.getElementById('operatorCompatCssV2')){const s=document.createElement('style');s.id='operatorCompatCssV2';s.textContent=`.operatorNav{position:relative!important;z-index:20!important;pointer-events:auto!important}.operatorNav a{pointer-events:auto!important;touch-action:manipulation}@media(max-width:760px){.operatorNav{display:flex!important;width:100%!important;max-width:100%!important;overflow-x:auto!important;overflow-y:hidden!important;white-space:nowrap!important;-webkit-overflow-scrolling:touch!important;scrollbar-width:thin}.operatorNav a{flex:0 0 auto!important;min-width:max-content!important}.ofdNavWrap{position:relative!important;z-index:20!important;overflow-x:auto!important;overflow-y:hidden!important;pointer-events:auto!important}}`;document.head.appendChild(s)}
  fixNav();const root=document.getElementById('app')||document.body;new MutationObserver(fixNav).observe(root,{childList:true,subtree:true});let i=0,t=setInterval(()=>{if(fixNav()||++i>120)clearInterval(t)},100);
})();