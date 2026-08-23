(()=>{
  const nativeFetch=window.fetch.bind(window);
  const direct=(url,init={})=>nativeFetch(url,{...init,cache:'no-store',credentials:init?.credentials||'same-origin'});
  window.fetch=(input,init={})=>{
    try{
      const raw=typeof input==='string'?input:input?.url;
      if(!raw)return nativeFetch(input,init);
      const u=new URL(raw,location.origin);
      const method=String(init?.method||'GET').toUpperCase();
      let mapped='';
      if((u.pathname==='/api/index.js'||u.pathname==='/api/index')&&method==='GET'){
        const a=u.searchParams.get('action');
        if(a==='me')return direct('/api/light?action=op-me',init);
        if(a==='profile-data')return direct('/api/operator-profile?action=settings',init);
        if(a==='games')return direct('/api/operator-home-fast',init);
        if(a==='public')mapped='public';
        else if(a==='commander')mapped='commander';
      }else if((u.pathname==='/api/operator-dashboard'||u.pathname==='/api/operator-dashboard.js')&&method==='GET'){
        const a=u.searchParams.get('action')||'dashboard';
        if(a==='dashboard')return direct('/api/operator-home-fast',init);
        if(a==='team')mapped='op-team';
        else if(a==='me')mapped='op-me';
      }else if((u.pathname==='/api/operator-game'||u.pathname==='/api/operator-game.js')){
        const a=u.searchParams.get('action')||'leaderboard';
        if(method==='GET'&&a==='leaderboard')mapped='arena-leaderboard';
        else if(method==='POST'&&a==='score')mapped='arena-score';
      }
      if(!mapped)return nativeFetch(input,init);
      const target=new URL('/api/light',location.origin);
      target.searchParams.set('action',mapped);
      const next={...init};
      if(mapped==='public')delete next.cache;
      return nativeFetch(target.pathname+target.search,next);
    }catch(e){return nativeFetch(input,init)}
  };

  const completeOperatorNav=()=>{
    const nav=document.querySelector('.operatorNav');
    if(!nav)return false;
    const home=nav.querySelector('a[href="/operador"]');
    const settings=nav.querySelector('a[href="/operador/configuracoes"]');
    if(!home||!settings)return false;
    const wanted=[
      ['/operador/equipe','Ver operadores'],
      ['/operador/jogos','Jogos'],
      ['/operador/arena','Mini jogos']
    ];
    for(const [href,label] of wanted){
      let a=nav.querySelector(`a[href="${href}"]`);
      if(!a){a=document.createElement('a');a.href=href;a.textContent=label;settings.insertAdjacentElement('beforebegin',a)}
      else a.textContent=label;
    }
    const p=location.pathname.replace(/\/+$/,'')||'/';
    nav.querySelectorAll('a').forEach(a=>a.classList.toggle('active',(a.getAttribute('href')||'')===p));
    return true;
  };
  const root=document.getElementById('app')||document.body;
  completeOperatorNav();
  new MutationObserver(()=>completeOperatorNav()).observe(root,{childList:true,subtree:true});
})();
