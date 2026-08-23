(()=>{
  const p=(location.pathname.replace(/\/+$/,'')||'/');
  if(!p.startsWith('/operador')||p==='/operador/primeiro-acesso')return;

  const app=document.getElementById('app');
  const nav=document.getElementById('nav');
  const menu=document.getElementById('menuToggle');
  if(!app)return;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const loadScript=src=>new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=src;
    s.async=false;
    s.onload=resolve;
    s.onerror=()=>reject(new Error('Não foi possível carregar a área do operador.'));
    document.body.appendChild(s);
  });

  const routeScript=()=>{
    if(p==='/operador/arena')return '/operator-minigames-v5.js?v=1';
    if(p==='/operador/equipe'||p==='/operador/configuracoes')return '/operator-profile-v3.js?v=1';
    return '/operator-dashboard-fast.js?v=8';
  };

  const showLoading=()=>{
    app.innerHTML='<div class="ofdLoading"><div class="ofdSpinner"></div><b>Verificando acesso...</b><span>Aguarde um instante.</span></div>';
  };

  const showLogin=()=>{
    if(nav)nav.innerHTML='';
    menu?.setAttribute('aria-expanded','false');
    app.innerHTML=`<div class="auth"><form id="operatorLoginGate" class="modalBox accessBox"><img class="accessLogo" src="/logo.webp" alt="Logo"><div class="eyebrow">ENTRADA DO OPERADOR</div><h1>Operador</h1><a class="backLogin" href="/entrar">← Voltar</a><div id="operatorLoginError"></div><input name="identifier" autocomplete="username" placeholder="E-mail ou apelido" required><input name="password" type="password" autocomplete="current-password" placeholder="Senha" required><button class="goldbtn" type="submit">Entrar</button><a class="outlinebtn" href="/operador/primeiro-acesso">Primeiro acesso com código</a><div class="accessLinks"><a href="/visitantes">Visitante</a><a href="/">Início</a></div></form></div>`;
    const form=document.getElementById('operatorLoginGate');
    form?.addEventListener('submit',async e=>{
      e.preventDefault();
      const button=form.querySelector('button[type="submit"]');
      const err=document.getElementById('operatorLoginError');
      button.disabled=true;button.textContent='Entrando...';if(err)err.innerHTML='';
      try{
        const payload=Object.fromEntries(new FormData(form));
        const r=await fetch('/api/index.js?action=login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'same-origin',cache:'no-store'});
        const d=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(d.error||'Não foi possível entrar.');
        location.replace(p+location.search);
      }catch(x){
        if(err)err.innerHTML=`<div class="error">${esc(x.message||'Não foi possível entrar.')}</div>`;
        button.disabled=false;button.textContent='Entrar';
      }
    });
  };

  const showCheckError=message=>{
    app.innerHTML=`<div class="ofdLoadError"><h2>Não foi possível verificar o acesso</h2><p>${esc(message)}</p><button class="goldbtn" id="operatorGateRetry">Tentar novamente</button><a class="outlinebtn" href="/entrar">Voltar</a></div>`;
    document.getElementById('operatorGateRetry')?.addEventListener('click',start);
  };

  async function start(){
    showLoading();
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),8000);
    try{
      const r=await fetch('/api/light?action=op-me',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
      if(r.status===401||r.status===403){showLogin();return}
      if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error||'Servidor indisponível.')}
      await loadScript(routeScript());
    }catch(e){
      if(e?.name==='AbortError')showCheckError('O servidor demorou para responder.');
      else showCheckError(e?.message||'Erro ao verificar sua sessão.');
    }finally{clearTimeout(timer)}
  }

  start();
})();
