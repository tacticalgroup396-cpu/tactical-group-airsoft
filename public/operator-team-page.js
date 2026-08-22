(()=>{
  if(!location.pathname.startsWith('/operador'))return;
  const fixLinks=()=>{
    document.querySelectorAll('.operatorNav a').forEach(a=>{
      const t=(a.textContent||'').trim().toLowerCase();
      if(t==='ver operadores'||t==='ver time'||t==='equipe'){
        a.href='/operador/equipe';
        a.textContent='Ver operadores';
      }
    });
  };
  document.addEventListener('click',e=>{
    const a=e.target.closest('.operatorNav a');
    if(!a)return;
    const t=(a.textContent||'').trim().toLowerCase();
    if(t==='ver operadores'||t==='ver time'||t==='equipe'){
      e.preventDefault();
      e.stopImmediatePropagation();
      location.assign('/operador/equipe');
    }
  },true);
  const load=()=>{
    fixLinks();
    if(!document.querySelector('script[data-tga-enhancements]')){
      const s=document.createElement('script');
      s.src='/tga-enhancements.js?v=1';
      s.defer=true;
      s.dataset.tgaEnhancements='1';
      document.body.appendChild(s);
    }
    const host=document.getElementById('app')||document.body;
    new MutationObserver(fixLinks).observe(host,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
