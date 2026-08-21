(()=>{
  if(location.pathname!=='/visitantes')return;
  const isMobile=()=>window.matchMedia('(max-width:700px)').matches;
  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const date=d=>{if(!d)return 'Não informado';const m=String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]}`:String(d)};
  const profileId=()=>new URLSearchParams(location.search).get('operator');
  let last='';
  async function render(){
    if(!isMobile())return;
    const id=profileId();if(!id||id===last)return;
    const app=document.getElementById('app');if(!app)return;
    last=id;
    try{
      const r=await fetch('/api/index.js?action=operator&id='+encodeURIComponent(id)+'&_mobile_profile='+Date.now(),{cache:'no-store'});
      const d=await r.json();if(!r.ok)throw new Error(d.error||'Não foi possível carregar o perfil.');
      const o=d.operator||{};
      const eq=Array.isArray(d.equipment)?d.equipment:[];const gal=Array.isArray(d.gallery)?d.gallery:[];
      let minor='';
      try{
        const mr=await fetch('/api/public-operator?id='+encodeURIComponent(id)+'&_mobile_minor='+Date.now(),{cache:'no-store'});const md=await mr.json();
        if(md.minor){const g=md.guardian;minor=`<div class="profileMinorInfo"><div class="minorStatus"><span class="minorStatusIcon">⚠️</span><div><strong>Menor de idade</strong><small>Este operador possui menos de 18 anos.</small></div></div><div class="guardianStatus"><div><strong>Responsável</strong><span>${g?(g.nickname?'@'+esc(g.nickname):esc(g.name||'Não informado')):'Não informado'}</span>${g?.name?`<small>${esc(g.name)}</small>`:''}${g?.rank?`<small>${esc(g.rank)}</small>`:''}</div></div></div>`}
        else minor='<div class="profileMinorInfo"><div class="minorStatus"><span class="minorStatusIcon">✓</span><div><strong>Maior de idade</strong><small>Operador com 18 anos ou mais.</small></div></div></div>';
      }catch{minor=''}
      app.innerHTML=`<section class="profilePanel publicProfileFocused mobilePublicProfile"><div class="profileHero"><img class="profilePhoto big" loading="eager" src="${esc(o.photo_url||'/logo.webp')}" alt="Foto de ${esc(o.nickname||'Operador')}"><div><div class="eyebrow">PERFIL DO OPERADOR</div><h2>@${esc(o.nickname||'Operador')}</h2>${o.name?`<div class="operatorRealName profileName">${esc(o.name)}</div>`:''}<div class="rank">${esc(o.rank||'Recruta')} · ${esc(o.function||'Operador')}</div><p>${esc(o.bio||'Sem descrição cadastrada.')}</p></div></div><div class="profileStats"><div><b>Nascimento</b><span>${date(o.birth_date)}</span></div><div><b>Idade</b><span>${o.age?esc(o.age)+' anos':'Não informado'}</span></div><div><b>Airsoft</b><span>${o.airsoft_years?esc(o.airsoft_years)+' anos':'Não informado'}</span></div><div><b>Estilo</b><span>${esc(o.play_style||'Não informado')}</span></div></div>${minor}<div class="profileCols"><div><h3>Loadout</h3><p><b>AEG principal:</b> ${esc(o.primary_replica||'Não informado')}</p><p><b>Secundária:</b> ${esc(o.secondary_replica||'Não informado')}</p><h3>Equipamentos</h3><div class="equipmentPublicGrid">${eq.length?eq.map(e=>`<article class="equipmentPublicCard">${e.photo_url?`<img loading="lazy" src="${esc(e.photo_url)}" alt="Foto de ${esc(e.name)}">`:''}<div><b>${esc(e.category)}</b><strong>${esc(e.name)}</strong>${e.details?`<span>${esc(e.details)}</span>`:''}</div></article>`).join(''):'<span class="muted">Nenhum equipamento público.</span>'}</div></div><div><h3>Galeria</h3><div class="gallery">${gal.length?gal.map(g=>`<img loading="lazy" src="${esc(g.image_data)}" alt="${esc(g.caption||'Foto do operador')}">`).join(''):'<div class="muted">Nenhuma foto cadastrada.</div>'}</div></div></div><div class="profileActions"><a class="outlinebtn" href="/visitantes">← Voltar para operadores</a></div></section>`;
      window.scrollTo({top:0,behavior:'auto'});
    }catch(e){last='';app.innerHTML=`<section class="profilePanel mobilePublicProfile"><div class="error">${esc(e.message)}</div><a class="outlinebtn" href="/visitantes">← Voltar para operadores</a></section>`}
  }
  const scan=()=>{const id=profileId();if(id!==last)render();};
  document.addEventListener('click',e=>{const a=e.target?.closest?.('a[href*="/visitantes?operator="]');if(!a)return;const href=a.getAttribute('href');if(!href)return;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();location.assign(href)},true);
  window.addEventListener('popstate',()=>{last='';scan()});
  new MutationObserver(scan).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  setTimeout(scan,250);setTimeout(scan,900);setTimeout(scan,1800);
})();
