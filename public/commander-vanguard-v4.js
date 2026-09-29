(()=>{
  if(!location.pathname.startsWith('/comandante'))return;
  const p=()=>location.pathname.replace(/\/+$/,'')||'/';

  function enhance(){
    document.body.classList.add('commander-vanguard-v2','commander-vanguard-v4');
    const app=document.getElementById('app');if(!app)return false;
    const section=app.querySelector(':scope > section');if(!section)return false;
    section.classList.add('vgCmdMainSection');

    const path=p();
    section.classList.toggle('vgCmdFinancePage',path==='/comandante/financeiro');
    section.classList.toggle('vgCmdGamesPage',path==='/comandante/jogos');
    section.classList.toggle('vgCmdTeamPage',path==='/comandante'||path==='/comandante/equipe');
    section.classList.toggle('vgCmdVisitsPage',path==='/comandante/visitas');
    section.classList.toggle('vgCmdHistory',path==='/comandante/historico');
    section.classList.toggle('vgCmdSettings',path==='/comandante/configuracoes');

    section.querySelector('.pageTitle')?.classList.add('vgCmdPageHeader');

    if(path==='/comandante/financeiro'){
      section.querySelector('#finance')?.classList.add('vgCmdFinance');
    }

    if(path==='/comandante/jogos'){
      const form=section.querySelector('#gameForm');
      if(form){
        form.classList.add('vgCmdGameForm');
        const grid=form.closest('.adminGrid');
        grid?.classList.add('vgCmdMissionGrid');
        if(grid){
          const cards=[...grid.children].filter(x=>x.classList?.contains('card'));
          const fields=cards.find(x=>x!==form&&/CAMPOS/i.test(x.textContent||''));
          fields?.classList.add('vgCmdFieldsCard');
        }
      }
      const gameList=section.querySelector('.gameList');
      gameList?.closest('.card')?.classList.add('vgCmdGameListCard');
      section.querySelectorAll('.commandGame').forEach(x=>x.classList.add('vgCmdGameRow'));
    }

    if(path==='/comandante'||path==='/comandante/equipe'){
      section.querySelector('.commanderProfiles')?.classList.add('vgCmdCommanders');
      section.querySelector('.commanderInvite')?.classList.add('vgCmdRecruitCard');
      const rows=[...section.querySelectorAll('.operatorAdminRow')];
      rows.forEach(x=>x.classList.add('vgCmdOperatorRow'));
      if(rows.length)rows[0]?.closest('.card')?.classList.add('vgCmdOperatorsTable');
    }

    if(path==='/comandante/visitas'){
      section.querySelectorAll('.visitorAdminRow,.visit').forEach(x=>x.classList.add('vgCmdVisitorRow'));
    }

    if(path==='/comandante/configuracoes'){
      section.querySelectorAll('form.card').forEach(x=>x.classList.add('vgCmdSettingsCard'));
    }

    return true;
  }

  enhance();
  const root=document.getElementById('app')||document.body;
  let timer;
  new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(enhance,45)}).observe(root,{childList:true,subtree:true});
  let tries=0;const t=setInterval(()=>{enhance();if(++tries>40)clearInterval(t)},150);
})();