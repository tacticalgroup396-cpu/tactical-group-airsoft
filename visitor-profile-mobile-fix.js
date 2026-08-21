(()=>{
  // Navegação robusta dos perfis públicos, especialmente em celulares/PWA.
  // Usa navegação completa para evitar que o roteador/overlay do SPA intercepte o toque.
  const go=(e)=>{
    if(location.pathname!=='/visitantes')return;
    const card=e.target?.closest?.('a.visitorCard[href*="operator="]');
    if(!card)return;
    const href=card.getAttribute('href');
    if(!href)return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    window.location.assign(href);
  };
  document.addEventListener('click',go,true);
  document.addEventListener('pointerup',go,true);
})();
