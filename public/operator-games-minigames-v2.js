(()=>{
  const clean=p=>{const x=String(p||'/').replace(/\/+$/,'');return x||'/'};
  const path=clean(location.pathname);
  if(!path.startsWith('/operador')||path==='/operador/arena')return;
  if(path!=='/operador'&&path!=='/operador/jogos')return;
  const root=document.getElementById('app');if(!root)return;

  const css=()=>{if(document.getElementById('opMiniGamesV2Css'))return;const s=document.createElement('style');s.id='opMiniGamesV2Css';s.textContent=`
    .opMiniGames{overflow:hidden;position:relative}.opMiniGamesHead{display:flex;justify-content:space-between;gap:14px;align-items:flex-end;margin-bottom:14px}.opMiniGamesGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.opMiniGameCard{display:flex;min-width:0;flex-direction:column;gap:8px;padding:16px;border:1px solid #30363d;border-radius:16px;background:linear-gradient(145deg,#12171a,#0b0e10);text-decoration:none;color:inherit;transition:transform .16s ease,border-color .16s ease}.opMiniGameCard:hover{transform:translateY(-2px);border-color:#8f7327}.opMiniGameIcon{font-size:30px}.opMiniGameCard h3{margin:0}.opMiniGameCard p{margin:0;color:#98a2a9;font-size:13px;line-height:1.45}.opMiniGameAction{margin-top:auto;font-weight:700;color:#dfa91f}.opMiniGamesBadge{font-size:11px;border:1px solid #57491d;border-radius:999px;padding:5px 9px;color:#e8c75c;background:#171407;white-space:nowrap}.opMiniGamesHome .heroActions{display:flex;gap:9px;flex-wrap:wrap}.opMiniGamesHome .heroActions a{min-height:44px;display:inline-flex;align-items:center;justify-content:center}
    @media(max-width:760px){.opMiniGamesGrid{grid-template-columns:1fr}.opMiniGamesHead{align-items:flex-start;flex-direction:column}.opMiniGameCard{padding:15px}.opMiniGamesHome{margin-top:12px}.opMiniGamesHome .heroActions{display:grid;grid-template-columns:1fr}.opMiniGamesHome .heroActions a{width:100%;min-height:48px;font-size:15px}.opMiniGamesBadge{font-size:12px}.opMiniGameIcon{font-size:34px}}
  `;document.head.appendChild(s)};

  const fullSection=()=>{const el=document.createElement('section');el.className='ofdCard opMiniGames';el.id='operatorMiniGames';el.innerHTML=`<div class="opMiniGamesHead"><div><div class="eyebrow">MINI JOGOS</div><h2>Treino rápido do operador</h2><p class="muted">Mira, reflexo e sobrevivência. No celular, abra o jogo e vire o aparelho na horizontal para jogar em tela cheia.</p></div><span class="opMiniGamesBadge">PC + CELULAR</span></div><div class="opMiniGamesGrid"><a class="opMiniGameCard" href="/operador/arena?mode=arena"><span class="opMiniGameIcon">🔫</span><h3>Arena Survival</h3><p>Sobreviva a ondas de adversários representando operadores ativos do time.</p><span class="opMiniGameAction">Jogar Arena →</span></a><a class="opMiniGameCard" href="/operador/arena?mode=target"><span class="opMiniGameIcon">🎯</span><h3>Alvos Rápidos</h3><p>Teste precisão e velocidade de aquisição de alvo.</p><span class="opMiniGameAction">Treinar mira →</span></a><a class="opMiniGameCard" href="/operador/arena?mode=reflex"><span class="opMiniGameIcon">⚡</span><h3>Reflexo CQB</h3><p>Meça seu tempo de reação em rodadas rápidas.</p><span class="opMiniGameAction">Testar reflexo →</span></a></div>`;return el};

  const homeSection=()=>{const el=document.createElement('section');el.className='ofdCard opMiniGamesHome';el.id='operatorMiniGamesHome';el.innerHTML=`<div class="eyebrow">MINI JOGOS</div><h2>Treino do operador</h2><p class="muted">Agora os mini-jogos também ficam acessíveis pelo celular.</p><div class="heroActions"><a class="goldbtn" href="/operador/jogos#operatorMiniGames">Ver todos os mini-jogos</a><a class="outlinebtn" href="/operador/arena?mode=arena">🔫 Arena Survival</a><a class="outlinebtn" href="/operador/arena?mode=target">🎯 Alvos Rápidos</a><a class="outlinebtn" href="/operador/arena?mode=reflex">⚡ Reflexo CQB</a></div>`;return el};

  const patch=()=>{
    const page=root.querySelector('.ofdPage');if(!page)return false;css();
    if(path==='/operador/jogos'){
      if(document.getElementById('operatorMiniGames'))return true;
      const nav=page.querySelector('.ofdNavWrap');const firstCard=nav?.nextElementSibling||page.querySelector('.ofdCard');const el=fullSection();if(firstCard)firstCard.insertAdjacentElement('beforebegin',el);else page.appendChild(el);
      if(location.hash==='#operatorMiniGames')setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'start'}),150);
      return true;
    }
    if(path==='/operador'){
      if(document.getElementById('operatorMiniGamesHome'))return true;
      const nav=page.querySelector('.ofdNavWrap');const firstCard=nav?.nextElementSibling||page.querySelector('.ofdCard');const el=homeSection();if(firstCard)firstCard.insertAdjacentElement('beforebegin',el);else page.appendChild(el);return true;
    }
    return false;
  };

  patch();const obs=new MutationObserver(()=>patch());obs.observe(root,{childList:true,subtree:true});let tries=0;const timer=setInterval(()=>{tries++;if(patch()||tries>40)clearInterval(timer)},250);
})();
