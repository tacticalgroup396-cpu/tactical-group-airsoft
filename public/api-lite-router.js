(()=>{
  const nativeFetch=window.fetch.bind(window);
  const direct=(url,init={})=>nativeFetch(url,{...init,cache:'no-store',credentials:init?.credentials||'same-origin'});

  const commanderWithVisitors=async(init={})=>{
    const r=await direct('/api/light?action=commander',init);
    if(!r.ok)return r;
    const d=await r.json().catch(()=>({}));
    const games=Array.isArray(d.games)?d.games:[];
    const approvedVisitors=(Array.isArray(d.requests)?d.requests:[]).filter(v=>['approved','accepted'].includes(String(v.status||'').toLowerCase()));
    const visitorMap={};
    await Promise.all(games.map(async g=>{
      let rsvps=[];
      try{
        const vr=await direct('/api/visitor-admin?action=game-visitors&game_id='+encodeURIComponent(g.id));
        if(vr.ok){const vd=await vr.json().catch(()=>({}));rsvps=Array.isArray(vd.visitors)?vd.visitors:[]}
      }catch(e){console.warn('visitor merge',e?.message||e)}
      const byId=new Map(rsvps.map(v=>[String(v.id),v]));
      const visitors=approvedVisitors.map(v=>{
        const saved=byId.get(String(v.id));
        return saved?{...v,...saved}:{id:v.id,name:v.name,nickname:v.nickname,contact:v.contact,response:'pending',responded_at:null,team_code:null};
      });
      for(const saved of rsvps){if(!visitors.some(v=>String(v.id)===String(saved.id)))visitors.push(saved)}
      visitorMap[String(g.id)]=visitors;
      g.visitors=visitors;
      const going=visitors.filter(v=>v.response==='going').length;
      const notGoing=visitors.filter(v=>v.response==='not_going').length;
      const pending=visitors.filter(v=>!['going','not_going'].includes(v.response)).length;
      g.going_count=Number(g.going_count||0)+going;
      g.not_going_count=Number(g.not_going_count||0)+notGoing;
      g.pending_count=Number(g.pending_count||0)+pending;
      g.participant_count=Number(g.participant_count||0)+visitors.length;

      const operatorParticipants=Array.isArray(g.participants)?g.participants:[];
      const visualVisitors=visitors.map(v=>({
        id:'visitor-'+String(v.id),
        visitor_id:v.id,
        name:v.name||v.nickname||'Visitante',
        nickname:v.nickname||v.name||'Visitante',
        rank:'VISITANTE',
        function:'Convidado',
        photo_url:'/logo.webp',
        elo_level:null,
        response:['going','not_going'].includes(v.response)?v.response:'pending',
        loadout:null,
        is_visitor:true,
        team_code:v.team_code||null
      }));
      g.participants=[...operatorParticipants,...visualVisitors];
    }));
    window.__tgaCommanderVisitors=visitorMap;
    return new Response(JSON.stringify(d),{status:r.status,statusText:r.statusText,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
  };

  window.fetch=(input,init={})=>{
    try{
      const raw=typeof input==='string'?input:input?.url;
      if(!raw)return nativeFetch(input,init);
      const u=new URL(raw,location.origin);
      const method=String(init?.method||'GET').toUpperCase();
      let mapped='';
      if((u.pathname==='/api/index.js'||u.pathname==='/api/index')&&method==='GET'){
        const a=u.searchParams.get('action');
        if(a==='me')return direct('/api/light?action=op-me',init);
        if(a==='profile-data')return direct('/api/operator-profile?action=settings',init);
        if(a==='games')return direct('/api/operator-home-fast',init);
        if(a==='public')mapped='public';
        else if(a==='commander')return commanderWithVisitors(init);
      }else if((u.pathname==='/api/operator-dashboard'||u.pathname==='/api/operator-dashboard.js')&&method==='GET'){
        const a=u.searchParams.get('action')||'dashboard';
        if(a==='dashboard')return direct('/api/operator-home-fast',init);
        if(a==='team')mapped='op-team';
        else if(a==='me')mapped='op-me';
      }else if((u.pathname==='/api/operator-game'||u.pathname==='/api/operator-game.js')){
        const a=u.searchParams.get('action')||'leaderboard';
        if(method==='GET'&&a==='leaderboard')mapped='arena-leaderboard';
        else if(method==='POST'&&a==='score')mapped='arena-score';
      }
      if(!mapped)return nativeFetch(input,init);
      const target=new URL('/api/light',location.origin);
      target.searchParams.set('action',mapped);
      const next={...init};
      if(mapped==='public')delete next.cache;
      return nativeFetch(target.pathname+target.search,next);
    }catch(e){return nativeFetch(input,init)}
  };

  const completeOperatorNav=()=>{
    const nav=document.querySelector('.operatorNav');
    if(!nav)return false;
    const home=nav.querySelector('a[href="/operador"]');
    const settings=nav.querySelector('a[href="/operador/configuracoes"]');
    if(!home||!settings)return false;
    const wanted=[
      ['/operador/equipe','Ver operadores'],
      ['/operador/jogos','Jogos'],
      ['/operador/arena','Mini jogos']
    ];
    for(const [href,label] of wanted){
      let a=nav.querySelector(`a[href="${href}"]`);
      if(!a){a=document.createElement('a');a.href=href;a.textContent=label;settings.insertAdjacentElement('beforebegin',a)}
      else a.textContent=label;
    }
    const p=location.pathname.replace(/\/+$/,'')||'/';
    nav.querySelectorAll('a').forEach(a=>a.classList.toggle('active',(a.getAttribute('href')||'')===p));
    return true;
  };
  const root=document.getElementById('app')||document.body;
  completeOperatorNav();
  new MutationObserver(()=>completeOperatorNav()).observe(root,{childList:true,subtree:true});
})();
