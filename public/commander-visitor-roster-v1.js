(()=>{
  if(location.pathname!=='/comandante/jogos')return;
  const app=document.getElementById('app');if(!app)return;
  function css(){if(document.getElementById('cmdVisRosterCss'))return;const s=document.createElement('style');s.id='cmdVisRosterCss';s.textContent=`.gameParticipant.cmdVisitorParticipant{border-color:#8b6d24;background:#17150e}.gameParticipant.cmdVisitorParticipant .gameParticipantIdentity{cursor:default}.gameParticipant.cmdVisitorParticipant .gameParticipantPhoto{border:1px solid #d9a326}.gameParticipant.cmdVisitorParticipant .participantName{color:#fff}.gameParticipant.cmdVisitorParticipant .gameParticipantGear{color:#e0aa27}.cmdVisitorCount{color:#e0aa27;font-weight:700}`;document.head.appendChild(s)}
  function enhance(){
    css();
    app.querySelectorAll('.gameParticipant').forEach(card=>{
      if(!/VISITANTE/i.test(card.textContent||''))return;
      card.classList.add('cmdVisitorParticipant');
      card.querySelector('.gameParticipantAdmin')?.remove();
      const link=card.querySelector('.gameParticipantIdentity');
      if(link){link.removeAttribute('href');link.addEventListener('click',e=>e.preventDefault(),{once:true})}
      const b=card.querySelector('.gameParticipantIdentity b');if(b)b.textContent=b.textContent.replace(/^@/,'');
      const gear=card.querySelector('.gameParticipantGear');if(gear)gear.innerHTML='<span>VISITANTE</span>';
    });
    app.querySelectorAll('.gameConfirmedPanel').forEach(panel=>{
      const cards=[...panel.querySelectorAll('.gameParticipant')];
      const vis=cards.filter(c=>/VISITANTE/i.test(c.textContent||'')).length;
      const head=panel.querySelector('.gameConfirmedHead span');
      if(head)head.innerHTML=`${cards.length} participante(s)${vis?` <span class="cmdVisitorCount">· ${vis} visitante(s)</span>`:''}`;
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
  let tries=0;const timer=setInterval(()=>{enhance();if(++tries>=24)clearInterval(timer)},400);
  app.addEventListener('click',e=>{if(e.target.closest('[data-close-rsvp],[data-editgame]'))setTimeout(enhance,350)},true);
  if(!document.querySelector('script[data-cmd-mission-visitors]')){const s=document.createElement('script');s.src='/commander-mission-visitors-v1.js?v=1';s.defer=true;s.dataset.cmdMissionVisitors='1';document.body.appendChild(s)}
})();