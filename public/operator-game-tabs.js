(()=>{
  if(!location.pathname.startsWith('/operador')||location.pathname==='/operador/arena')return;
  const patch=()=>{
    const nav=document.querySelector('.operatorNav');
    if(!nav)return false;
    const games=nav.querySelector('a[href="/operador/jogos"]');
    if(games)games.textContent='Jogos';
    const old=nav.querySelector('a[href="/operador/arena"]');
    if(old)old.remove();
    return true;
  };
  patch();
  const root=document.getElementById('app')||document.body;
  const observer=new MutationObserver(()=>patch());
  observer.observe(root,{childList:true,subtree:true});
})();
