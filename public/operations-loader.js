(()=>{
  const ensureOperatorTeamTab=()=>{
    if(location.pathname!=='/operador')return;
    const nav=document.querySelector('.operatorNav');
    if(!nav||nav.querySelector('a[href="/operador/equipe"]'))return;
    const settings=nav.querySelector('a[href="/operador/configuracoes"]');
    const a=document.createElement('a');
    a.href='/operador/equipe';
    a.textContent='Operadores do time';
    if(settings)nav.insertBefore(a,settings);else nav.appendChild(a);
  };
  const loadFeatures=()=>{
    if(document.getElementById('operationsFeaturesScript'))return;
    const s=document.createElement('script');
    s.id='operationsFeaturesScript';
    s.src='/operations-features.js?v=3';
    s.defer=true;
    document.body.appendChild(s);
  };
  const boot=()=>{
    ensureOperatorTeamTab();
    if(location.pathname==='/operador'||location.pathname==='/operador/equipe'||location.pathname==='/comandante/jogos')loadFeatures();
  };
  setTimeout(boot,700);
  setTimeout(boot,1600);
  setTimeout(boot,3000);
})();
