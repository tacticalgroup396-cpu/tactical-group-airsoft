(()=>{
  if((location.pathname.replace(/\/+$/,'')||'/')!=='/comandante/financeiro')return;
  async function removeDue(id,button){
    if(!confirm('Excluir este lançamento de mensalidade? O mês voltará para PENDENTE.'))return;
    button.disabled=true;
    try{
      const r=await fetch('/api/finance-admin-v2?action=delete-payment',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({due_id:id})});
      const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Não foi possível excluir.');
      location.reload();
    }catch(e){alert(e.message);button.disabled=false}
  }
  function enhance(){
    document.querySelectorAll('.finV2DueRow').forEach(row=>{
      if(row.querySelector('[data-delete-due]'))return;
      const edit=row.querySelector('[data-edit-due]');if(!edit)return;
      const status=(row.querySelector('.finV2Pill')?.textContent||'').trim().toUpperCase();
      if(status!=='PAGO'&&status!=='ISENTO')return;
      const actions=row.querySelector('.finV2Actions')||edit.parentElement;
      const b=document.createElement('button');b.type='button';b.className='mini danger';b.dataset.deleteDue=edit.dataset.editDue;b.textContent='Excluir mensalidade';b.onclick=()=>removeDue(b.dataset.deleteDue,b);actions.appendChild(b);
    });
  }
  let n=0;const t=setInterval(()=>{enhance();if(++n>80)clearInterval(t)},250);
  new MutationObserver(enhance).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
})();
