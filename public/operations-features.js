(()=>{
  const hideLegacyMissionLink=()=>{
    if(document.getElementById('tgaLegacyMissionHide'))return;
    const style=document.createElement('style');
    style.id='tgaLegacyMissionHide';
    style.textContent='#missionDirectLink{display:none!important}';
    document.head.appendChild(style);
  };
  const load=()=>{
    hideLegacyMissionLink();
    if(document.querySelector('script[data-tga-enhancements]'))return;
    const s=document.createElement('script');
    s.src='/tga-enhancements.js?v=2';
    s.defer=true;
    s.dataset.tgaEnhancements='1';
    document.body.appendChild(s);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
