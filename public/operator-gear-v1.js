(()=>{
  if(location.pathname!=='/operador/equipamentos')return;
  if(window.__tgaOperatorGearV1)return;window.__tgaOperatorGearV1=true;
  const view=window.__tgaOperatorView,user=window.__tgaCurrentOperator,app=document.getElementById('app');
  if(!view||!user||!app){location.replace('/operador');return}
  const esc=view.esc;
  const req=(url,options={})=>view.requestJSON(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options},12000);

  async function compress(file){
    if(!file?.size)return'';
    if(file.size>5_000_000)throw new Error('Use uma foto de até 5 MB.');
    const src=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(file)});
    const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src});
    const scale=Math.min(1,1400/Math.max(img.width,img.height)),c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));
    c.getContext('2d',{alpha:false}).drawImage(img,0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',.78);
  }

  view.shell(user);
  app.innerHTML='<section class="ofdPage vgGearPage">'+view.hero(user)+view.tabs('gear')+
    '<section class="ofdCard vgGearBuilder">'+
      '<div class="eyebrow">ARSENAL & INVENTÁRIO TÁTICO</div>'+
      '<h2>Equipamentos, AEG & Fotos</h2>'+
      '<p class="muted">Cadastre arsenal, fardamento e fotos. Os itens públicos aparecem no seu dossiê.</p>'+
      '<form id="vgGearForm" class="vgGearForm">'+
        '<label><span>CATEGORIA DO ITEM</span><select name="category">'+
          '<option value="AEG">Rifle Elétrico (AEG)</option>'+
          '<option value="GBB">GBB / Pistola</option>'+
          '<option value="SNIPER">Sniper</option>'+
          '<option value="DMR">DMR</option>'+
          '<option value="FARDAMENTO">Fardamento</option>'+
          '<option value="EQUIPAMENTO">Equipamento / Acessório</option>'+
          '<option value="FOTO">Foto de jogo / missão</option>'+
        '</select></label>'+
        '<label><span>MODELO / NOME DO EQUIPAMENTO</span><input name="model" required placeholder="Ex.: M4 MK18 Daniel Defense AEG"></label>'+
        '<label><span>CRONAGEM (FPS)</span><input name="fps" type="number" min="0" max="2000" placeholder="390"></label>'+
        '<label><span>ENERGIA (JOULES)</span><input name="joules" type="number" min="0" max="100" step=".01" placeholder="1.42"></label>'+
        '<label><span>FABRICANTE / MARCA</span><input name="manufacturer" placeholder="Krytac / VFC"></label>'+
        '<label class="wide"><span>DESCRIÇÃO TÉCNICA / UPGRADES / LEGENDA</span><input name="details" placeholder="Ex.: Cano de precisão, gatilho eletrônico, Red Dot..."></label>'+
        '<label><span>IMAGEM TÁTICA</span><input name="photo" type="file" accept="image/*"></label>'+
        '<label class="vgGearPublic"><span><input name="public_visible" type="checkbox" checked> Mostrar no dossiê público</span></label>'+
        '<button class="goldbtn vgGearAdd" type="submit">＋ ADICIONAR AO INVENTÁRIO</button>'+
      '</form>'+
    '</section>'+
    '<section class="ofdCard vgGearInventory">'+
      '<div class="vgGearFilters">'+
        '<button class="active" data-gear-filter="ALL">TODOS</button>'+
        '<button data-gear-filter="AEG">AEG</button>'+
        '<button data-gear-filter="GBB">GBB</button>'+
        '<button data-gear-filter="SNIPER">SNIPER</button>'+
        '<button data-gear-filter="DMR">DMR</button>'+
        '<button data-gear-filter="FARDAMENTO">FARDAMENTO</button>'+
        '<button data-gear-filter="FOTO">FOTOS DE JOGOS</button>'+
      '</div>'+
      '<div id="vgGearGrid" class="vgGearCards"><div class="vgGearLoading">CARREGANDO INVENTÁRIO...</div></div>'+
    '</section>'+
  '</section>';
  view.enhanceOperatorSidebar();

  const form=document.getElementById('vgGearForm'),grid=document.getElementById('vgGearGrid');
  let items=[];

  function lightbox(src){
    let l=document.getElementById('vgGearLight');
    if(!l){
      l=document.createElement('div');l.id='vgGearLight';l.className='vgGearLight';
      l.innerHTML='<button type="button">×</button><img alt="Imagem ampliada">';
      document.body.appendChild(l);
      l.onclick=e=>{if(e.target===l||e.target.tagName==='BUTTON')l.classList.remove('open')};
    }
    l.querySelector('img').src=src;l.classList.add('open');
  }

  function card(x){
    const photo=x.photo?'<img src="'+esc(x.photo)+'" alt="'+esc(x.name)+'" loading="lazy" data-gear-zoom>':'<div class="vgGearNoPhoto">SEM FOTO</div>';
    const tech=x.tech?'<em>'+esc(x.tech)+'</em>':'';
    const maker=x.maker?'<b>'+esc(x.maker)+'</b>':'';
    return '<article class="vgGearCard" data-kind="'+esc(x.filter)+'">'+
      '<div class="vgGearPhoto">'+photo+'<div class="vgGearTags"><span>'+esc(x.label)+'</span>'+tech+'</div></div>'+
      '<div class="vgGearCardBody"><h3>'+esc(x.name)+'</h3>'+maker+'<p>'+esc(x.details||'Sem descrição cadastrada.')+'</p></div>'+
      '<footer><span>STATUS: APROVADO</span><button type="button" data-gear-delete="'+esc(x.id)+'" data-gear-type="'+esc(x.type)+'">Remover</button></footer>'+
    '</article>';
  }

  function draw(filter){
    const list=filter==='ALL'?items:items.filter(x=>x.filter===filter);
    grid.innerHTML=list.map(card).join('')||'<div class="vgGearEmpty">Nenhum item nesta categoria.</div>';
    grid.querySelectorAll('[data-gear-zoom]').forEach(i=>i.onclick=()=>lightbox(i.src));
    grid.querySelectorAll('[data-gear-delete]').forEach(b=>b.onclick=async()=>{
      if(!confirm('Remover este item do inventário?'))return;
      b.disabled=true;
      try{
        if(b.dataset.gearType==='replica')await req('/api/operator-replicas?action=delete',{method:'POST',body:JSON.stringify({id:b.dataset.gearDelete})});
        else if(b.dataset.gearType==='equipment')await req('/api/media?action=delete-equipment',{method:'POST',body:JSON.stringify({id:b.dataset.gearDelete})});
        else await req('/api/media?action=delete-gallery',{method:'POST',body:JSON.stringify({id:b.dataset.gearDelete})});
        await loadInventory();
      }catch(e){alert(e.message);b.disabled=false}
    });
  }

  async function loadInventory(){
    try{
      const [profile,reps]=await Promise.all([
        req('/api/operator-profile?action=settings'),
        req('/api/operator-replicas?action=list')
      ]);
      items=[
        ...(reps.replicas||[]).map(r=>({
          id:r.id,type:'replica',filter:String(r.category||'AEG').toUpperCase(),label:String(r.category||'AEG').toUpperCase(),
          name:r.model,photo:r.photo_url,maker:r.manufacturer||'',details:r.details||('Quantidade: '+(Number(r.quantity)||1)),
          tech:[r.fps?(r.fps+' FPS'):null,r.joules?(r.joules+' J'):null].filter(Boolean).join(' · ')
        })),
        ...(profile.equipment||[]).map(e=>({
          id:e.id,type:'equipment',filter:/fard/i.test(e.category||'')?'FARDAMENTO':'EQUIPAMENTO',
          label:String(e.category||'EQUIPAMENTO').toUpperCase(),name:e.name,photo:e.photo_url,maker:'',details:e.details||'',tech:''
        })),
        ...(profile.gallery||[]).map(g=>({
          id:g.id,type:'gallery',filter:'FOTO',label:'FOTO DE MISSÃO',name:g.caption||'Foto de jogo',
          photo:g.image_data,maker:'',details:'Galeria do operador',tech:''
        }))
      ];
      const active=document.querySelector('[data-gear-filter].active')?.dataset.gearFilter||'ALL';
      draw(active);
    }catch(e){grid.innerHTML='<div class="vgGearEmpty error">'+esc(e.message)+'</div>'}
  }

  document.querySelectorAll('[data-gear-filter]').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('[data-gear-filter]').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');draw(b.dataset.gearFilter);
  });

  form.onsubmit=async e=>{
    e.preventDefault();
    const btn=e.submitter,fd=new FormData(form),category=String(fd.get('category')||'AEG').toUpperCase(),file=fd.get('photo');
    const old=btn.textContent;btn.disabled=true;btn.textContent='SALVANDO...';
    try{
      const image=file&&file.size?await compress(file):'',model=String(fd.get('model')||'').trim();
      const details=String(fd.get('details')||'').trim(),manufacturer=String(fd.get('manufacturer')||'').trim();
      const fps=fd.get('fps'),joules=fd.get('joules'),public_visible=form.elements.public_visible.checked;
      if(category==='FOTO'){
        if(!image)throw new Error('Selecione uma foto.');
        await req('/api/media?action=add-gallery',{method:'POST',body:JSON.stringify({image_data:image,caption:model||details||'Foto de jogo'})});
      }else if(['AEG','GBB','SNIPER','DMR'].includes(category)){
        await req('/api/operator-replicas?action=add',{method:'POST',body:JSON.stringify({
          kind:category==='GBB'?'secondary':'primary',category,model,quantity:1,fps,joules,manufacturer,details,image_data:image,public_visible
        })});
      }else{
        const detailParts=[manufacturer?('Marca: '+manufacturer):'',fps?('FPS: '+fps):'',joules?('J: '+joules):'',details].filter(Boolean);
        await req('/api/media?action=equipment',{method:'POST',body:JSON.stringify({
          category:category==='FARDAMENTO'?'Fardamento':'Equipamento',name:model,details:detailParts.join(' · '),photo_url:image,public_visible
        })});
      }
      form.reset();form.elements.public_visible.checked=true;await loadInventory();
    }catch(err){alert(err.message)}
    finally{btn.disabled=false;btn.textContent=old}
  };

  loadInventory().finally(()=>view.routeReady());
})();