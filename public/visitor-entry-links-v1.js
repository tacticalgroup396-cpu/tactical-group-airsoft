(()=>{
  const path=location.pathname.replace(/\/+$/,'')||'/';
  if(!['/operador','/visitantes'].includes(path))return;
  const app=document.getElementById('app');if(!app)return;

  function addCss(){
    if(document.getElementById('visitorEntryLinksCss'))return;
    const s=document.createElement('style');s.id='visitorEntryLinksCss';
    s.textContent=`.visitorCodeEntry{display:inline-flex!important;align-items:center;justify-content:center;gap:7px;white-space:nowrap}.visitorPublicActions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.visitorPublicActions .goldbtn,.visitorPublicActions .outlinebtn{margin:0}@media(max-width:620px){.visitorPublicActions{width:100%;display:grid;grid-template-columns:1fr}.visitorPublicActions a,.visitorPublicActions button{width:100%;box-sizing:border-box;text-align:center}}`;
    document.head.appendChild(s);
  }

  function enhance(){
    addCss();
    if(path==='/operador'){
      const form=app.querySelector('form');
      if(!form||form.querySelector('[data-visitor-login-link]'))return false;
      const a=document.createElement('a');a.href='/visitante';a.className='outlinebtn visitorCodeEntry';a.dataset.visitorLoginLink='1';a.textContent='🔑 Entrar como visitante (código)';
      const links=form.querySelector('.accessLinks');links?links.insertAdjacentElement('beforebegin',a):form.appendChild(a);
      return true;
    }

    if(app.querySelector('[data-visitor-login-link]'))return true;
    const sectionHead=[...app.querySelectorAll('.sectionHead')].find(x=>/Equipe Tactical Group|OPERADORES/i.test(x.textContent||''))||app.querySelector('.sectionHead');
    if(!sectionHead)return false;
    const visitBtn=sectionHead.querySelector('#visitBtn');
    let actions=sectionHead.querySelector('.visitorPublicActions');
    if(!actions){
      actions=document.createElement('div');actions.className='visitorPublicActions';
      if(visitBtn){visitBtn.parentNode.insertBefore(actions,visitBtn);actions.appendChild(visitBtn)}else sectionHead.appendChild(actions);
    }
    const a=document.createElement('a');a.href='/visitante';a.className='outlinebtn visitorCodeEntry';a.dataset.visitorLoginLink='1';a.innerHTML='🔑 Entrar com código de visitante';
    actions.appendChild(a);
    return true;
  }

  let tries=0;const timer=setInterval(()=>{if(enhance()||++tries>30)clearInterval(timer)},250);
  const obs=new MutationObserver(()=>enhance());obs.observe(app,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
})();