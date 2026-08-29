(()=>{
  if(!location.pathname.startsWith('/comandante'))return;
  if(document.getElementById('commanderContrastCss'))return;
  const s=document.createElement('style');s.id='commanderContrastCss';s.textContent=`
    #app button:not(.goldbtn):not(.danger):not(:disabled),
    #app a.outlinebtn,
    #app .outlinebtn:not(:disabled),
    #app .mini:not(.danger):not(:disabled),
    #app .ghost:not(:disabled){
      color:#f7f8f9!important;
      background:#20262b!important;
      border:1px solid #747d86!important;
      opacity:1!important;
      text-shadow:none!important;
      box-shadow:0 0 0 1px rgba(255,255,255,.025) inset!important;
    }
    #app button:not(.goldbtn):not(.danger):not(:disabled):hover,
    #app a.outlinebtn:hover,
    #app .outlinebtn:not(:disabled):hover,
    #app .mini:not(.danger):not(:disabled):hover,
    #app .ghost:not(:disabled):hover{
      color:#fff!important;
      background:#293038!important;
      border-color:#d9a326!important;
    }
    #app button:disabled,
    #app .outlinebtn:disabled,
    #app .mini:disabled{
      color:#e1e4e6!important;
      background:#252b30!important;
      border:1px solid #666f77!important;
      opacity:1!important;
      filter:none!important;
      cursor:not-allowed!important;
    }
    #app .commandNav a:not(.active){
      color:#e7eaec!important;
      background:#171c20!important;
      border-color:#505860!important;
      opacity:1!important;
    }
    #app .commandNav a:not(.active):hover{color:#fff!important;border-color:#d9a326!important;background:#22282d!important}
    #app .tgaShare:not(:disabled){color:#eaffef!important;border-color:#2aa85c!important;background:#14301f!important}
    #app .tgaShare:not(:disabled):hover{background:#194029!important;border-color:#43c979!important}
  `;document.head.appendChild(s);
})();
