(()=>{
  if(!location.pathname.startsWith('/comandante'))return;
  if(document.getElementById('commanderContrastCss'))return;
  const s=document.createElement('style');s.id='commanderContrastCss';s.textContent=`
    .outlinebtn:not(:disabled),a.outlinebtn,.commandGame .mini:not(.danger):not(:disabled),#tgaMissionHub .mini:not(.danger):not(:disabled),.tgaCurrentGame .outlinebtn:not(:disabled){color:#f4f6f7!important;background:#171b1f!important;border-color:#6f7780!important;opacity:1!important;text-shadow:none!important}
    .outlinebtn:not(:disabled):hover,a.outlinebtn:hover,.commandGame .mini:not(.danger):not(:disabled):hover,#tgaMissionHub .mini:not(.danger):not(:disabled):hover,.tgaCurrentGame .outlinebtn:not(:disabled):hover{color:#fff!important;border-color:#d9a326!important;background:#20252a!important}
    button:disabled,.outlinebtn:disabled,.mini:disabled{color:#b8bdc2!important;background:#14181b!important;border-color:#41484f!important;opacity:.72!important}
    .commandNav a:not(.active){color:#dce0e3!important;background:#111518!important;border-color:#394047!important;opacity:1!important}
    .commandNav a:not(.active):hover{color:#fff!important;border-color:#d9a326!important;background:#191d20!important}
    .tgaShare:not(:disabled){color:#e8fff0!important;border-color:#258d4e!important;background:#102018!important}
  `;document.head.appendChild(s);
})();
