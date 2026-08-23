(()=>{
  if(location.pathname!=='/operador/arena')return;

  function install(){
    const game=document.getElementById('mgV5');
    if(!game)return false;
    if(document.getElementById('mgMobileFullscreenBtn'))return true;

    const style=document.createElement('style');
    style.id='mgMobileFullscreenStyle';
    style.textContent=`
      #mgMobileFullscreenBtn{display:none}
      @media(max-width:900px),(pointer:coarse){
        #mgMobileFullscreenBtn{
          display:flex;position:fixed;right:14px;bottom:18px;z-index:99990;
          min-height:52px;padding:0 18px;border:1px solid #e0aa23;border-radius:999px;
          background:#dfa91f;color:#080a0c;font:700 15px Rajdhani,sans-serif;
          align-items:center;justify-content:center;gap:8px;box-shadow:0 10px 30px rgba(0,0,0,.5);
          touch-action:manipulation;-webkit-tap-highlight-color:transparent
        }
      }
      :fullscreen #mgMobileFullscreenBtn,
      :-webkit-full-screen #mgMobileFullscreenBtn{display:none!important}
    `;
    document.head.appendChild(style);

    const btn=document.createElement('button');
    btn.id='mgMobileFullscreenBtn';
    btn.type='button';
    btn.textContent='⛶ TELA CHEIA';
    btn.setAttribute('aria-label','Abrir mini jogo em tela cheia');
    document.body.appendChild(btn);

    async function enterFullscreen(){
      const target=document.getElementById('mgV5');
      if(!target)return;
      try{
        if(!document.fullscreenElement){
          if(target.requestFullscreen)await target.requestFullscreen();
          else if(target.webkitRequestFullscreen)target.webkitRequestFullscreen();
          if(screen.orientation?.lock){try{await screen.orientation.lock('landscape')}catch{}}
        }
      }catch(e){
        const original=document.getElementById('mgV5Full');
        if(original)original.click();
      }
    }

    btn.addEventListener('click',enterFullscreen,{passive:true});
    document.addEventListener('fullscreenchange',()=>{
      btn.style.display=document.fullscreenElement?'none':'';
    });
    document.addEventListener('webkitfullscreenchange',()=>{
      btn.style.display=document.webkitFullscreenElement?'none':'';
    });
    return true;
  }

  if(!install()){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(install()||tries>100)clearInterval(timer);
    },100);
  }
})();
