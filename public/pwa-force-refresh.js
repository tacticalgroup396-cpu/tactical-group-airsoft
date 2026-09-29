(()=>{
  const p=(location.pathname.replace(/\/+$/,'')||'/');
  if(p==='/operador/mensalidades'&&!document.querySelector('script[data-operator-pix]')){
    const s=document.createElement('script');s.src='/operator-pix-v1.js?v=2';s.defer=true;s.dataset.operatorPix='1';document.body.appendChild(s);
  }
  if(!('serviceWorker' in navigator))return;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    window.dispatchEvent(new Event('tga:service-worker-updated'));
  });
})();
