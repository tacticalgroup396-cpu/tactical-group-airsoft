(()=>{
  const path=(location.pathname.replace(/\/+$/,'')||'/');
  if(path!=='/comandante/historico')return;
  const app=document.getElementById('app');if(!app)return;
  let busy=false,timer=null,lastTry=0;

  function hideLegacy(){
    const detailed=document.getElementById('gameHistorySection');
    if(!detailed)return false;
    const host=detailed.parentElement;
    if(host){
      const old=host.querySelector(':scope > .stack');
      if(old)old.style.display='none';
      [...host.children].forEach(el=>{
        if(el===detailed)return;
        const txt=(el.textContent||'').trim().toLowerCase();
        if((txt.includes('nenhum jogo finalizado')||txt.includes('nenhum jogo encerrado'))&&!el.closest('#gameHistorySection'))el.style.display='none';
      });
    }
    return true;
  }

  function schedule(delay=120){
    clearTimeout(timer);
    timer=setTimeout(ensureHistory,delay);
  }

  function ensureHistory(){
    if(hideLegacy())return;
    if(busy)return;
    const now=Date.now();
    if(now-lastTry<700){schedule(750);return}
    lastTry=now;busy=true;
    const s=document.createElement('script');
    s.src='/game-history-v1.js?v=5&restore='+now;
    s.async=false;
    s.dataset.historyRestore='1';
    s.onload=()=>{
      s.remove();
      setTimeout(()=>{busy=false;if(!hideLegacy())schedule(250)},2100);
    };
    s.onerror=()=>{s.remove();busy=false;schedule(1200)};
    document.body.appendChild(s);
  }

  const obs=new MutationObserver(()=>schedule(80));
  obs.observe(app,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(50),{once:true});
  else schedule(50);
  setTimeout(ensureHistory,900);
  setTimeout(ensureHistory,2300);
})();
