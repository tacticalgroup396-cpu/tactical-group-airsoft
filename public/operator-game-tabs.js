(()=>{
  if(!location.pathname.startsWith('/operador')||location.pathname==='/operador/arena')return;
  const patch=()=>{
    const nav=document.querySelector('.operatorNav');
    if(!nav)return false;
    const matches=nav.querySelector('a[href="/operador/jogos"]');
    if(matches&&matches.textContent!=='Partidas')matches.textContent='Partidas';
    if(!nav.querySelector('a[href="/operador/arena"]')){
      const a=document.createElement('a');
      a.href='/operador/arena';
      a.textContent='Jogos';
      if(matches)matches.insertAdjacentElement('afterend',a);else nav.appendChild(a);
    }
    return true;
  };
  patch();
  const root=document.getElementById('app')||document.body;
  const observer=new MutationObserver(()=>patch());
  observer.observe(root,{childList:true,subtree:true});
})();
