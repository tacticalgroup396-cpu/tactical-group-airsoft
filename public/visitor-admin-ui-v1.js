(()=>{
  const path=location.pathname.replace(/\/+$/,'')||'/';
  if(path!=='/comandante/visitas')return;
  const app=document.getElementById('app');
  if(!app)return;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api=async(action,data={})=>{
    const r=await fetch('/api/visitor-admin?action='+encodeURIComponent(action),{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),credentials:'same-origin',cache:'no-store'
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||'Não foi possível atualizar o visitante.');
    return d;
  };

  function css(){
    if(document.getElementById('visitorAdminDirectCss'))return;
    const s=document.createElement('style');s.id='visitorAdminDirectCss';
    s.textContent=`.visitorCodeTools{margin:16px 0;border-color:#755b20}.visitorCodeTools .heroActions{display:flex;gap:10px;flex-wrap:wrap}.visitorRowActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.visitorCodeOverlay{position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.88);display:grid;place-items:center;padding:16px}.visitorCodeCard{width:min(520px,94vw);background:#111518;border:1px solid #72581d;border-radius:18px;padding:20px}.visitorCodeValue{display:block;margin:14px 0;padding:14px;border:1px dashed #d9a326;border-radius:12px;background:#080a0b;color:#f0bd42;font-size:clamp(22px,5vw,30px);letter-spacing:.08em;text-align:center;word-break:break-all}.visitorCodeActions{display:flex;gap:8px;flex-wrap:wrap}.visitorCodeActions>*{flex:1}@media(max-width:680px){.visitorCodeTools .heroActions,.visitorRowActions,.visitorCodeActions{display:grid;grid-template-columns:1fr}.visitorCodeTools button,.visitorCodeTools a,.visitorRowActions button{width:100%;box-sizing:border-box}}`;
    document.head.appendChild(s);
  }

  function modal(code,kind='visitor',name=''){
    document.getElementById('visitorAdminCodeModal')?.remove();
    const recruit=kind==='recruit';
    const m=document.createElement('div');m.id='visitorAdminCodeModal';m.className='visitorCodeOverlay';
    const path=recruit?'/operador/primeiro-acesso':'/visitante';
    m.innerHTML=`<div class="visitorCodeCard"><div class="eyebrow">${recruit?'RECRUTAMENTO':'ACESSO DO VISITANTE'}</div><h2>${recruit?'Código para virar Operador':'Código do visitante'}</h2>${name?`<p>Visitante: <b>${esc(name)}</b></p>`:''}<strong class="visitorCodeValue">${esc(code)}</strong><p class="muted">Acesso: <b>${esc(path)}</b></p><div class="visitorCodeActions"><button type="button" class="goldbtn" data-copy-code>Copiar código</button><button type="button" class="outlinebtn" data-share-code>📲 WhatsApp</button><button type="button" class="outlinebtn" data-close-code>Fechar</button></div></div>`;
    document.body.appendChild(m);
    const text=recruit?`Tactical Group Airsoft — recrutamento.\n\nAcesse: ${location.origin}/operador/primeiro-acesso\nCódigo: ${code}`:`Tactical Group Airsoft — acesso de visitante.\n\nAcesse: ${location.origin}/visitante\nCódigo: ${code}\n\nEntre com o código e informe seu nome.`;
    m.querySelector('[data-copy-code]').onclick=async e=>{try{await navigator.clipboard.writeText(code);e.currentTarget.textContent='Copiado ✓'}catch{prompt('Copie o código:',code)}};
    m.querySelector('[data-share-code]').onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');
    m.querySelector('[data-close-code]').onclick=()=>{m.remove();location.reload()};
    m.onclick=e=>{if(e.target===m){m.remove();location.reload()}};
  }

  async function createCode(btn){
    if(btn?.disabled)return; if(btn)btn.disabled=true;
    try{const d=await api('create-code');modal(d.code,'visitor')}catch(e){alert(e.message);if(btn)btn.disabled=false}
  }
  async function newCode(id,name){try{const d=await api('generate-code',{id});modal(d.code,'visitor',name)}catch(e){alert(e.message)}}
  async function recruit(id,name){if(!confirm(`Recrutar ${name||'este visitante'} para o time?`))return;try{const d=await api('recruit',{id});modal(d.code,'recruit',name)}catch(e){alert(e.message)}}
  async function removeVisitor(id,name){if(!confirm(`Excluir definitivamente ${name||'este visitante'}?\n\nIsso também remove as respostas dele nas listas dos jogos.`))return;try{await api('delete',{id});location.reload()}catch(e){alert(e.message)}}

  function mount(){
    css();
    const nav=app.querySelector('.commandNav');
    if(nav&&!document.getElementById('visitorCodeTools')){
      const card=document.createElement('div');card.id='visitorCodeTools';card.className='card visitorCodeTools';
      card.innerHTML=`<div class="eyebrow">ACESSO POR CÓDIGO</div><h2>Gerar novo código de visitante</h2><p class="muted">Crie quantos códigos precisar. O visitante informa o próprio nome depois de entrar.</p><div class="heroActions"><button type="button" class="goldbtn" data-create-visitor-code>🔑 Gerar novo código</button><a class="outlinebtn" href="/visitante" target="_blank" rel="noopener">Abrir login do visitante</a></div>`;
      nav.insertAdjacentElement('afterend',card);
    }

    app.querySelectorAll('.visitorAdminRow').forEach(row=>{
      const id=row.querySelector('[data-id]')?.dataset.id;
      if(!id)return;
      const actions=row.querySelector('.heroActions')||row;
      if(actions.querySelector('[data-vis-delete]'))return;
      const name=row.querySelector('b')?.textContent?.trim()||'Visitante';
      const box=document.createElement('div');box.className='visitorRowActions';
      box.innerHTML=`<button type="button" class="mini" data-vis-code="${esc(id)}" data-vis-name="${esc(name)}">🔑 Novo código</button><button type="button" class="mini" data-vis-recruit="${esc(id)}" data-vis-name="${esc(name)}">🎖 Recrutar</button><button type="button" class="mini danger" data-vis-delete="${esc(id)}" data-vis-name="${esc(name)}">Excluir visitante</button>`;
      actions.appendChild(box);
    });
  }

  app.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.matches('[data-create-visitor-code]'))return createCode(b);
    const id=b.dataset.visCode||b.dataset.visRecruit||b.dataset.visDelete;
    if(!id)return;
    const name=b.dataset.visName||'Visitante';
    if(b.dataset.visCode)return newCode(id,name);
    if(b.dataset.visRecruit)return recruit(id,name);
    if(b.dataset.visDelete)return removeVisitor(id,name);
  });

  let tries=0;const timer=setInterval(()=>{mount();if(++tries>=40)clearInterval(timer)},250);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();