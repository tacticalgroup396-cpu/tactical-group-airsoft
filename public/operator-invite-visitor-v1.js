(()=>{
  if((location.pathname.replace(/\/+$/,'')||'/')!=='/operador')return;
  const app=document.getElementById('app');if(!app)return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function call(){const r=await fetch('/api/operator-home-fast?action=invite-visitor',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:'{}'}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Não foi possível gerar o código.');return d}
  function css(){if(document.getElementById('opInviteVisitorCss'))return;const s=document.createElement('style');s.id='opInviteVisitorCss';s.textContent=`
    .opInviteVisitor{border-color:#71591d!important;background:linear-gradient(145deg,#17150d,#101316)!important}
    .opInviteActions{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}
    .opInviteResult{margin-top:14px;padding:14px;border:1px solid #d9a326;border-radius:13px;background:#171409}
    .opInviteCode{display:block;font-size:1.5rem;letter-spacing:.08em;color:#f2bf42;margin:5px 0 10px}
    .opInviteActions .outlinebtn{color:#f4f5f6!important;background:#171b1f!important;border-color:#806823!important;opacity:1!important}
    .ofdPage>.opSidebarLayout{width:100%!important;grid-template-columns:180px minmax(0,1fr)!important;align-items:start!important}
    .ofdPage>.opSidebarLayout>.ofdNavWrap{width:100%!important;min-width:0!important}
    .ofdPage>.opSidebarLayout>.opSidebarContent{width:100%!important;min-width:0!important;display:flex!important;flex-direction:column!important;gap:18px!important}
    .ofdPage>.opSidebarLayout>.opSidebarContent>.ofdCard,
    .ofdPage>.opSidebarLayout>.opSidebarContent>section{width:100%!important;max-width:none!important;box-sizing:border-box!important}
    @media(max-width:760px){.ofdPage>.opSidebarLayout{grid-template-columns:132px minmax(0,1fr)!important;gap:10px!important}.opInviteActions>*{width:100%}}
  `;document.head.appendChild(s)}
  function repairLayout(){
    const page=app.querySelector('.ofdPage');if(!page)return false;
    const layout=page.querySelector(':scope > .opSidebarLayout');if(!layout)return false;
    const content=layout.querySelector(':scope > .opSidebarContent');if(!content)return false;
    let node=layout.nextElementSibling;
    while(node){const next=node.nextElementSibling;content.appendChild(node);node=next}
    content.style.width='100%';content.style.minWidth='0';layout.style.width='100%';
    return true
  }
  function mount(){css();repairLayout();if(document.getElementById('opInviteVisitor'))return true;const anchor=app.querySelector('.ofdProgress');if(!anchor)return false;const box=document.createElement('section');box.id='opInviteVisitor';box.className='ofdCard opInviteVisitor';box.innerHTML=`<div class="eyebrow">CONVIDADOS</div><h2>Chamar convidado</h2><p class="muted">Gere um código para uma pessoa acessar a Área do Visitante. Ela coloca o próprio nome depois, vê os jogos disponíveis e pode marcar <b>Vou</b> ou <b>Não vou</b>.</p><div class="opInviteActions"><button type="button" class="goldbtn" id="opInviteGenerate">🔑 Gerar código de convidado</button></div><div id="opInviteResult"></div>`;anchor.insertAdjacentElement('afterend',box);repairLayout();const btn=box.querySelector('#opInviteGenerate');btn.onclick=async()=>{btn.disabled=true;btn.textContent='Gerando...';try{const d=await call(),code=String(d.code||'');const login=location.origin+(d.login_path||'/visitante'),msg=`Convite Tactical Group Airsoft\n\nCódigo de visitante: ${code}\nAcesse: ${login}\n\nEntre com o código, coloque seu nome e responda a lista do jogo.`;const out=box.querySelector('#opInviteResult');out.innerHTML=`<div class="opInviteResult"><small>Código válido por ${Number(d.expires_in_days||30)} dias</small><strong class="opInviteCode">${esc(code)}</strong><div class="opInviteActions"><button type="button" class="goldbtn small" id="opInviteCopy">Copiar código</button><a class="outlinebtn small" id="opInviteWhats" target="_blank" rel="noopener">📲 Compartilhar no WhatsApp</a></div></div>`;out.querySelector('#opInviteCopy').onclick=async e=>{try{await navigator.clipboard.writeText(code);e.currentTarget.textContent='Copiado ✓'}catch{prompt('Copie o código:',code)}};out.querySelector('#opInviteWhats').href='https://wa.me/?text='+encodeURIComponent(msg)}catch(e){alert(e.message)}finally{btn.disabled=false;btn.textContent='🔑 Gerar outro código'}};return true}
  let tries=0;const t=setInterval(()=>{mount();repairLayout();if(++tries>=60)clearInterval(t)},250);
  const mo=new MutationObserver(()=>repairLayout());mo.observe(app,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mount();repairLayout()},{once:true});else{mount();repairLayout()}
})();
