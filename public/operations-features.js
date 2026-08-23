(()=>{
  const load=()=>{
    if(document.querySelector('script[data-tga-enhancements]'))return;
    const s=document.createElement('script');
    s.src='/tga-enhancements.js?v=3';
    s.defer=true;
    s.dataset.tgaEnhancements='1';
    document.body.appendChild(s);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
