(()=>{
  const p=(location.pathname.replace(/\/+$/,'')||'/');
  if(p!=='/operador/configuracoes')return;
  if(window.__tgaSettingsMobileFixLoaded)return;
  window.__tgaSettingsMobileFixLoaded=true;

  function addCss(){
    if(document.getElementById('tgaSettingsMobileFixCss'))return;
    const s=document.createElement('style');
    s.id='tgaSettingsMobileFixCss';
    s.textContent=`
      .tgaAgeHelp{font-size:.82rem;color:#9ca5ab;margin-top:2px;line-height:1.35}
      @media(max-width:700px){
        .tgaV3Page{width:100%!important;max-width:100%!important;box-sizing:border-box!important;padding:14px 10px 56px!important;overflow-x:hidden!important}
        .tgaV3Card{width:100%!important;max-width:100%!important;box-sizing:border-box!important;padding:14px!important;overflow:hidden!important}
        .tgaV3Grid,.tgaV3Grid.three{grid-template-columns:minmax(0,1fr)!important;width:100%!important;max-width:100%!important}
        .tgaV3Field,.tgaV3Field.full{grid-column:auto!important;min-width:0!important;max-width:100%!important;width:100%!important;box-sizing:border-box!important}
        .tgaV3Field input,.tgaV3Field select,.tgaV3Field textarea{min-width:0!important;max-width:100%!important;width:100%!important;box-sizing:border-box!important;font-size:16px!important}
        #v3Birth,#v3Age{min-height:48px!important}
        .tgaGuardianBox{max-width:100%!important;box-sizing:border-box!important}
        .tgaOpsButtons{max-width:100%!important}.tgaOpsButtons>*{max-width:100%!important;box-sizing:border-box!important}
      }
    `;
    document.head.appendChild(s);
  }

  const calcAge=value=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return NaN;
    const d=new Date(value+'T12:00:00'),n=new Date();
    if(Number.isNaN(d.getTime()))return NaN;
    let age=n.getFullYear()-d.getFullYear();
    const md=n.getMonth()-d.getMonth();
    if(md<0||(md===0&&n.getDate()<d.getDate()))age--;
    return age;
  };

  function syncGuardian(age){
    const box=document.getElementById('v3GuardianBox'),sel=document.getElementById('v3Guardian');
    if(!box||!sel)return;
    const minor=Number.isFinite(age)&&age>=0&&age<18;
    box.hidden=!minor;sel.required=minor;
  }

  function bindAge(){
    const birth=document.getElementById('v3Birth'),age=document.getElementById('v3Age');
    if(!birth||!age||age.dataset.tgaAgeFixed==='1')return false;
    age.dataset.tgaAgeFixed='1';
    age.readOnly=false;age.removeAttribute('readonly');age.inputMode='numeric';
    birth.removeAttribute('readonly');
    let help=age.parentElement?.querySelector('.tgaAgeHelp');
    if(!help){help=document.createElement('small');help.className='tgaAgeHelp';help.textContent='Use a data de nascimento ou digite a idade. Se você editar a idade manualmente, a data de nascimento será limpa.';age.insertAdjacentElement('afterend',help)}
    let internal=false;
    const fromBirth=()=>{
      const n=calcAge(birth.value);
      age.readOnly=false;age.removeAttribute('readonly');
      if(Number.isFinite(n)){internal=true;age.value=String(n);internal=false;syncGuardian(n);help.textContent='Idade calculada pela data de nascimento. Você ainda pode editar manualmente se precisar.'}
      else{syncGuardian(age.value===''?NaN:Number(age.value));help.textContent='Digite a data de nascimento ou informe a idade manualmente.'}
    };
    birth.onchange=fromBirth;
    birth.oninput=fromBirth;
    age.oninput=()=>{
      if(internal)return;
      if(birth.value)birth.value='';
      age.readOnly=false;age.removeAttribute('readonly');
      const n=age.value===''?NaN:Number(age.value);syncGuardian(n);
      help.textContent='Idade informada manualmente. A data de nascimento foi limpa para não substituir este valor.';
    };
    if(birth.value)fromBirth();else syncGuardian(age.value===''?NaN:Number(age.value));
    return true;
  }

  function removeEquipmentDuplicates(){
    const list=[...document.querySelectorAll('#v3Equipment')];
    list.slice(1).forEach(x=>x.remove());
  }

  addCss();
  let queued=false;
  const apply=()=>{queued=false;bindAge();removeEquipmentDuplicates()};
  const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(apply)};
  schedule();setTimeout(schedule,250);setTimeout(schedule,800);setTimeout(schedule,1800);
  const app=document.getElementById('app');if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
})();
