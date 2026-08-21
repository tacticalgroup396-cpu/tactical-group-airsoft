(()=>{
  const safeActions=new Set(['login','me','logout','profile-data','team-members','games','public','operator']);
  const previousFetch=window.fetch.bind(window);
  window.fetch=(input,init)=>{
    try{
      const u=new URL(typeof input==='string'?input:input.url,location.href);
      if(u.pathname==='/api/index.js'&&safeActions.has(u.searchParams.get('action'))){
        u.pathname='/api/operator-safe.js';
        return previousFetch(u.toString(),init);
      }
    }catch{}
    return previousFetch(input,init);
  };
})();
