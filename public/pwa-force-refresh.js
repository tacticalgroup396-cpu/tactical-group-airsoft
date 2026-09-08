(()=>{
  const p=(location.pathname.replace(/\/+$/,'')||'/');
  if(p==='/operador/mensalidades'&&!document.querySelector('script[data-operator-pix]')){
    const s=document.createElement('script');s.src='/operator-pix-v1.js?v=2';s.defer=true;s.dataset.operatorPix='1';document.body.appendChild(s);
  }
  if(!('serviceWorker' in navigator))return;
  const KEY='tga_pwa_refresh_v58';
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    try{
      if(sessionStorage.getItem(KEY)==='1')return;
      sessionStorage.setItem(KEY,'1');
    }catch{}
    location.reload();
  });
  window.addEventListener('load',async()=>{
    try{
      const reg=await navigator.serviceWorker.getRegistration();
      if(reg)await reg.update();
    }catch{}
  },{once:true});
})();
