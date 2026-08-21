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
  window.addEventListener('unhandledrejection',event=>{
    if(location.pathname!=='/operador'&& !location.pathname.startsWith('/operador/'))return;
    const message=event.reason?.message||String(event.reason||'Erro ao carregar o painel.');
    const app=document.getElementById('app');
    if(app&&!app.dataset.safeError){
      app.dataset.safeError='1';
      app.innerHTML=`<div class="error"><b>Não foi possível carregar o painel do operador.</b><br>${String(message).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</div>`;
    }
  });
})();
