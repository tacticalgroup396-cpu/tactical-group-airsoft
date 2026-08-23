(()=>{
  if(location.pathname!=='/operador/configuracoes')return;
  if(window.__tgaEquipmentV3Loaded)return;
  window.__tgaEquipmentV3Loaded=true;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const media=async(action,data)=>{const r=await fetch('/api/media?action='+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),credentials:'same-origin'}),d=await r.json();if(!r.ok)throw new Error(d.error||'Erro ao salvar equipamento.');return d};
  const get=async()=>{const r=await fetch('/api/operator-profile?action=settings',{credentials:'same-origin',cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.error||'Erro.');return d};
  async function compress(file){if(!file?.size)return'';const data=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(file)}),im=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=data}),scale=Math.min(1,1200/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);c.getContext('2d',{alpha:false}).drawImage(im,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.75)}
  let mounting=false;
  async function mount(){
    const existing=[...document.querySelectorAll('#v3Equipment')];
    if(existing.length){existing.slice(1).forEach(x=>x.remove());return true}
    const page=document.querySelector('.tgaV3Page');if(!page)return false;
    if(mounting)return false;
    mounting=true;
    try{
      let d;try{d=await get()}catch{return true}
      if(document.getElementById('v3Equipment'))return true;
      const card=document.createElement('section');card.id='v3Equipment';card.className='tgaV3Card';card.innerHTML=`<div class="eyebrow">OUTROS EQUIPAMENTOS</div><h2>Colete, capacete, rádio e acessórios</h2><form id="v3EqForm" class="tgaV3Grid"><label class="tgaV3Field">Categoria<select name="category"><option>Colete</option><option>Capacete</option><option>Óculos</option><option>Rádio</option><option>Uniforme</option><option>Outro</option></select></label><label class="tgaV3Field">Nome<input name="name" required placeholder="Ex.: Colete plate carrier"></label><label class="tgaV3Field full">Detalhes<input name="details" placeholder="Marca, modelo, acessórios..."></label><label class="tgaV3Field">Foto<input name="photo" type="file" accept="image/*"></label><label class="tgaV3Field"><span><input name="public_visible" type="checkbox" checked> Mostrar no perfil</span></label><button class="goldbtn" type="submit">Adicionar equipamento</button></form><div class="tgaGallery" style="margin-top:14px">${(d.equipment||[]).map(x=>`<figure>${x.photo_url?`<img src="${esc(x.photo_url)}" data-zoom>`:''}<figcaption><b>${esc(x.name)}</b><br>${esc(x.category||'Equipamento')} · ${esc(x.details||'')}<br><button type="button" class="outlinebtn" data-del-eq="${x.id}">Excluir</button></figcaption></figure>`).join('')||'<p class="muted">Nenhum equipamento cadastrado.</p>'}</div>`;
      const access=[...page.querySelectorAll('.tgaV3Card')].find(x=>/Alterar senha/i.test(x.textContent||''));access?page.insertBefore(card,access):page.appendChild(card);
      card.querySelector('#v3EqForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),file=fd.get('photo');fd.delete('photo');const p=Object.fromEntries(fd.entries());p.public_visible=e.target.elements.public_visible.checked;p.photo_url=file?.size?await compress(file):'';try{await media('equipment',p);location.reload()}catch(x){alert(x.message)}};
      card.querySelectorAll('[data-del-eq]').forEach(b=>b.onclick=async()=>{if(!confirm('Excluir este equipamento?'))return;try{await media('delete-equipment',{id:b.dataset.delEq});location.reload()}catch(x){alert(x.message)}});
      return true;
    }finally{mounting=false}
  }
  let tries=0;
  const tryMount=async()=>{if(await mount())return;if(++tries<=30)setTimeout(tryMount,180)};
  tryMount();
})();
