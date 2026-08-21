(()=>{
  if(location.pathname!=='/operador') return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=d=>{if(!d)return 'Data não informada';const m=String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]}`:String(d)};
  const time=t=>t?String(t).slice(0,5):'';
  const get=async()=>{const r=await fetch('/api/operator-games?_t='+Date.now(),{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Não foi possível carregar os jogos.');return d};
  const css=()=>{if(document.getElementById('operatorGamesFixCss'))return;const s=document.createElement('style');s.id='operatorGamesFixCss';s.textContent=`
    .operatorGamesFixTabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 20px}
    .operatorGamesFixTabs a{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border:1px solid #30353b;background:#12161a;color:#e5e7e9;border-radius:10px;padding:11px 18px;font:600 16px Rajdhani,sans-serif}
    .operatorGamesFixTabs a.active{background:#e3a51a;color:#101214;border-color:#e3a51a}
    .operatorGamesFixPanel{display:grid;gap:16px}
    .operatorGamesFixCard{border:1px solid #292e33;border-radius:14px;padding:18px;background:#111519}
    .operatorGamesFixHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap}
    .operatorGamesFixHead h2{margin:4px 0 7px}.operatorGamesFixMeta{color:#9da5ab}
    .operatorGamesFixLists{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:15px}
    .operatorGamesFixList{border:1px solid #292e33;border-radius:10px;padding:13px;background:#0d1013;min-width:0}
    .operatorGamesFixList h3{font-size:18px;margin:0 0 8px}.operatorGamesFixList a{display:flex;align-items:center;gap:9px;color:#e8eaec;text-decoration:none;padding:7px 0;border-bottom:1px solid #24292e}.operatorGamesFixList a:last-child{border-bottom:0}.operatorGamesFixList a:hover{color:#e3a51a}.operatorGamesFixList small{display:block;color:#8e969d;margin-top:2px}.operatorGamesFixAvatar{width:36px;height:36px;border-radius:8px;object-fit:cover;background:#1b2025;flex:0 0 auto}.operatorGamesFixPhotos{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:15px}.operatorGamesFixPhotos img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:10px;border:1px solid #292e33;cursor:zoom-in}.operatorGamesFixEmpty{color:#8e969d}.operatorGamesFixError{border:1px solid #6c3434;background:#241315;border-radius:10px;padding:13px;color:#ffb5b5}
    @media(max-width:700px){.operatorGamesFixTabs{display:grid;grid-template-columns:1fr 1fr 1fr}.operatorGamesFixTabs a{padding:10px 5px;font-size:14px}.operatorGamesFixLists{grid-template-columns:1fr}.operatorGamesFixCard{padding:14px}.operatorGamesFixPhotos{grid-template-columns:1fr 1fr}.operatorGamesFixHead h2{font-size:25px}}
  `;document.head.appendChild(s)};
  const tabs=()=>{
    const old=document.querySelector('.operatorNav');
    if(document.getElementById('operatorGamesFixTabs'))return;
    if(!old)return;
    const wrap=document.createElement('div');wrap.id='operatorGamesFixTabs';wrap.className='operatorGamesFixTabs';
    wrap.innerHTML=`<a href="/operador" data-og-view="overview">Visão geral</a><a href="/operador/equipe" data-og-view="team">Equipe</a><a href="/operador?view=games" data-og-view="games">Jogos</a>`;
    old.replaceWith(wrap);
  };
  const render=async()=>{
    css();
    const app=document.getElementById('app');if(!app)return;
    let data;try{data=await get()}catch(e){app.innerHTML=`<section class="operatorGamesFixPanel"><div class="operatorGamesFixError">${esc(e.message)}</div></section>`;return}
    const item=o=>`<a href="/visitantes?operator=${encodeURIComponent(o.operator_id||o.id)}&from=operator"><img class="operatorGamesFixAvatar" src="${esc(o.photo_url||'/logo.webp')}" alt="Foto de ${esc(o.nickname)}"><span><b>@${esc(o.nickname)}</b>${o.rank?`<small>${esc(o.rank)}${o.function?' · '+esc(o.function):''}</small>`:''}</span></a>`;
    const list=(title,arr)=>`<div class="operatorGamesFixList"><h3>${title} <span>(${arr.length})</span></h3>${arr.length?arr.map(item).join(''):'<span class="operatorGamesFixEmpty">Nenhum operador.</span>'}</div>`;
    const gameCard=(g,active)=>`<article class="operatorGamesFixCard"><div class="operatorGamesFixHead"><div><div class="eyebrow">${active?'JOGO ATIVO':'JOGO FINALIZADO'}</div><h2>${esc(g.title)}</h2><div class="operatorGamesFixMeta">${date(g.game_date)}${g.game_time?' · '+time(g.game_time):''} · ${esc(g.field_name||g.location||'Campo não informado')}</div></div>${g.field_maps_url?`<a class="goldbtn small" href="${esc(g.field_maps_url)}" target="_blank" rel="noopener">Google Maps</a>`:''}</div>${active?`<div class="operatorGamesFixLists">${list('🟢 Vão',g.going||[])}${list('🔴 Não vão',g.not_going||[])}${list('🟡 Sem resposta',g.pending||[])}</div>`:`<div class="operatorGamesFixLists">${list('👥 Operadores presentes',g.present||[])}${list('📋 Confirmados',g.going||[])}${list('⚠️ Ausentes',g.absent||[])}</div>`}${(g.photos||[]).length?`<div class="operatorGamesFixPhotos">${g.photos.map(p=>`<img src="${esc(p.image_data||p.url)}" alt="${esc(p.caption||g.title)}" loading="lazy" data-game-photo>`).join('')}</div>`:'<p class="operatorGamesFixEmpty" style="margin-top:15px">Nenhuma foto do jogo cadastrada.</p>'}</article>`;
    app.innerHTML=`<section><div class="pageTitle"><div class="pageBrand"><img src="/logo.webp" alt="Tactical Group Airsoft"><div><div class="eyebrow">ÁREA DO OPERADOR</div><h1>Jogos</h1><p>Veja jogos ativos e finalizados, quem vai, quem não vai e quem esteve presente.</p></div></div></div><div id="operatorGamesFixTabs" class="operatorGamesFixTabs"><a href="/operador" data-og-view="overview">Visão geral</a><a href="/operador/equipe" data-og-view="team">Equipe</a><a class="active" href="/operador?view=games" data-og-view="games">Jogos</a></div><div class="operatorGamesFixPanel"><div class="sectionHead compact"><div><div class="eyebrow">JOGOS ATIVOS</div><h2>Próximos jogos</h2></div><span class="tag">${(data.active||[]).length} ativo(s)</span></div>${(data.active||[]).length?data.active.map(g=>gameCard(g,true)).join(''):'<div class="operatorGamesFixCard"><span class="operatorGamesFixEmpty">Nenhum jogo ativo.</span></div>'}<div class="sectionHead compact" style="margin-top:18px"><div><div class="eyebrow">HISTÓRICO</div><h2>Jogos finalizados</h2></div><span class="tag">${(data.finished||[]).length} finalizado(s)</span></div>${(data.finished||[]).length?data.finished.map(g=>gameCard(g,false)).join(''):'<div class="operatorGamesFixCard"><span class="operatorGamesFixEmpty">Nenhum jogo finalizado ainda.</span></div>'}</div></section>`;
    app.querySelectorAll('[data-game-photo]').forEach(img=>img.addEventListener('click',()=>{const m=document.createElement('div');m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;z-index:9999;padding:18px';m.innerHTML=`<button type="button" style="position:absolute;top:16px;right:18px;font-size:32px;background:none;border:0;color:#fff">×</button><img src="${img.src}" style="max-width:96vw;max-height:92vh;object-fit:contain;border-radius:10px">`;m.onclick=e=>{if(e.target===m||e.target.tagName==='BUTTON')m.remove()};document.body.appendChild(m)}));
  };
  const enhance=()=>{if(location.pathname!=='/operador')return;const v=new URLSearchParams(location.search).get('view');if(v==='games'){render();return}tabs()};
  const mo=new MutationObserver(()=>setTimeout(enhance,20));
  mo.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  setTimeout(enhance,500);setTimeout(enhance,1500);setTimeout(enhance,3000);
})();
