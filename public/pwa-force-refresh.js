(()=>{
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
