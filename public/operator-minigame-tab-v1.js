(()=>{
  const clean=p=>{const x=String(p||'/').replace(/\/+$/,'');return x||'/'};
  const path=clean(location.pathname);
  if(!path.startsWith('/operador'))return;

  const patch=()=>{
    const nav=document.querySelector('.operatorNav');
    if(!nav)return false;

    const games=nav.querySelector('a[href="/operador/jogos"]');
    let mini=nav.querySelector('a[href="/operador/arena"]');

    if(games) games.textContent='Jogos';

    if(!mini){
      mini=document.createElement('a');
      mini.href='/operador/arena';
      mini.textContent='Mini jogos';
      if(games) games.insertAdjacentElement('afterend',mini);
      else nav.appendChild(mini);
    }else{
      mini.textContent='Mini jogos';
    }

    nav.querySelectorAll('a').forEach(a=>a.classList.remove('active'));
    if(path==='/operador/arena') mini.classList.add('active');
    else if(path==='/operador/jogos'&&games) games.classList.add('active');
    else if(path==='/operador/equipe') nav.querySelector('a[href="/operador/equipe"]')?.classList.add('active');
    else if(path==='/operador/configuracoes') nav.querySelector('a[href="/operador/configuracoes"]')?.classList.add('active');
    else nav.querySelector('a[href="/operador"]')?.classList.add('active');

    return true;
  };

  patch();
  const root=document.getElementById('app')||document.body;
  const observer=new MutationObserver(()=>patch());
  observer.observe(root,{childList:true,subtree:true});
  let n=0;const timer=setInterval(()=>{n++;if(patch()||n>40)clearInterval(timer)},250);
})();
