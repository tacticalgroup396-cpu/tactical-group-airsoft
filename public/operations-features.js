(()=>{
  const load=()=>{
    document.getElementById('missionDirectLink')?.remove();
    if(document.querySelector('script[data-tga-enhancements]'))return;
    const s=document.createElement('script');
    s.src='/tga-enhancements.js?v=1';
    s.defer=true;
    s.dataset.tgaEnhancements='1';
    document.body.appendChild(s);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
  if(location.pathname==='/comandante/jogos'){
    const mo=new MutationObserver(()=>document.getElementById('missionDirectLink')?.remove());
    mo.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  }
})();
