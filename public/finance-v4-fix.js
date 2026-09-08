(()=>{
  if(!location.pathname.startsWith('/comandante'))return;
  if(typeof window.renderFinancePage!=='function'&&typeof window.financePanel==='function')window.renderFinancePage=window.financePanel;
  const post=async(action,data)=>{const r=await fetch('/api/index.js?action='+encodeURIComponent(action),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data||{}),credentials:'same-origin',cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.error||'Erro ao atualizar financeiro.');return d};
  function css(){if(document.getElementById('finV4Css'))return;const s=document.createElement('style');s.id='finV4Css';s.textContent=`
    .finV4Value{display:flex;gap:8px;align-items:end;margin:12px 0}.finV4Value label{display:grid;gap:5px;max-width:220px}.finV4Value input{font-size:20px;font-weight:700}.finV4Save{min-width:150px}.finV4LegacyCheck,.finV4Status{display:none!important}@media(max-width:700px){.finV4Value{align-items:stretch;flex-direction:column}.finV4Value label{max-width:none}}
  `;document.head.appendChild(s)}
  function cleanCopy(){
    document.querySelectorAll('#finance .sectionHead p.muted').forEach(p=>{if(/confirmar presença|participa.*jog/i.test(p.textContent||''))p.textContent='Controle de mensalidades e pagamentos da equipe.'});
    document.querySelectorAll('#finance .finV4Status').forEach(x=>x.remove());
  }
  function patch(){
    cleanCopy();
    const form=document.getElementById('financeSettingsForm');if(!form||form.dataset.finV4)return false;
    form.dataset.finV4='1';css();
    const active=form.elements.active,fee=form.elements.monthly_fee;
    if(active){active.checked=false;const label=active.closest('label');if(label)label.classList.add('finV4LegacyCheck')}
    if(!fee)return true;
    const value=document.createElement('div');value.className='finV4Value';value.innerHTML='<label>Valor da mensalidade <input id="finV4Fee" type="number" min="0" step="0.01"></label><button type="button" class="goldbtn finV4Save" id="finV4QuickSave">Salvar valor</button>';
    value.querySelector('#finV4Fee').value=fee.value;form.querySelector('.formGrid')?.insertAdjacentElement('beforebegin',value);
    value.querySelector('#finV4Fee').oninput=e=>fee.value=e.target.value;
    value.querySelector('#finV4QuickSave').onclick=async b=>{const btn=b.currentTarget;btn.disabled=true;const payload=Object.fromEntries(new FormData(form));payload.monthly_fee=value.querySelector('#finV4Fee').value;payload.active=false;try{await post('finance-settings',payload);btn.textContent='Salvo ✓';setTimeout(()=>location.reload(),450)}catch(e){alert(e.message);btn.disabled=false}};
    form.addEventListener('submit',()=>{if(active)active.checked=false},true);
    return true
  }
  patch();const root=document.getElementById('app')||document.body;new MutationObserver(()=>{patch();cleanCopy()}).observe(root,{childList:true,subtree:true});
})();
