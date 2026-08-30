(()=>{
  if((location.pathname.replace(/\/+$/,'')||'/')!=='/comandante/jogos')return;
  if(window.__tgaTeamDrawVisitorsFix)return;window.__tgaTeamDrawVisitorsFix=true;

  const app=document.getElementById('app');if(!app)return;
  const visitorApi=async(action,opts={})=>{
    const r=await fetch('/api/visitor-admin?action='+encodeURIComponent(action)+(opts.query||''),{
      method:opts.method||'GET',
      headers:{'Content-Type':'application/json'},
      body:opts.body?JSON.stringify(opts.body):undefined,
      credentials:'same-origin',
      cache:'no-store'
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||'Erro ao incluir visitantes no sorteio.');
    return d;
  };
  const flash=t=>{const x=document.createElement('div');x.className='toast';x.textContent=t;document.body.appendChild(x);setTimeout(()=>x.remove(),3500)};

  async function ensureVisitorsDrawn(gameId){
    const before=await visitorApi('game-visitors',{query:'&game_id='+encodeURIComponent(gameId)});
    const going=(before.visitors||[]).filter(v=>v.response==='going');
    if(!going.length)return {count:0,total:0,changed:false};

    const missing=going.filter(v=>!['A','B'].includes(String(v.team_code||'')));
    if(!missing.length)return {count:going.length,total:going.length,changed:false};

    const r=await visitorApi('draw-visitors',{method:'POST',body:{game_id:gameId}});
    return {count:Number(r.count||0),total:going.length,changed:true};
  }

  function reopen(gameId){
    setTimeout(()=>{
      const open=document.querySelector(`[data-open-mission="${CSS.escape(String(gameId))}"]`);
      if(open)open.click();
    },250);
  }

  function bind(){
    const form=document.getElementById('tgaMissionEditForm');
    const btn=form?.querySelector('#tgaDrawTeams');
    if(!form||!btn||btn.dataset.visitorDrawFix==='1')return false;

    btn.dataset.visitorDrawFix='1';
    btn.textContent='🎲 Sortear Time A e B (operadores + visitantes)';
    const original=btn.onclick;

    btn.onclick=async function(ev){
      const gameId=form.elements.game_id?.value;
      if(!gameId)return original?original.call(this,ev):undefined;
      try{
        if(original)await original.call(this,ev);
        const v=await ensureVisitorsDrawn(gameId);
        if(v.total){
          flash(`Sorteio concluído: operadores + ${v.total} visitante${v.total===1?'':'s'}.`);
          if(v.changed)reopen(gameId);
        }
      }catch(e){
        if(!/Nenhum visitante marcou Vou/i.test(e?.message||''))flash(e?.message||'Erro ao incluir visitantes no sorteio.');
      }
    };
    return true;
  }

  const obs=new MutationObserver(()=>bind());
  obs.observe(app,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
