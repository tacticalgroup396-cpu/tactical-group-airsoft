(()=>{
  const path=location.pathname.replace(/\/+$/,'')||'/';
  if(!['/operador','/visitantes','/entrar'].includes(path))return;
  const app=document.getElementById('app');if(!app)return;

  function addCss(){
    if(document.getElementById('visitorEntryLinksCss'))return;
    const s=document.createElement('style');s.id='visitorEntryLinksCss';
    s.textContent=`.visitorCodeEntry{display:inline-flex!important;align-items:center;justify-content:center;gap:7px;white-space:nowrap}.visitorPublicActions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.visitorPublicActions .goldbtn,.visitorPublicActions .outlinebtn{margin:0}@media(max-width:620px){.visitorPublicActions{width:100%;display:grid;grid-template-columns:1fr}.visitorPublicActions a,.visitorPublicActions button{width:100%;box-sizing:border-box;text-align:center}}`;
    document.head.appendChild(s);
  }

  function fixEntryLink(){
    const links=[...app.querySelectorAll('a')].filter(a=>/^visitante$/i.test((a.textContent||'').trim()));
    if(!links.length)return false;
    links.forEach(a=>{a.href='/visitante';a.dataset.visitorCodeRoute='1'});
    return true;
  }

  function enhance(){
    addCss();
    if(path==='/entrar')return fixEntryLink();

    if(path==='/operador'){
      const form=app.querySelector('form');
      if(!form)return false;
      const old=[...form.querySelectorAll('a')].find(a=>/^visitante$/i.test((a.textContent||'').trim()));
      if(old)old.href='/visitante';
      if(form.querySelector('[data-visitor-login-link]'))return true;
      const a=document.createElement('a');a.href='/visitante';a.className='outlinebtn visitorCodeEntry';a.dataset.visitorLoginLink='1';a.textContent='🔑 Entrar como visitante (código)';
      const links=form.querySelector('.accessLinks');links?links.insertAdjacentElement('beforebegin',a):form.appendChild(a);
      return true;
    }

    if(app.querySelector('[data-visitor-login-link]'))return true;
    const visitBtn=app.querySelector('#visitBtn');
    const sectionHead=visitBtn?.closest('.sectionHead')||[...app.querySelectorAll('.sectionHead')].find(x=>/Equipe Tactical Group|OPERADORES/i.test(x.textContent||''))||app.querySelector('.sectionHead');
    if(!sectionHead)return false;
    let actions=sectionHead.querySelector('.visitorPublicActions');
    if(!actions){
      actions=document.createElement('div');actions.className='visitorPublicActions';
      if(visitBtn){visitBtn.parentNode.insertBefore(actions,visitBtn);actions.appendChild(visitBtn)}else sectionHead.appendChild(actions);
    }
    const a=document.createElement('a');a.href='/visitante';a.className='outlinebtn visitorCodeEntry';a.dataset.visitorLoginLink='1';a.textContent='🔑 Entrar com código de visitante';
    actions.appendChild(a);
    return true;
  }

  let tries=0;
  const run=()=>{const ok=enhance();tries++;if(ok||tries>=40)clearInterval(timer)};
  const timer=setInterval(run,250);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
})();