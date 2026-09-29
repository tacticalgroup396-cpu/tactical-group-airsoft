(()=>{
  const path=()=>location.pathname.replace(/\/+$/,'')||'/';
  const isOperator=()=>path().startsWith('/operador')&&path()!=='/operador/primeiro-acesso';
  const isCommander=()=>path().startsWith('/comandante');
  if(!isOperator()&&!isCommander())return;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons={
    cross:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/><circle cx="12" cy="12" r="1.5"/></svg>',
    menu:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    home:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5V20H15v-6H9v6H3z"/></svg>',
    users:'<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8 10v-2a4 4 0 0 0-3-3.8m-1-12a4 4 0 0 1 0 7.7"/></svg>',
    game:'<svg viewBox="0 0 24 24"><path d="M8 6h8l1.4 2H20a2 2 0 0 1 1.9 1.5l1 4A3 3 0 0 1 20 17h-2l-2-2H8l-2 2H4a3 3 0 0 1-2.9-3.5l1-4A2 2 0 0 1 4 8h2.6zM7 10v4m-2-2h4m7-1h.01M19 13h.01"/></svg>',
    rank:'<svg viewBox="0 0 24 24"><path d="m12 2 3 6 6 .9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 8.9 9 8z"/></svg>',
    history:'<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4-1v6l4 2"/></svg>',
    money:'<svg viewBox="0 0 24 24"><path d="M3 6h18v12H3zM3 10h18M7 14h2m6 0h2"/></svg>',
    visitor:'<svg viewBox="0 0 24 24"><path d="M15 19a6 6 0 0 0-12 0m6-8a4 4 0 1 0 0-8 4 4 0 0 0 0 8m7 2h6m-3-3v6"/></svg>',
    settings:'<svg viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m7.4-3.5a7.6 7.6 0 0 0-.1-1l2-1.5-2-3.5-2.3 1a8.4 8.4 0 0 0-1.7-1L15 3h-4l-.3 2.5a8.4 8.4 0 0 0-1.7 1L6.7 5.5l-2 3.5 2 1.5a7.6 7.6 0 0 0 0 2L4.7 14l2 3.5 2.3-1a8.4 8.4 0 0 0 1.7 1L11 20h4l.3-2.5a8.4 8.4 0 0 0 1.7-1l2.3 1 2-3.5-2-1.5c.1-.2.1-.3.1-.5"/></svg>'
  };

  let me=null;
  let meLoaded=false;

  async function loadMe(){
    if(meLoaded)return me;
    const shared=window.__tgaCurrentOperator;
    if(shared&&typeof shared==='object'&&(shared.id||shared.nickname||shared.email)){
      me=shared;meLoaded=true;return me;
    }
    try{
      const r=await fetch('/api/index.js?action=me',{credentials:'same-origin',cache:'no-store'});
      const d=await r.json().catch(()=>({}));
      const candidate=d?.user??d?.me??null;
      if(r.ok&&candidate&&typeof candidate==='object'&&(candidate.id||candidate.nickname||candidate.email))me=candidate;
      else me=null;
    }catch{me=null}
    meLoaded=true;
    return me;
  }

  const rankText=u=>u?.rank||u?.patente||'Operador';
  const nick=u=>u?.nickname||u?.name||'OPERADOR';
  const initial=u=>String(nick(u)||'T').replace(/^@/,'').slice(0,2).toUpperCase();

  async function logout(){
    try{await fetch('/api/index.js?action=logout',{method:'POST',credentials:'same-origin',cache:'no-store'})}catch{}
    location.href='/';
  }

  function buildHeader(){
    const header=document.querySelector('body>header');if(!header)return;
    if(header.dataset.vgStructure==='2')return;
    header.dataset.vgStructure='2';header.className='vgTopbar';
    const role=me?.role||'operator',hasCommanderAccess=role==='commander',commanderArea=isCommander();
    header.innerHTML=`<div class="vgTopInner">
      <a class="vgBrandBlock" href="${commanderArea?'/comandante':'/operador'}" aria-label="${commanderArea?'Comando Tactical Group':'Operador Tactical Group'}">
        <span class="vgCrosshair">${icons.cross}</span>
        <span class="vgBrandText">
          <span class="vgBrandTitle"><strong>${commanderArea?'COMANDO TACTICAL GROUP':'OPERADOR TACTICAL GROUP'}</strong><span class="vgOnline">ONLINE • TGA NET</span></span>
          <span class="vgBrandSub">TACTICAL GROUP AIRSOFT</span>
        </span>
      </a>
      <button type="button" class="vgHeaderMenu" id="vgHeaderMenu" aria-label="Abrir controles">${icons.menu}</button>
      <nav id="nav" class="vgCompatNav" aria-hidden="true"></nav>
      <button id="menuToggle" class="vgCompatMenu" type="button" aria-hidden="true" tabindex="-1"></button>
      <div class="vgHeaderControls" id="vgHeaderControls">
        ${me?`<div class="vgLogged"><span>OPERADOR LOGADO:</span><b>@${esc(nick(me))}</b></div>`:''}
        <div class="vgRoleSwitch">
          <a class="operator ${isOperator()?'active':''}" href="/operador">ÁREA DO OPERADOR</a>
          ${hasCommanderAccess?`<a class="commander ${isCommander()?'active':''}" href="/comandante">ÁREA DO COMANDANTE</a>`:''}
          <button type="button" id="vgLogout">SAIR</button>
        </div>
      </div>
    </div>`;
    header.querySelector('#vgHeaderMenu')?.addEventListener('click',e=>{e.stopPropagation();document.body.classList.toggle('vg-header-open')});
    header.querySelector('#vgLogout')?.addEventListener('click',logout);
    document.addEventListener('click',e=>{if(document.body.classList.contains('vg-header-open')&&!e.target.closest('.vgTopbar'))document.body.classList.remove('vg-header-open')});
  }

  function buildStatus(){
    if(!me)return;
    let bar=document.getElementById('vgStatusBanner');
    if(!bar){bar=document.createElement('section');bar.id='vgStatusBanner';bar.className='vgStatusBanner';const header=document.querySelector('body>header');header?.insertAdjacentElement('afterend',bar)}
    const commander=isCommander();
    const level=Number(me.elo_level||me.elo||7)||7;
    const descriptor=commander?'Comando, operações, financeiro e segurança do grupo.':`${rankText(me)} • Elo ${level} • ${me.function||'Operador'}`;
    const avatar=me.photo_url?`<img src="${esc(me.photo_url)}" alt="">`:esc(initial(me));
    bar.innerHTML=`<div class="vgStatusInner">
      <div class="vgStatusIdentity">
        <div class="vgStatusInsignia">${avatar}</div>
        <div>
          <div class="vgStatusLine">
            <span class="vgMode ${commander?'commander':''}">${commander?'MODO: COMANDO CENTRAL':'MODO: TERMINAL DO OPERADOR'}</span>
            <span class="vgOperatorActive">${commander?'COMANDANTE':'OPERADOR ATIVO'}: <strong>@${esc(nick(me))}</strong>${!commander?` • <em>${esc(rankText(me))}</em>`:''}</span>
          </div>
          <p class="vgStatusDesc">${esc(descriptor)}</p>
        </div>
      </div>
      <div class="vgTelemetry">
        <div class="vgTelemetryCell"><small>STATUS DO SISTEMA</small><b class="ok">● ONLINE</b></div>
        <div class="vgTelemetryCell"><small>SESSÃO</small><b>AUTENTICADA</b></div>
        <div class="vgTelemetryCell"><small>CANAL TGA</small><b>OPS // 2026</b></div>
      </div>
    </div>`;
  }

  const commanderNavItems=[
    ['/comandante','Visão geral','home'],
    ['/comandante/equipe','Operadores','users'],
    ['/comandante/jogos','Jogos','game'],
    ['/comandante/patentes-elos','Patentes e Elos','rank'],
    ['/comandante/historico','Partidas / Histórico','history'],
    ['/comandante/financeiro','Mensalidades','money'],
    ['/comandante/visitas','Visitantes','visitor'],
    ['/comandante/configuracoes','Configurações','settings']
  ];
  const commanderPageMeta={
    '/comandante':['COMANDO CENTRAL','VISÃO GERAL','Acompanhe equipe, operações, financeiro e administração do grupo.'],
    '/comandante/equipe':['EFETIVO & GESTÃO','OPERADORES','Gerencie operadores, recrutamento, patentes, disciplina e acessos.'],
    '/comandante/jogos':['PLANEJAMENTO DE OPERAÇÕES','JOGOS & MISSÕES','Crie operações, gerencie briefing e acompanhe o efetivo convocado.'],
    '/comandante/patentes-elos':['HIERARQUIA DO COMANDO','PATENTES & ELOS','Gerencie progressão, elo, promoções e histórico do efetivo.'],
    '/comandante/historico':['ARQUIVO DE OPERAÇÕES','PARTIDAS / HISTÓRICO','Consulte operações finalizadas, presença, faltas e resultados.'],
    '/comandante/financeiro':['TESOURARIA DO COMANDO','FINANCEIRO ANUAL','Controle mensalidades, caixa, pendências e pagamentos dos 12 meses.'],
    '/comandante/visitas':['ACESSO DE VISITANTES','VISITANTES','Gerencie convites, solicitações e presença de visitantes.'],
    '/comandante/configuracoes':['CONFIGURAÇÃO DO COMANDO','CONFIGURAÇÕES','Ajuste conta, campos, site, aplicativo e segurança administrativa.']
  };

  function enhanceCommander(){
    if(!isCommander())return false;
    document.body.classList.remove('commander-admin-mode');
    document.body.classList.add('commander-vanguard-v2','commander-vertical-nav');
    document.getElementById('cmdAdminSidebar')?.setAttribute('hidden','');
    document.getElementById('cmdAdminTopbar')?.setAttribute('hidden','');
    const section=document.querySelector('#app>section');if(!section)return false;
    document.getElementById('vgCommanderModules')?.remove();
    section.querySelector('.commandNav')?.setAttribute('hidden','');

    let layout=section.querySelector(':scope > .vgCommanderSidebarLayout');
    if(!layout){
      layout=document.createElement('div');layout.className='vgCommanderSidebarLayout';
      const aside=document.createElement('aside');aside.className='vgCommanderSidebar';
      const content=document.createElement('main');content.className='vgCommanderSidebarContent';
      const children=[...section.children];
      children.forEach(ch=>{if(ch!==layout)content.appendChild(ch)});
      layout.append(aside,content);section.appendChild(layout);
    }
    const aside=layout.querySelector('.vgCommanderSidebar'),content=layout.querySelector('.vgCommanderSidebarContent');
    let drawerBtn=layout.querySelector(':scope > .vgCommanderMobileDrawerButton');
    if(!drawerBtn){
      drawerBtn=document.createElement('button');
      drawerBtn.type='button';
      drawerBtn.className='vgCommanderMobileDrawerButton';
      drawerBtn.setAttribute('aria-expanded','false');
      layout.insertBefore(drawerBtn,aside);
    }
    let drawerShade=layout.querySelector(':scope > .vgCommanderMobileShade');
    if(!drawerShade){
      drawerShade=document.createElement('button');
      drawerShade.type='button';
      drawerShade.className='vgCommanderMobileShade';
      drawerShade.setAttribute('aria-label','Fechar menu do comandante');
      layout.insertBefore(drawerShade,content);
    }
    const p=path(),avatar=me?.photo_url?`<img src="${esc(me.photo_url)}" alt="">`:esc(initial(me));
    const navSig=[p,me?.id||'',me?.nickname||'',me?.rank||'',me?.photo_url||''].join('|');
    const currentItem=commanderNavItems.find(([href])=>href===p)||commanderNavItems[0];
    drawerBtn.innerHTML=`<span>${icons[currentItem[2]]}</span><b>${esc(currentItem[1])}</b><em>☰</em>`;
    if(aside.dataset.vgNavSig!==navSig){
      aside.dataset.vgNavSig=navSig;
      aside.innerHTML=`<button type="button" class="vgCommanderMobileNavToggle" aria-expanded="false"><span>${icons[currentItem[2]]}</span><b>${esc(currentItem[1])}</b><em>☰</em></button>
        <div class="vgCommanderIdentity"><span class="vgCommanderSideAvatar">${avatar}</span><span><strong>@${esc(nick(me||{}))}</strong><small>${esc(rankText(me||{}))} • COMANDO</small></span></div>
        <div class="vgCommanderPanelLabel">PAINEL DO COMANDANTE</div>
        <nav class="vgCommanderVerticalNav">${commanderNavItems.map(([href,label,key])=>`<a class="${p===href?'active':''}" href="${href}" data-vg-glyph="${key}"><span>${icons[key]}</span><b>${esc(label)}</b></a>`).join('')}</nav>`;
    }
    if(!drawerBtn.dataset.vgDrawerBound){
      drawerBtn.dataset.vgDrawerBound='1';
      const closeDrawer=()=>{
        aside.classList.remove('mobile-open');
        layout.classList.remove('mobile-nav-open');
        drawerBtn.setAttribute('aria-expanded','false');
      };
      drawerBtn.addEventListener('click',e=>{
        e.preventDefault();
        e.stopPropagation();
        const open=!aside.classList.contains('mobile-open');
        aside.classList.toggle('mobile-open',open);
        layout.classList.toggle('mobile-nav-open',open);
        drawerBtn.setAttribute('aria-expanded',open?'true':'false');
      });
      drawerShade.addEventListener('click',e=>{e.preventDefault();closeDrawer()});
    }
    if(!aside.dataset.vgNavBound){
      aside.dataset.vgNavBound='1';
      aside.addEventListener('click',e=>{
        const toggle=e.target.closest('.vgCommanderMobileNavToggle');
        if(toggle){
          e.preventDefault();
          e.stopPropagation();
          const open=aside.classList.toggle('mobile-open');
          toggle.setAttribute('aria-expanded',open?'true':'false');
          return;
        }
        const a=e.target.closest('.vgCommanderVerticalNav a[href]');
        if(!a)return;
        e.preventDefault();
        e.stopPropagation();
        aside.classList.remove('mobile-open');
        layout.classList.remove('mobile-nav-open');
        drawerBtn.setAttribute('aria-expanded','false');
        aside.querySelector('.vgCommanderMobileNavToggle')?.setAttribute('aria-expanded','false');
        const href=a.getAttribute('href');
        if(href&&href!==location.pathname)location.assign(href);
      });
    }
    const meta=commanderPageMeta[p]||commanderPageMeta['/comandante'];
    let head=content.querySelector(':scope > .vgCommanderPageHead');
    if(!head){head=document.createElement('section');head.className='vgCommanderPageHead';content.insertBefore(head,content.firstChild)}
    head.innerHTML=`<div class="vgLiveLabel">${esc(meta[0])}</div><h2>${esc(meta[1])}</h2><p>${esc(meta[2])}</p>`;
    content.querySelector('.pageTitle')?.classList.add('vgLegacyPageTitle');
    return true;
  }

  const operatorPages={
    '/operador':['TERMINAL DO OPERADOR','VISÃO GERAL & PROGRESSÃO','Acompanhe jogos, progressão, financeiro e avisos do seu perfil.'],
    '/operador/jogos':['QUADRO DE OPERAÇÕES & CONVOCAÇÃO','JOGOS ATUAIS & MISSÕES','Confirme presença, acompanhe escalação e os times da operação.'],
    '/operador/patentes':['PROGRESSÃO DE CARREIRA','PATENTES & HIERARQUIA','Veja sua patente atual, requisitos e o quadro hierárquico completo.'],
    '/operador/equipamentos':['ARSENAL DO OPERADOR','EQUIPAMENTOS, AEG & FOTOS','Gerencie seu inventário tático, réplicas, fardamento e galeria.'],
    '/operador/equipe':['EFETIVO TÁTICO','OPERADORES DA EQUIPE','Consulte patentes, funções e dossiês públicos do efetivo.'],
    '/operador/mensalidades':['TESOURARIA INDIVIDUAL','MENSALIDADE ATUAL','Acompanhe somente sua situação financeira no grupo.'],
    '/operador/arena':['TREINAMENTO DIGITAL','MINI JOGOS TÁTICOS','Treinos rápidos de reflexo e desempenho do operador.'],
    '/operador/configuracoes':['DADOS DO OPERADOR','CONFIGURAÇÕES & TUTORIA','Atualize perfil, equipamentos, segurança e responsável quando necessário.']
  };
  const glyphs={
    '/operador':'⌖','/operador/equipe':'◉','/operador/jogos':'◆','/operador/patentes':'◇','/operador/equipamentos':'⌘','/operador/mensalidades':'▣','/operador/arena':'◎','/operador/configuracoes':'⚙'
  };
  const names={
    '/operador':'Painel do operador','/operador/equipe':'Perfis dos operadores','/operador/jogos':'Jogos atuais & finalizados',
    '/operador/patentes':'Progressões de patente','/operador/equipamentos':'Equipamentos, AEG & fotos','/operador/mensalidades':'Mensalidade atual','/operador/arena':'Mini jogos','/operador/configuracoes':'Configurações & tutoria'
  };

  function enhanceOperator(){
    if(!isOperator()||!me)return false;
    document.body.classList.add('operator-vanguard-v2');
    const nav=document.querySelector('.operatorNav');if(!nav)return false;
    const wrap=nav.closest('.ofdNavWrap')||nav.parentElement;
    if(wrap&&!wrap.querySelector('.vgOperatorIdentity')){
      const avatar=me.photo_url?`<img src="${esc(me.photo_url)}" alt="">`:esc(initial(me));
      const identity=document.createElement('div');identity.className='vgOperatorIdentity';
      identity.innerHTML=`<span class="vgSideAvatar">${avatar}</span><span><strong>@${esc(nick(me))}</strong><small>${esc(rankText(me))} • ${esc(me.function||'Operador')}</small></span>`;
      wrap.insertBefore(identity,nav);
      const lab=document.createElement('div');lab.className='vgOperatorPanelLabel';lab.textContent='PAINEL DO OPERADOR';identity.insertAdjacentElement('afterend',lab)
    }
    nav.querySelectorAll('a').forEach(a=>{
      const href=(a.getAttribute('href')||'').replace(/\/+$/,'')||'/';
      if(names[href]&&a.textContent!==names[href])a.textContent=names[href];
      const glyph=glyphs[href]||'•';if(a.dataset.vgGlyph!==glyph)a.dataset.vgGlyph=glyph;
    });
    const content=document.querySelector('.opSidebarContent');if(content&&!content.querySelector(':scope > .vgOperatorPageHead')){
      const meta=operatorPages[path()]||operatorPages['/operador'];
      const head=document.createElement('section');head.className='vgOperatorPageHead';
      head.innerHTML=`<div class="vgLiveLabel">${esc(meta[0])}</div><h2>${esc(meta[1])}</h2><p>${esc(meta[2])}</p>`;
      content.insertBefore(head,content.firstChild)
    }
    return true;
  }

  function sync(){
    if(isCommander())document.body.classList.remove('commander-admin-mode');
    buildHeader();
    const loginMode=document.body.classList.contains('operator-login-mode');
    if(!me||loginMode)document.getElementById('vgStatusBanner')?.remove();
    if(me&&!loginMode){buildStatus();enhanceCommander();enhanceOperator()}
  }

  window.__tgaVanguardCompatibility=true;
  window.__tgaSyncVanguard=()=>{
    const shared=window.__tgaCurrentOperator;
    if(shared&&typeof shared==='object'&&(shared.id||shared.nickname||shared.email)){me=shared;meLoaded=true}
    sync();
  };
  window.addEventListener('tga:operator-user',e=>{
    const shared=e.detail||window.__tgaCurrentOperator;
    if(shared&&typeof shared==='object'&&(shared.id||shared.nickname||shared.email)){me=shared;meLoaded=true}
    else if(isOperator()){me=null;meLoaded=true}
    const header=document.querySelector('body>header');if(header)delete header.dataset.vgStructure;
    sync();
    window.dispatchEvent(new Event('tga:vanguard-ready'));
  });
  loadMe().finally(()=>{
    const header=document.querySelector('body>header');if(header)delete header.dataset.vgStructure;
    sync();
    window.dispatchEvent(new Event('tga:vanguard-ready'));
  });
  let timer;
  const root=document.getElementById('app')||document.body;
  new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(sync,45)}).observe(root,{childList:true,subtree:true});
  let tries=0;
  const retry=setInterval(()=>{sync();if(++tries>20)clearInterval(retry)},150);
  sync();
})();