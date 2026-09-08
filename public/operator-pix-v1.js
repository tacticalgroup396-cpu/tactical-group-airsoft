(()=>{
  if((location.pathname.replace(/\/+$/,'')||'/')!=='/operador/mensalidades')return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function css(){if(document.getElementById('operatorPixCss'))return;const s=document.createElement('style');s.id='operatorPixCss';s.textContent=`
    .ofdPixCard{border-color:#6b521b!important;background:linear-gradient(145deg,#14130e,#0d1114)!important}.ofdPixHead{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.ofdPixData{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.ofdPixField{padding:12px;border:1px solid #30363d;border-radius:10px;background:#0b0f12}.ofdPixField small{display:block;color:#8f989f;margin-bottom:4px}.ofdPixField strong{display:block;color:#fff;word-break:break-all;font-size:17px}.ofdPixActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ofdPixHint{margin-top:10px;color:#9ca5ab;font-size:13px}@media(max-width:650px){.ofdPixData{grid-template-columns:1fr}.ofdPixActions>*{width:100%}}
  `;document.head.appendChild(s)}
  async function load(){
    if(document.getElementById('operatorPixCard'))return true;
    const host=document.querySelector('.opSidebarContent');if(!host)return false;
    try{
      const year=new Date().getFullYear();
      const r=await fetch('/api/finance-admin-v2?action=self&year='+year+'&pix=1&t='+Date.now(),{credentials:'same-origin',cache:'no-store'}),d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||'Não foi possível carregar o PIX.');
      const key=String(d.settings?.pix_key||'').trim(),holder=String(d.settings?.pix_holder||'').trim();
      if(!key)return true;
      const card=document.createElement('section');card.id='operatorPixCard';card.className='ofdCard ofdPixCard';card.innerHTML=`<div class="ofdPixHead"><div><div class="eyebrow">PAGAMENTO VIA PIX</div><h2>Chave PIX da equipe</h2><p class="muted">Use esta chave para pagar sua mensalidade.</p></div></div><div class="ofdPixData"><div class="ofdPixField"><small>Chave PIX</small><strong id="operatorPixKey">${esc(key)}</strong></div><div class="ofdPixField"><small>Titular</small><strong>${esc(holder||'Não informado')}</strong></div></div><div class="ofdPixActions"><button type="button" class="goldbtn small" id="operatorPixCopy">Copiar chave PIX</button></div><div class="ofdPixHint">Após o pagamento, o lançamento continua sendo confirmado pelo Comandante na área financeira.</div>`;
      host.appendChild(card);css();
      card.querySelector('#operatorPixCopy').onclick=async e=>{try{await navigator.clipboard.writeText(key);e.currentTarget.textContent='Chave copiada ✓'}catch{prompt('Copie a chave PIX:',key)}};
      return true;
    }catch(e){console.warn('PIX operador',e);return false}
  }
  css();let n=0;const t=setInterval(async()=>{if(await load()||++n>=30)clearInterval(t)},300);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else setTimeout(load,50);
})();
