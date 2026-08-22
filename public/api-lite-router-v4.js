(()=>{
  const nativeFetch=window.fetch.bind(window);
  const dashboardFetch=(init={})=>{
    const fastCtrl=new AbortController();
    const fastTimer=setTimeout(()=>fastCtrl.abort(),4500);
    const fastInit={...init,signal:fastCtrl.signal,cache:'no-store'};
    return nativeFetch('/api/operator-home-fast',fastInit).then(async r=>{
      clearTimeout(fastTimer);
      if(r.ok)return r;
      return nativeFetch('/api/light?action=op-dashboard',{...init,cache:'no-store'});
    }).catch(()=>{
      clearTimeout(fastTimer);
      return nativeFetch('/api/light?action=op-dashboard',{...init,cache:'no-store'});
    });
  };
  window.fetch=(input,init={})=>{
    try{
      const raw=typeof input==='string'?input:input?.url;if(!raw)return nativeFetch(input,init);
      const u=new URL(raw,location.origin),method=String(init?.method||'GET').toUpperCase();let mapped='';
      if((u.pathname==='/api/index.js'||u.pathname==='/api/index')&&method==='GET'){
        const a=u.searchParams.get('action');if(a==='public')mapped='public';else if(a==='commander')mapped='commander';
      }else if((u.pathname==='/api/operator-dashboard'||u.pathname==='/api/operator-dashboard.js')&&method==='GET'){
        const a=u.searchParams.get('action')||'dashboard';if(a==='dashboard')mapped='op-dashboard';else if(a==='team')mapped='op-team';else if(a==='me')mapped='op-me';
      }else if((u.pathname==='/api/operator-game'||u.pathname==='/api/operator-game.js')){
        const a=u.searchParams.get('action')||'leaderboard';if(method==='GET'&&a==='leaderboard')mapped='arena-leaderboard';else if(method==='POST'&&a==='score')mapped='arena-score';
      }
      if(!mapped)return nativeFetch(input,init);
      if(mapped==='op-dashboard')return dashboardFetch(init);
      const target=new URL('/api/light',location.origin);target.searchParams.set('action',mapped);
      const next={...init};if(mapped==='public')delete next.cache;
      return nativeFetch(target.pathname+target.search,next);
    }catch(e){return nativeFetch(input,init)}
  };
})();
