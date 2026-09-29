const app=document.getElementById('app');
const nav=document.getElementById('nav');
let me=null;
const ME_CACHE_KEY='tga_me_cache_v2';
const readMeCache=()=>{try{const x=JSON.parse(sessionStorage.getItem(ME_CACHE_KEY)||'null');if(!x?.user||Date.now()-Number(x.at||0)>900000)return null;return x.user}catch{return null}};
const writeMeCache=user=>{try{if(user)sessionStorage.setItem(ME_CACHE_KEY,JSON.stringify({at:Date.now(),user}));else sessionStorage.removeItem(ME_CACHE_KEY)}catch{}};

const api=async(action,options={})=>{
  const [rawAction, rawQuery='']=String(action||'').split('&',2);
  const query=rawQuery?('&'+rawQuery):'';
  const cacheBust=(options.method||'GET')==='GET'?`${query?'&':'&'}_t=${Date.now()}`:'';
  const controller=!options.signal&&'AbortController' in window?new AbortController():null;
  const timeoutMs=Math.max(2500,Number(options.timeoutMs||7500));
  const timer=controller?setTimeout(()=>controller.abort(),timeoutMs):null;
  const {timeoutMs:_timeout,...rest}=options;
  const fetchOptions={cache:'no-store',headers:{'Content-Type':'application/json',...(options.headers||{})},...rest,signal:options.signal||controller?.signal};
  try{
    const r=await fetch('/api/index.js?action='+encodeURIComponent(rawAction)+query+cacheBust,fetchOptions);
    const text=await r.text();
    let data={};
    try{data=text?JSON.parse(text):{}}catch{data={error:'Resposta inválida do servidor.'}}
    if(!r.ok)throw new Error(data.error||'Erro interno.');
    return data;
  }catch(e){
    if(e?.name==='AbortError')throw new Error('A conexão demorou demais. Tente novamente.');
    throw e;
  }finally{if(timer)clearTimeout(timer)}
};
const post=(action,data)=>api(action,{method:'POST',body:JSON.stringify(data)});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=d=>{if(!d)return 'Data não informada';const s=String(d);const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return new Date(Date.UTC(+m[1],+m[2]-1,+m[3])).toLocaleDateString('pt-BR',{timeZone:'UTC'});const x=new Date(s);return Number.isNaN(x.getTime())?'Data não informada':x.toLocaleDateString('pt-BR')};
const fmtTime=t=>t?String(t).slice(0,5):'';
const photoOrInitial=(o,big=false)=>o.photo_url?`<img class="profilePhoto ${big?'big':''}" loading="lazy" decoding="async" src="${o.photo_url}" alt="Foto de ${esc(o.nickname)}">`:`<div class="avatar ${big?'big':''}">${esc((o.nickname||'?').slice(0,2))}</div>`;
const eloMeta=level=>{const n=Math.min(7,Math.max(1,Number(level)||7));const map={1:['Diamante','diamond','💎'],2:['Esmeralda','emerald','🟩'],3:['Platina','platinum','🔷'],4:['Ouro','gold','🏆'],5:['Prata','silver','🥈'],6:['Bronze','bronze','🥉'],7:['Ferro','iron','⚙️']};const m=map[n]||map[7];return {level:n,label:m[0],tone:m[1],symbol:m[2]}};
const rankSymbols={
  'Recruta':'🪖','Soldado':'🎖️','Cabo':'⭐','3º Sargento':'🏅','2º Sargento':'🏅','1º Sargento':'🏅','Subtenente':'🛡️','Aspirante':'🎯','Tenente':'⚔️','Capitão':'🛡️','Major':'🏆','Tenente-Coronel':'🎖️','Coronel':'👑'
};
const rankIcon=rank=>rankSymbols[rank]||'🎖️';

const eloBadge=level=>{const e=eloMeta(level);return `<span class="eloBadge ${e.tone}"><span class="eloSymbol">${e.symbol}</span> Elo ${e.level} · ${e.label}</span>`};
function showRouteLoading(){let x=document.getElementById('routeLoading');if(!x){x=document.createElement('div');x.id='routeLoading';x.className='routeLoading';x.innerHTML='<div class="routeSpinner"></div><span>Abrindo...</span>';document.body.appendChild(x)}clearTimeout(window.__tgaRouteLoadingTimer);requestAnimationFrame(()=>x.classList.add('show'));window.__tgaRouteLoadingTimer=setTimeout(()=>x.classList.remove('show'),3200);}
function gameParticipantSummary(p,admin=false,gameId=''){const l=p.loadout||{};const extras=Array.isArray(l.equipamentos_extras)?l.equipamentos_extras.filter(Boolean):[];const gear=[l.funcao,l.aeg_secundaria||l.replica,...extras].filter(Boolean);return `<div class="gameParticipant"><a class="gameParticipantIdentity" href="/visitantes?operator=${encodeURIComponent(p.id)}${admin?'&from=commander':''}"><img loading="lazy" decoding="async" src="${p.photo_url||'/logo.webp'}" alt="Foto de ${esc(p.nickname)}" class="gameParticipantPhoto"><div><b>@${esc(p.nickname)}</b>${p.name?`<span class=\"participantName\">${esc(p.name)}</span>`:''}<span>${esc(p.rank||'Operador')} · ${esc(p.function||'Operador')}</span>${p.elo_level?eloBadge(p.elo_level):''}</div></a><div class="gameParticipantGear">${gear.length?gear.map(x=>`<span>${esc(x)}</span>`).join(''):'<span class="muted">Sem equipamentos informados</span>'}</div>${admin?`<div class="gameParticipantAdmin"><button type="button" class="mini" data-attendance="${gameId}" data-operator="${p.id}" data-present="1">✓ Presente</button><button type="button" class="mini danger" data-attendance="${gameId}" data-operator="${p.id}" data-present="0">Faltou</button><button type="button" class="mini" data-discipline="${p.id}" data-type="highlander">Highlander</button><button type="button" class="mini danger" data-discipline="${p.id}" data-type="misconduct">Conduta</button></div>`:''}</div>`;}
function openImageLightbox(src,alt='Imagem'){const m=document.createElement('div');m.className='lightbox';m.innerHTML=`<button class="lightboxClose" type="button">×</button><img src="${src}" alt="${esc(alt)}">`;document.body.appendChild(m);const close=()=>m.remove();m.onclick=e=>{if(e.target===m||e.target.classList.contains('lightboxClose'))close()};document.addEventListener('keydown',function onKey(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',onKey)}},{once:true});}
function toast(t){const x=document.createElement('div');x.className='toast';x.textContent=t;document.body.appendChild(x);setTimeout(()=>x.remove(),3500)}
function installButton(){return me&&['operator','commander'].includes(me.role)?'<button id="installApp" class="ghost">Instalar app</button>':''}
function shell(){
  const menu=document.getElementById('menuToggle');
  let storedInstagram='';try{storedInstagram=localStorage.getItem('tga_instagram_url')||''}catch{} nav.innerHTML=`<div class="navGroup"><a href="/visitantes">Equipe</a>${storedInstagram?`<a class="mobileInstagramNav" href="${esc(storedInstagram)}" target="_blank" rel="noopener">Instagram</a>`:''}</div><div class="navGroup navAccess">${me?'<a href="/operador">Operador</a>':''}${me?.role==='commander'?'<a href="/comandante">Comandante</a>':''}${me?`<div class="notifWrap"><button id="notifBell" class="ghost">🔔</button><div id="notifList" class="notifMenu"></div></div>`:''}${me?'<button class="ghost" id="logout">Sair</button>':''}${!me?'<a class="goldbtn small" href="/entrar">Entrar</a>':''}${installButton()}</div>`;
  menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu?.setAttribute('aria-expanded','false');showRouteLoading()}));
  document.querySelectorAll('a[href^="/"]:not([target="_blank"])').forEach(a=>a.addEventListener('click',e=>{const href=a.getAttribute('href')||'';if(href&&!href.startsWith('#'))showRouteLoading()}));
  document.getElementById('logout')?.addEventListener('click',async()=>{writeMeCache(null);await api('logout').catch(()=>{});showRouteLoading();location.href='/'});
  document.getElementById('installApp')?.addEventListener('click',installPWA);
  document.getElementById('notifBell')?.addEventListener('click',()=>{document.getElementById('notifList')?.classList.toggle('open');loadNotifications()});
  if(me&&!window.__tgaBackgroundStarted){
    window.__tgaBackgroundStarted=true;
    const later=fn=>'requestIdleCallback' in window?requestIdleCallback(fn,{timeout:2800}):setTimeout(fn,1800);
    later(()=>loadNotifications());
    if(typeof Notification!=='undefined'&&Notification.permission==='granted')later(()=>pushSetup());
  }
}
function syncInstagramHeader(url){try{if(url)localStorage.setItem('tga_instagram_url',String(url));else localStorage.removeItem('tga_instagram_url')}catch{} const host=document.getElementById('instagramHeader');if(!host)return;if(url){host.innerHTML=`<a class="instagramLink" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Instagram da equipe" title="Instagram da equipe"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="1" class="fill"></circle></svg></a>`}else host.innerHTML=''}
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;document.documentElement.classList.add('pwa-ready')});
async function installPWA(){if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;return}const m=document.createElement('div');m.className='modal';m.innerHTML='<div class="modalBox"><button class="x" type="button">×</button><div class="cardKicker">INSTALAR APLICATIVO</div><h2>Tactical Group Airsoft</h2><p class="muted">O navegador não liberou a instalação automática nesta sessão. Você ainda pode instalar pelo menu do navegador.</p><p><b>Android/Chrome:</b> toque em ⋮ → <b>Instalar aplicativo</b> ou <b>Adicionar à tela inicial</b>.</p><p><b>Computador:</b> use o ícone de instalação na barra de endereço, quando aparecer.</p><button type="button" class="goldbtn" id="closeInstallHelp">Entendi</button></div>';document.body.appendChild(m);const close=()=>m.remove();m.querySelector('.x').onclick=close;m.querySelector('#closeInstallHelp').onclick=close;m.onclick=e=>{if(e.target===m)close()}}
window.addEventListener('appinstalled',()=>{deferredPrompt=null;toast('Aplicativo instalado com sucesso.')});
async function pushSetup(){try{if(!me||!['operator','commander'].includes(me.role)||!('serviceWorker' in navigator)||!('PushManager' in window))return;const cfg=await api('push-config');if(!cfg.enabled)return;const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();if(!sub){const permission=await Notification.requestPermission();if(permission!=='granted')return;const raw=atob(cfg.publicKey.replace(/-/g,'+').replace(/_/g,'/'));const padded=raw+'='.repeat((4-raw.length%4)%4);const key=Uint8Array.from([...atob(padded)].map(c=>c.charCodeAt(0)));sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key})}await post('push-subscribe',{subscription:sub.toJSON()})}catch(e){console.warn('Push indisponível',e)}}
async function loadNotifications(target='notifList'){if(!me)return;try{const d=await api('notifications');const count=(d.items||[]).filter(x=>!x.read_at).length;const bell=document.getElementById('notifBell');if(bell)bell.innerHTML=`🔔${count?`<span class="notifBadge">${count}</span>`:''}`;const box=document.getElementById(target);if(box){box.innerHTML=(d.items||[]).map(n=>`<button class="notifItem ${n.read_at?'':'unread'}" data-notif="${n.id}"><b>${esc(n.title)}</b><span>${esc(n.body)}</span><small>${new Date(n.created_at).toLocaleString('pt-BR')}</small></button>`).join('')||'<span class="muted">Nenhuma notificação.</span>';box.querySelectorAll('[data-notif]').forEach(b=>b.onclick=async()=>{await post('notification-read',{id:b.dataset.notif});const item=d.items.find(x=>String(x.id)===String(b.dataset.notif));if(item?.link)location.href=item.link;else loadNotifications(target)})}}catch(e){console.warn(e)}}

async function loadHeroVideo(){
  const video=document.querySelector('.heroVideo');
  if(!video)return;
  const src=video.dataset.src||video.getAttribute('src');
  if(!src)return;
  video.muted=true;
  video.defaultMuted=true;
  video.loop=true;
  video.autoplay=true;
  video.playsInline=true;
  if(!video.getAttribute('src'))video.src=src;
  video.dataset.loaded='1';
  const play=()=>{
    if(!document.documentElement.contains(video)||!video.paused)return;
    try{
      const p=video.play();
      if(p&&typeof p.catch==='function')p.catch(()=>{});
    }catch{}
  };
  if(video.readyState>=2)play();
  else{
    video.addEventListener('loadeddata',play,{once:true});
    video.addEventListener('canplay',play,{once:true});
  }
  video.load();
  play();
  window.addEventListener('pointerdown',play,{once:true,passive:true});
  window.addEventListener('touchstart',play,{once:true,passive:true});
  window.addEventListener('keydown',play,{once:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)play()});
}

async function home(){
  const d=await api('public');
  syncInstagramHeader(d.instagram_url);
  app.innerHTML=`<section class="homeHero">
    <video class="heroVideo" muted autoplay loop playsinline preload="metadata" poster="/hero-airsoft.jpg" data-src="/tga-home.mp4" aria-label="Vídeo do Tactical Group Airsoft"></video>
    <div class="heroShade"></div>
    <div class="heroContent">
      <img class="heroLogo" src="/logo.webp" alt="Tactical Group Airsoft">
      <div class="eyebrow">TACTICAL GROUP AIRSOFT</div>
      <h1>Equipe. Hierarquia.<br><span>Operações.</span></h1>
      <p>Operação, treino e comunidade. Onde a disciplina do campo encontra a organização digital.</p>
      <div class="heroActions"><a class="goldbtn" href="/visitantes">Conhecer o time</a><a class="outlinebtn" href="/entrar">Entrar</a>${d.instagram_url?`<a class="outlinebtn" href="${esc(d.instagram_url)}" target="_blank" rel="noopener">Instagram</a>`:''}</div>
    </div>
    <div class="heroCard"><b>PRÓXIMO JOGO ATIVO</b>${d.games[0]?`<strong>${esc(d.games[0].title)}</strong><span>${fmt(d.games[0].game_date)}${d.games[0].game_time?' · '+fmtTime(d.games[0].game_time):''} · ${esc(d.games[0].field_name||d.games[0].location)}</span>${d.games[0].field_maps_url?`<a class="mini" href="${esc(d.games[0].field_maps_url)}" target="_blank" rel="noopener">📍 Google Maps</a>`:''}<button id="visitGameBtn" class="goldbtn small" data-game="${d.games[0].id}" data-title="${esc(d.games[0].title)}">Eu quero visitar</button>`:'<span>Nenhum jogo ativo publicado ainda.</span>'}</div>
  </section>
  <section class="homeInfo"><div class="infoCard"><img src="/logo.webp" alt="Logo Tactical Group Airsoft"><div><div class="eyebrow">PORTAL OFICIAL</div><h2>Disciplina, equipe e operação.</h2><p>Visitantes conhecem o time. Operadores cuidam do próprio perfil e presença. O comandante administra tudo.</p></div></div></section>`;
  const startVideo=()=>{const run=()=>loadHeroVideo();if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:1800});else setTimeout(run,1200)};startVideo();document.getElementById('visitGameBtn')?.addEventListener('click',e=>visitorModal(e.currentTarget.dataset.game,e.currentTarget.dataset.title));
}

async function visitors(){
  const d=await api('public');
  syncInstagramHeader(d.instagram_url);
  const cards=d.operators.map(o=>`<a class="card operator visitorCard" href="/visitantes?operator=${o.id}&from=commander">${photoOrInitial(o)}<div><h3>@${esc(o.nickname)}</h3>${o.name?`<div class="operatorRealName">${esc(o.name)}</div>`:''}<div class="rank">${esc(o.rank)}</div><p>${esc(o.function||'Operador')}</p><small>${o.airsoft_years?esc(o.airsoft_years)+' anos de airsoft':'Perfil em construção'}</small></div></a>`).join('');
  const q=new URLSearchParams(location.search);let profile='';
  if(q.get('operator')){
    try{
      const profileId=q.get('operator');
      const p=await fetch('/api/index.js?action=operator&id='+encodeURIComponent(profileId),{headers:{'Content-Type':'application/json'}}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Erro ao carregar perfil.');return data}); const o=p.operator;
      profile=`<section class="profilePanel"><div class="profileHero">${photoOrInitial(o,true)}<div><div class="eyebrow">PERFIL DO OPERADOR</div><h2>@${esc(o.nickname)}</h2>${o.name?`<div class="operatorRealName profileName">${esc(o.name)}</div>`:''}<div class="rank">${esc(o.rank)} · ${esc(o.function||'Operador')}</div><p>${esc(o.bio||'Sem descrição cadastrada.')}</p></div></div>
      <div class="profileStats"><div><b>Nascimento</b><span>${o.birth_date?fmt(o.birth_date):'Não informado'}</span></div><div><b>Idade</b><span>${o.age?esc(o.age)+' anos':'Não informado'}</span></div><div><b>Airsoft</b><span>${o.airsoft_years?esc(o.airsoft_years)+' anos':'Não informado'}</span></div><div><b>Estilo</b><span>${esc(o.play_style||'Não informado')}</span></div></div>
      <div class="profileCols"><div><h3>Loadout</h3><p><b>AEG principal:</b> ${esc(o.primary_replica||'Não informado')}</p><p><b>Secundária:</b> ${esc(o.secondary_replica||'Não informado')}</p><h3>Equipamentos</h3><div class="equipmentPublicGrid">${p.equipment.length?p.equipment.map(e=>`<article class="equipmentPublicCard">${e.photo_url?`<button class="equipmentPhotoButton" type="button" data-lightbox-src="${e.photo_url}" data-lightbox-alt="Foto de ${esc(e.name)}"><img loading="lazy" decoding="async" src="${e.photo_url}" alt="Foto de ${esc(e.name)}"></button>`:''}<div><b>${esc(e.category)}</b><strong>${esc(e.name)}</strong>${e.details?`<span>${esc(e.details)}</span>`:''}</div></article>`).join(''):'<span class="muted">Nenhum equipamento público.</span>'}</div></div><div><h3>Galeria</h3><div class="gallery">${p.gallery.length?p.gallery.map(g=>`<img loading="lazy" decoding="async" src="${g.image_data}" alt="${esc(g.caption||'Foto do operador')}">`).join(''):'<div class="muted">Nenhuma foto cadastrada.</div>'}</div></div></div>
      <div class="profileActions"><a class="goldbtn" href="#visit">Solicitar visita</a>${q.get('from')==='commander'?'<a class="goldbtn" href="/comandante/equipe">← Voltar ao Comandante</a>':''}<a class="outlinebtn" href="/visitantes">Voltar para operadores</a></div></section>`;
    }catch(e){profile=`<div class="error">${esc(e.message)}</div>`}
  }
  app.innerHTML=`<section><div class="pageTitle"><div class="pageBrand"><img src="/logo.webp" alt="Tactical Group Airsoft"><div><div class="eyebrow">ÁREA DO VISITANTE</div><h1>Conheça o time</h1><p>Veja patentes, funções, equipamentos e perfis públicos dos operadores.</p></div></div></div><div class="sectionHead"><div><div class="eyebrow">OPERADORES</div><h2>Equipe Tactical Group</h2></div><button id="visitBtn" class="goldbtn">Solicitar visita</button></div><div class="visitorGrid">${cards||'<div class="muted">Nenhum operador publicado.</div>'}</div>${profile}<section class="completedGamesPublic"><div class="sectionHead"><div><div class="eyebrow">MEMÓRIA DO TIME</div><h2>Jogos finalizados</h2><p>Fotos das partidas encerradas e do grupo reunido.</p></div></div><div class="historyGallery">${(d.completedGames||[]).map(g=>`<article class="historyGameCard">${g.match_photo_url?`<img loading="lazy" decoding="async" src="${g.match_photo_url}" alt="Foto da partida ${esc(g.title)}">`:''}<div class="historyGameBody"><h3>${esc(g.title)}</h3><small>${fmt(g.game_date)}${g.game_time?' · '+fmtTime(g.game_time):''}</small><span class="tag">Finalizado</span></div></article>`).join('')||'<div class="muted">Nenhuma partida finalizada com foto.</div>'}</div></section><div id="visit"></div></section>`;
  app.querySelectorAll('[data-lightbox-src]').forEach(b=>b.addEventListener('click',()=>openImageLightbox(b.dataset.lightboxSrc,b.dataset.lightboxAlt||'Equipamento')));
  document.getElementById('visitBtn').onclick=()=>visitorModal();
}
function visitorModal(gameId='',gameTitle=''){const m=document.createElement('div');m.className='modal';m.innerHTML=`<form class="modalBox"><button type="button" class="x">×</button><img class="accessLogo" src="/logo.webp"><div class="eyebrow">VISITANTE</div><h2>Solicitar visita</h2>${gameTitle?`<p class="muted">Interesse no jogo: <b>${esc(gameTitle)}</b></p>`:''}<input type="hidden" name="game_id" value="${esc(gameId)}"><input name="name" placeholder="Nome completo" required><input name="nickname" placeholder="Apelido"><input name="contact" placeholder="WhatsApp / contato" required><textarea name="message" placeholder="Mensagem para o comando"></textarea><button class="goldbtn">Enviar solicitação</button></form>`;document.body.appendChild(m);m.querySelector('.x').onclick=()=>m.remove();m.querySelector('form').onsubmit=async e=>{e.preventDefault();try{const d=await post('visitor-request',Object.fromEntries(new FormData(e.target)));m.remove();toast(d.message)}catch(x){toast(x.message)}}}

function loginBox(mode='operator'){
  const label=mode==='commander'?'ENTRADA DO COMANDANTE':'ENTRADA DO OPERADOR';
  const title=mode==='commander'?'Comandante':'Operador';
  app.innerHTML=`<div class="auth"><form class="modalBox accessBox"><img class="accessLogo" src="/logo.webp" alt="Logo"><div class="eyebrow">${label}</div><h1>${title}</h1><a class="backLogin" href="/entrar">← Voltar</a><div id="err"></div><input name="identifier" placeholder="E-mail ou apelido" required><input name="password" type="password" placeholder="Senha" required><button class="goldbtn">Entrar</button>${mode==='operator'?'<a class="outlinebtn" href="/operador/primeiro-acesso">Primeiro acesso com código</a>':''}<div class="accessLinks"><a href="/visitantes">Visitante</a><a href="/">Início</a></div></form></div>`;
  app.querySelector('form').onsubmit=async e=>{e.preventDefault();try{const d=await post('login',Object.fromEntries(new FormData(e.target)));if(mode==='commander'&&d.user.role!=='commander')throw new Error('Esta conta não é de comandante.');me=d.user;writeMeCache(me);location.replace(mode==='commander'?'/comandante':'/operador')}catch(x){document.getElementById('err').innerHTML=`<div class="error">${esc(x.message)}</div>`}}
}
function accessChoice(){app.innerHTML=`<div class="auth"><div class="modalBox accessBox"><img class="accessLogo" src="/logo.webp" alt="Logo"><div class="eyebrow">ACESSO RESTRITO</div><h1>Escolha seu acesso</h1><p class="muted">Comandantes também possuem acesso completo à área do operador.</p><div class="accessChoiceGrid"><a class="goldbtn" href="/operador">Entrar como Operador</a><a class="outlinebtn" href="/comandante">Entrar como Comandante</a></div><div class="accessLinks"><a href="/visitantes">Visitante</a><a href="/">Início</a></div></div></div>`}
function firstAccess(){app.innerHTML=`<div class="auth"><form class="modalBox accessBox"><img class="accessLogo" src="/logo.webp"><div class="eyebrow">PRIMEIRO ACESSO</div><h1>Ativar conta de operador</h1><div id="err"></div><input name="code" placeholder="Código TGA-XXXXXX-XXXXXX" required><input name="email" type="email" placeholder="Seu e-mail" required><input name="password" type="password" placeholder="Crie uma senha (mínimo 8 caracteres)" minlength="8" required><input name="confirm_password" type="password" placeholder="Confirme a senha" minlength="8" required><button class="goldbtn">Ativar minha conta</button><a class="outlinebtn" href="/operador">Já tenho conta</a></form></div>`;app.querySelector('form').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));if(d.password!==d.confirm_password)return toast('As senhas não conferem.');delete d.confirm_password;try{const r=await post('activate-operator',d);me=r.user;toast('Conta ativada');setTimeout(()=>location.href='/operador',250)}catch(x){document.getElementById('err').innerHTML=`<div class="error">${esc(x.message)}</div>`}}}


function operatorSubnav(active){
  const items=[['visao','Visão geral'],['configuracoes','Configurações']];
  return `<div class="operatorNav">${items.map(([id,label])=>`<a class="${active===id?'active':''}" href="/operador${id==='visao'?'':'/configuracoes'}">${label}</a>`).join('')}</div>`;
}
async function operatorSettings(){
  const d=await api('profile-data'); const u=d.user;
  syncInstagramHeader(d.instagram_url);
  app.innerHTML=`<section><div class="pageTitle"><div class="pageBrand">${photoOrInitial(u,true)}<div><div class="eyebrow">ÁREA DO OPERADOR</div><h1>Configurações</h1><p>Gerencie seu nome, acesso, e-mail, apelido e senha.</p></div></div></div>
  ${operatorSubnav('configuracoes')}
  <div class="card formCard operatorLoginCard">
    <div class="cardKicker">ACESSO</div>
    <h2>Configurações de login</h2>
    <p class="muted">Use nome, e-mail, apelido e senha para entrar como operador. Comandantes autorizados também usam a mesma conta para acessar a área de Comandante.</p>
    <form id="operatorLoginSettingsForm">
      <div class="formGrid">
        <input name="name" value="${esc(u.name||'')}" placeholder="Nome completo" required>
        <input name="nickname" value="${esc(u.nickname||'')}" placeholder="Apelido" required>
        <input name="email" type="email" value="${esc(u.email||'')}" placeholder="E-mail">
        <input name="current_password" type="password" placeholder="Senha atual" required>
        <input name="new_password" type="password" placeholder="Nova senha (deixe vazio para manter)">
      </div>
      <small class="muted">A senha atual é obrigatória. Nova senha: mínimo de 8 caracteres.</small>
      <div class="heroActions"><button class="goldbtn">Salvar configurações</button><a class="outlinebtn" href="/operador">← Voltar para o operador</a></div>
    </form>
  </div></section>`;
  app.querySelector('#operatorLoginSettingsForm').onsubmit=async e=>{
    e.preventDefault();
    try{
      const r=await post('update-login-settings',Object.fromEntries(new FormData(e.target)));
      toast('Configurações de login atualizadas');
      me=(await api('me')).user; shell(); location.replace('/operador');
    }catch(x){toast(x.message)}
  };
}
function showProgressCelebration(previous,current){
  if(!previous||!current)return;
  const rankList=current.ranks||ranks;
  const oldRankIndex=rankList.indexOf(previous.rank||'');
  const newRankIndex=rankList.indexOf(current.rank||'');
  const rankUp=newRankIndex>oldRankIndex && oldRankIndex>=0;
  const oldElo=Number(previous.elo_level)||7;
  const newElo=Number(current.elo_level)||7;
  const eloUp=newElo<oldElo;
  if(!rankUp&&!eloUp)return;
  const parts=[];
  if(eloUp)parts.push(`<div class="celebrationStat">${eloMeta(newElo).symbol}<b>Elo ${newElo} · ${eloMeta(newElo).label}</b></div>`);
  if(rankUp)parts.push(`<div class="celebrationStat">${rankIcon(current.rank||'Recruta')}<b>Patente ${esc(current.rank||'')}</b></div>`);
  const overlay=document.createElement('div');
  overlay.className='progressCelebrationOverlay';
  overlay.innerHTML=`<div class="progressCelebrationCard" role="dialog" aria-modal="true" aria-label="Parabéns pela progressão"><div class="celebrationBurst">🎉</div><div class="eyebrow">PARABÉNS!</div><h2>Você evoluiu!</h2><p>Você alcançou uma nova posição na equipe.</p><div class="celebrationStats">${parts.join('')}</div><div class="celebrationGlow"></div><button type="button" class="goldbtn" data-close-celebration>Continuar</button></div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(()=>overlay.classList.add('show'));
  const close=()=>{overlay.classList.remove('show');setTimeout(()=>overlay.remove(),220)};
  overlay.querySelector('[data-close-celebration]')?.addEventListener('click',close);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  document.addEventListener('keydown',function escClose(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',escClose)}},{once:false});
  setTimeout(()=>close(),12000);
  // confetes leves, sem bloquear a interface
  for(let i=0;i<18;i++){
    const piece=document.createElement('span');piece.className='celebrationConfetti';piece.style.setProperty('--i',i);piece.style.setProperty('--x',`${(Math.random()*180-90).toFixed(1)}px`);piece.style.setProperty('--r',`${(Math.random()*360).toFixed(0)}deg`);overlay.querySelector('.progressCelebrationCard')?.appendChild(piece);
  }
}

function trackOperatorProgress(u,ranksList){
  try{
    const key=`tga-progress-${u.id}`;
    const previous=JSON.parse(localStorage.getItem(key)||'null');
    const current={rank:u.rank||'Recruta',elo_level:Number(u.elo_level)||7,ranks:ranksList||ranks};
    localStorage.setItem(key,JSON.stringify(current));
    if(previous) setTimeout(()=>showProgressCelebration(previous,current),300);
  }catch{}
}

async function operator(){
  const [profile,d]=await Promise.all([api('profile-data'),api('games')]); syncInstagramHeader(d.instagram_url); const u=profile.user; const finance=d.finance; trackOperatorProgress(u,d.ranks||ranks);
  app.innerHTML=`<section><div class="pageTitle"><div class="pageBrand">${photoOrInitial(u,true)}<div><div class="eyebrow">ÁREA DO OPERADOR</div><h1>${esc(u.nickname)}</h1>${u.name?`<div class="operatorRealName pageRealName">${esc(u.name)}</div>`:''}<p>Patente <b>${esc(u.rank)}</b> · ${u.absences||0} faltas${u.suspension_until?' · suspensão até '+fmt(u.suspension_until):''}${d.instagram_url?` · <a href="${esc(d.instagram_url)}" target="_blank" rel="noopener">Instagram</a>`:''}</p></div></div></div>
  ${operatorSubnav('visao')}
  <details class="card operatorEloHero operatorEloTop collapsibleCard" open>
    <summary><div><div class="eyebrow">PROGRESSÃO</div><h2>${rankIcon(u.rank||'Recruta')} Você está na patente ${esc(u.rank||'Recruta')} · ${eloBadge(u.elo_level)}</h2></div></summary>
    <div class="collapsibleBody">
      <div class="operatorEloStatus"><span>${Number(u.elo_level)===1?'💎 Próxima presença promove sua patente.':`Faltam ${Math.max(0,Number(u.elo_level)-1)} nível(is) para chegar ao Diamante.`}</span></div>
      <div class="operatorProgressSection"><div class="progressSectionHead"><h3>Patentes</h3><small>Conquistadas e próximas</small></div>
        <details class="rankAllDetails">
          <summary class="goldbtn rankAllSummary">Ver todas as patentes <span>⌄</span></summary>
          <div class="rankProgressLadder">${(d.ranks||['Recruta','Soldado','Cabo','3º Sargento','2º Sargento','1º Sargento','Subtenente','Aspirante','Tenente','Capitão','Major','Tenente-Coronel','Coronel']).map((r,i,arr)=>{const cur=arr.indexOf(u.rank||'Recruta');const state=i<cur?'done':i===cur?'current':'next';return `<div class="rankProgressItem ${state}"><span class="rankProgressIcon">${rankIcon(r)}</span><div><b>${esc(r)}</b><small>${state==='done'?'Conquistada':state==='current'?'Sua patente atual':'Próxima patente'}</small></div>${state==='current'?'<span class="rankCurrentTag">VOCÊ ESTÁ AQUI</span>':''}</div>`}).join('')}</div>
        </details>
      </div>
      <div class="operatorProgressSection"><div class="progressSectionHead"><h3>Elos</h3><small>Seu nível atual fica destacado</small></div>
        <div class="eloProgressLadder">${[7,6,5,4,3,2,1].map(level=>{const cur=Number(u.elo_level)||7;const state=level>cur?'done':level===cur?'current':'next';return `<div class="eloProgressItem ${state} ${eloMeta(level).tone}"><span class="eloSymbolBig">${eloMeta(level).symbol}</span><div><b>Elo ${level} · ${eloMeta(level).label}</b><small>${state==='done'?'Já alcançado':state==='current'?'Seu Elo atual':'Próximo nível'}</small></div>${state==='current'?'<span class="rankCurrentTag">ATUAL</span>':''}</div>`}).join('')}</div>
      </div>
      <div class="statsBox"><span><b>${u.games_count||0}</b> jogos</span><span><b>${u.absences||0}</b> faltas</span><span><b>${eloMeta(u.elo_level).symbol} ${eloMeta(u.elo_level).label}</b></span><span><b>${esc(u.elo_level||7)}</b>/7</span></div>
    </div>
  </details>
  <h2 class="sectionTitle">Próximos jogos</h2><div class="stack">${d.games.map(g=>`<article class="card game"><div><div class="date">${fmt(g.game_date)}${g.game_time?' · '+fmtTime(g.game_time):''}</div><h2>${esc(g.title)}</h2><p><b>Campo:</b> ${esc(g.field_name||g.location||'Não informado')} ${g.field_maps_url?`<a class="mini" href="${esc(g.field_maps_url)}" target="_blank" rel="noopener">Abrir Google Maps</a>`:''}</p><p><b>Status:</b> ${esc(g.status||'confirmado')} · <b>Mínimo:</b> ${esc(g.min_players||4)} operadores${g.max_players?` · <b>Máximo:</b> ${esc(g.max_players)}`:''}</p>${g.rsvp_deadline_date?`<p><b>Confirmar até:</b> ${fmt(g.rsvp_deadline_date)}${g.rsvp_deadline_time?' · '+fmtTime(g.rsvp_deadline_time):''}</p>`:''}${g.response==='pending'?'<div class="error">⚠️ Resposta obrigatória: marque Vou ou Não vou. Se não responder até o encerramento da lista, você perde Elo.</div>':''}<p>${esc(g.description||g.notes||'Jogo confirmado pelo comando.')}</p>${g.briefing?`<p><b>Briefing:</b> ${esc(g.briefing)}</p>`:''}${Array.isArray(g.participants)&&g.participants.length?`<div class="gameParticipantsBox"><h3>Quem vai ao jogo</h3><div class="gameParticipantsGrid">${g.participants.map(gameParticipantSummary).join('')}</div></div>`:`<div class="gameParticipantsBox"><h3>Operadores confirmados</h3><p class="muted">Nenhum operador confirmou presença ainda.</p></div>`}</div><div class="gameActions"><div class="choice"><button data-rsvp="going" data-id="${g.id}" class="${g.response==='going'?'selected':''}" ${g.status==='cancelado'||(g.rsvp_deadline_date&&new Date(`${g.rsvp_deadline_date}T${String(g.rsvp_deadline_time||'23:59:59').slice(0,8)}`)<=new Date())?'disabled':''}>✓ Vou</button><button data-rsvp="not_going" data-id="${g.id}" class="${g.response==='not_going'?'selected no':''}" ${g.status==='cancelado'?'disabled':''}>Não vou</button></div><div class="loadout"><b>LOADOUT DO JOGO</b><select data-role="${g.id}"><option value="">Função</option>${['Assault','Sniper','DMR','Suporte','Recon'].map(x=>`<option ${g.loadout?.funcao===x?'selected':''}>${x}</option>`).join('')}</select><input data-aeg-secondary="${g.id}" value="${esc(g.loadout?.aeg_secundaria||g.loadout?.replica||'')}" placeholder="AEG secundária"><div class="extraEquipmentWrap" data-extra-wrap="${g.id}"><div class="extraEquipmentHead"><span>Equipamentos adicionais</span><button type="button" class="mini addExtraEquipment" data-extra-add="${g.id}">+</button></div><div class="extraEquipmentList" data-extra-list="${g.id}">${(Array.isArray(g.loadout?.equipamentos_extras)?g.loadout.equipamentos_extras:[]).map((x,i)=>`<div class="extraEquipmentRow"><input data-extra-input="${g.id}" value="${esc(x)}" placeholder="Equipamento ${i+1}"><button type="button" class="mini danger removeExtraEquipment">×</button></div>`).join('')}</div></div><input data-note="${g.id}" value="${esc(g.loadout?.observacoes||'')}" placeholder="Observações"><button class="goldbtn small" data-save="${g.id}">Salvar loadout</button></div></div></article>`).join('')||'<div class="muted">Nenhum jogo próximo.</div>'}</div>
  <div class="card operatorFinance ${finance?.status==='paid'||finance?.status==='waived'?'financeOk':'financePending'}"><div><div class="eyebrow">FINANCEIRO</div><h2>${finance?.status==='paid'?'Mensalidade em dia':finance?.status==='waived'?'Mensalidade isenta':finance?.status==='overdue'?'Mensalidade atrasada':'Mensalidade pendente'}</h2><p>${finance?`Valor: ${Number(finance.amount||0).toLocaleString('pt-BR',{style:'currency',currency:finance.currency||'BRL'})} · Vencimento ${fmt(finance.due_date)}`:'Nenhuma mensalidade configurada.'}</p>${finance&&finance.status!=='paid'&&finance.status!=='waived'&&d.financeSettings?.pix_key?`<div class="pixBox"><b>Pagamento via PIX</b><div>Chave: <strong>${esc(d.financeSettings.pix_key)}</strong></div>${d.financeSettings.pix_holder?`<small>Titular: ${esc(d.financeSettings.pix_holder)}</small>`:''}<button type="button" class="mini" id="copyPix">Copiar PIX</button></div>`:''}</div><span class="tag">${finance?.status||'sem cobrança'}</span></div>
  <div class="operatorDashboard"><div class="card formCard"><div class="profileEditHead"><h2>Meu perfil</h2><span class="tag">Você edita</span></div><div class="uploadRow">${photoOrInitial(u,true)}<div><input id="photoInput" type="file" accept="image/*"><small>Até 3 MB. Use uma foto quadrada ou retrato de boa qualidade.</small></div></div><div class="formGrid"><input id="pfName" value="${esc(u.name||'')}" placeholder="Nome"><input id="pfEmail" value="${esc(u.email||'')}" placeholder="E-mail"><input id="pfBirth" value="${esc(u.birth_date||'')}" type="date" placeholder="Data de nascimento"><input id="pfAge" value="${esc(u.age||'')}" type="number" min="0" max="100" placeholder="Idade"><select id="pfBlood"><option value="">Tipo sanguíneo</option>${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(x=>`<option ${u.blood_type===x?'selected':''}>${x}</option>`).join('')}</select><input id="pfYears" value="${esc(u.airsoft_years||'')}" type="number" min="0" max="80" step="0.5" placeholder="Anos de airsoft"><input id="pfStyle" value="${esc(u.play_style||'')}" placeholder="Estilo: Assault, Sniper, DMR..."><input id="pfPrimary" value="${esc(u.primary_replica||'')}" placeholder="Réplica principal"><input id="pfSecondary" value="${esc(u.secondary_replica||'')}" placeholder="Réplica secundária"><input id="pfFunction" value="${esc(u.function||'')}" placeholder="Função"><label class="checkline"><input id="pfPublic" type="checkbox" ${u.public_profile!==false?'checked':''}> Mostrar perfil para visitantes</label></div><textarea id="pfBio" placeholder="Descrição do operador">${esc(u.bio||'')}</textarea><textarea id="pfEquip" placeholder="Resumo de equipamentos">${esc(u.equipment_summary||'')}</textarea><button id="saveProfile" class="goldbtn">Salvar perfil</button></div>
  <div class="operatorGrid"><div class="card"><h2>Equipamentos detalhados</h2><form id="equipForm" class="inlineForm"><select name="category"><option>AEG</option><option>Secundária</option><option>Proteção</option><option>Rádio</option><option>Óptica</option><option>Vestimenta</option><option>Acessório</option></select><input name="name" placeholder="Ex.: Neptune 10" required><input name="details" placeholder="Detalhes"><input id="equipmentPhoto" name="photo_file" type="file" accept="image/*"><small class="uploadHelp">Até 5 MB. A foto será comprimida automaticamente antes do envio.</small><button class="mini">Adicionar</button></form><div class="chipsList">${profile.equipment.map(e=>`<div class="chipRow equipmentRow">${e.photo_url?`<img class="equipmentThumb" src="${e.photo_url}" alt="${esc(e.name)}">`:''}<span><b>${esc(e.category)}</b> · ${esc(e.name)}${e.details?' — '+esc(e.details):''}</span><button class="mini danger" data-del-equip="${e.id}">×</button></div>`).join('')||'<div class="muted">Nenhum equipamento detalhado.</div>'}</div></div><div class="card"><h2>Galeria de loadout</h2><div class="uploadGallery"><input id="galleryInput" type="file" accept="image/*"><input id="galleryCaption" placeholder="Legenda da foto"><button id="addGallery" class="mini">Adicionar foto</button></div><div class="gallery">${profile.gallery.map(g=>`<div class="galleryItem"><img loading="lazy" decoding="async" src="${g.image_data}" alt="${esc(g.caption||'Foto')}"><div><small>${esc(g.caption||'')}</small><button class="mini danger" data-del-gallery="${g.id}">Excluir</button></div></div>`).join('')||'<div class="muted">Nenhuma foto cadastrada.</div>'}</div></div></div>
  <div class="card"><div class="sectionHead compact"><div><div class="eyebrow">NOTIFICAÇÕES</div><h2>Novidades do comando</h2></div><button class="mini" id="enablePush">Ativar notificações</button></div><div id="operatorNotifications" class="notifInline">Carregando...</div></div></div></section>`;
  // Operador: a lista de participantes é somente informativa.
  app.querySelectorAll('.gameParticipantAdmin').forEach(el=>el.remove());
  document.getElementById('mobileShowProgress')?.addEventListener('click',()=>{const d=document.querySelector('.operatorEloTop');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'});}});
  const fileToDataURL=file=>new Promise((resolve,reject)=>{if(!file)return reject(new Error('Arquivo não selecionado.'));if(file.size>3_000_000)return reject(new Error('Use uma imagem de até 3 MB.'));const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
  const fileToEquipmentDataURL=async file=>{if(!file)throw new Error('Selecione a foto do equipamento.');if(file.size>5_000_000)throw new Error('A foto do equipamento pode ter no máximo 5 MB.');if(!file.type.startsWith('image/'))throw new Error('Selecione uma imagem válida.');const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));i.src=src});let maxSide=2200;let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;const scale=Math.min(1,maxSide/Math.max(w,h));w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));for(let attempt=0;attempt<6;attempt++){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{alpha:false});ctx.drawImage(img,0,0,w,h);const quality=[0.85,0.75,0.65,0.58,0.52,0.45][attempt];const data=c.toDataURL('image/jpeg',quality);if(data.length<=4_000_000)return data;maxSide=Math.max(900,Math.round(maxSide*0.82));const sc=Math.min(1,maxSide/Math.max(w,h));w=Math.max(1,Math.round((img.naturalWidth||img.width)*sc));h=Math.max(1,Math.round((img.naturalHeight||img.height)*sc))}throw new Error('Não foi possível reduzir a foto para o tamanho aceito pelo servidor.');};
  document.getElementById('saveProfile').onclick=async()=>{try{await post('update-profile',{name:document.getElementById('pfName').value,email:document.getElementById('pfEmail').value,birth_date:document.getElementById('pfBirth').value,age:document.getElementById('pfAge').value,blood_type:document.getElementById('pfBlood').value,airsoft_years:document.getElementById('pfYears').value,play_style:document.getElementById('pfStyle').value,primary_replica:document.getElementById('pfPrimary').value,secondary_replica:document.getElementById('pfSecondary').value,function:document.getElementById('pfFunction').value,bio:document.getElementById('pfBio').value,equipment_summary:document.getElementById('pfEquip').value,public_profile:document.getElementById('pfPublic').checked});toast('Perfil atualizado');location.reload()}catch(e){toast(e.message)}};
  document.getElementById('photoInput').onchange=async e=>{try{const data=await fileToDataURL(e.target.files[0]);await post('upload-photo',{image_data:data});toast('Foto de perfil atualizada');location.reload()}catch(x){toast(x.message)}};
  document.getElementById('addGallery').onclick=async()=>{try{const file=document.getElementById('galleryInput').files[0];const data=await fileToDataURL(file);await post('add-gallery',{image_data:data,caption:document.getElementById('galleryCaption').value});toast('Foto adicionada');location.reload()}catch(x){toast(x.message)}};
  app.querySelectorAll('[data-del-gallery]').forEach(b=>b.onclick=async()=>{await post('delete-gallery',{id:b.dataset.delGallery});location.reload()});app.querySelectorAll('[data-del-equip]').forEach(b=>b.onclick=async()=>{await post('delete-equipment',{id:b.dataset.delEquip});location.reload()});
  app.querySelector('#equipForm').onsubmit=async e=>{e.preventDefault();try{const fd=new FormData(e.target);const payload=Object.fromEntries(fd);const file=document.getElementById('equipmentPhoto')?.files?.[0];if(file)payload.photo_url=await fileToEquipmentDataURL(file);delete payload.photo_file;await post('equipment',payload);e.target.reset();location.reload()}catch(x){toast(x.message)}};
  app.querySelectorAll('[data-rsvp]').forEach(b=>b.onclick=async()=>{try{await post('rsvp',{game_id:b.dataset.id,response:b.dataset.rsvp});toast(b.dataset.rsvp==='going'?'Marcado como Vou':'Marcado como Não vou');operator()}catch(e){toast(e.message)}});
  document.getElementById('enablePush')?.addEventListener('click',pushSetup);document.getElementById('copyPix')?.addEventListener('click',async()=>{await navigator.clipboard?.writeText(d.financeSettings?.pix_key||'');toast('Chave PIX copiada')});loadNotifications('operatorNotifications');
  app.querySelectorAll('[data-extra-add]').forEach(btn=>btn.onclick=()=>{const id=btn.dataset.extraAdd;const list=app.querySelector(`[data-extra-list="${id}"]`);const row=document.createElement('div');row.className='extraEquipmentRow';row.innerHTML=`<input data-extra-input="${id}" placeholder="Equipamento ${list.children.length+1}"><button type="button" class="mini danger removeExtraEquipment">×</button>`;list.appendChild(row);});
  app.querySelectorAll('.removeExtraEquipment').forEach(btn=>btn.onclick=()=>btn.parentElement.remove());
  app.querySelectorAll('[data-save]').forEach(b=>b.onclick=async()=>{const id=b.dataset.save;try{const extras=[...app.querySelectorAll(`[data-extra-input="${id}"]`)].map(i=>i.value.trim()).filter(Boolean);await post('loadout',{game_id:id,loadout:{funcao:app.querySelector(`[data-role="${id}"]`).value,aeg_secundaria:app.querySelector(`[data-aeg-secondary="${id}"]`).value,replica:app.querySelector(`[data-aeg-secondary="${id}"]`).value,equipamentos_extras:extras,observacoes:app.querySelector(`[data-note="${id}"]`).value}});toast('Loadout salvo')}catch(e){toast(e.message)}})
}

async function financePanel(d){
  const settings=d.financeSettings||{monthly_fee:0,due_day:10,grace_days:0,currency:'BRL',active:true,pix_key:'',pix_holder:''};
  const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:settings.currency||'BRL'});
  const current=(d.dues||[]);
  const financePeriod=new URLSearchParams(location.search).get('period')==='weekly'?'weekly':'monthly'; const ledger=await api('finance-ledger&period='+financePeriod);
  const cash=Number(ledger.summary?.total_income||0)-Number(ledger.summary?.total_expense||0);
  return `<section id="finance" class="financeSection"><div class="sectionHead compact"><div><div class="eyebrow">FINANCEIRO</div><h2>Caixa da equipe</h2><p class="muted">Controle mensalidades, receitas, despesas e saldo em caixa.</p></div></div>
  <div class="financeStats"><div><b>${money(cash)}</b><span>Valor em caixa</span></div><div><b>${money(ledger.summary?.total_income)}</b><span>Receitas</span></div><div><b>${money(ledger.summary?.total_expense)}</b><span>Despesas</span></div><div><b>${current.filter(x=>x.status==='pending'||x.status==='overdue').length}</b><span>Mensalidades pendentes</span></div></div>
  <form id="financeSettingsForm" class="card financeSettings"><div class="cardKicker">MENSALIDADE E PIX</div><h2>Configurações</h2><div class="formGrid"><input name="monthly_fee" type="number" step="0.01" min="0" value="${esc(settings.monthly_fee)}" placeholder="Valor mensal"><input name="due_day" type="number" min="1" max="28" value="${esc(settings.due_day)}" placeholder="Dia do vencimento"><input name="grace_days" type="number" min="0" max="30" value="${esc(settings.grace_days)}" placeholder="Dias de tolerância"><input name="pix_key" value="${esc(settings.pix_key||'')}" placeholder="Chave PIX do comandante"><input name="pix_holder" value="${esc(settings.pix_holder||'')}" placeholder="Titular da conta PIX"><select name="currency"><option value="BRL" ${settings.currency==='BRL'?'selected':''}>BRL · Real</option><option value="USD" ${settings.currency==='USD'?'selected':''}>USD · Dólar</option></select></div><label class="checkline"><input name="active" type="checkbox" ${settings.active?'checked':''}> Exigir mensalidade para participação nos jogos</label><div class="heroActions"><button class="goldbtn">Salvar configurações</button><button type="button" id="generateDues" class="outlinebtn">Gerar mensalidades do mês</button></div></form>
  <div class="card"><div class="sectionHead compact"><div><div class="eyebrow">LANÇAMENTOS</div><h2>Receitas e despesas</h2></div><div class="heroActions"><button type="button" class="mini ${ledger.period==='monthly'?'selected':''}" data-ledger="monthly">Mensal</button><button type="button" class="mini ${ledger.period==='weekly'?'selected':''}" data-ledger="weekly">Semanal</button></div></div><form id="financeTransactionForm" class="formGrid financeTransactionForm"><select name="type"><option value="income">Receita</option><option value="expense">Despesa</option></select><input name="description" placeholder="Descrição (ex.: compra de BBs)" required><input name="amount" type="number" step="0.01" min="0.01" placeholder="Valor" required><input name="transaction_date" type="date"><input name="category" placeholder="Categoria"><input name="note" placeholder="Observação"><button class="goldbtn">Lançar</button></form><div class="table">${(ledger.transactions||[]).map(x=>`<div class="row financeRow"><div><b>${x.type==='income'?'Receita':'Despesa'} · ${esc(x.description)}</b><small>${fmt(x.transaction_date)}${x.category?' · '+esc(x.category):''}</small></div><span class="tag ${x.type==='income'?'paid':'pending'}">${money(x.amount)}</span><button class="mini danger" data-delete-tx="${x.id}">Excluir</button></div>`).join('')||'<p class="muted">Nenhum lançamento no período.</p>'}</div></div>
  <div class="card"><div class="cardKicker">MENSALIDADES</div><div class="table">${current.map(x=>`<div class="row financeRow"><div><b>@${esc(x.nickname)}</b><small>${esc(x.rank||'Operador')} · Vencimento ${fmt(x.due_date)}</small></div><span class="tag ${x.status==='paid'||x.status==='waived'?'paid':'pending'}">${x.status==='paid'?'PAGO':x.status==='waived'?'ISENTO':x.status==='overdue'?'ATRASADO':'PENDENTE'}</span><span>${money(x.amount)}</span><div class="financeActions"><button class="mini" data-pay="${x.operator_id}" data-period="${x.period}" data-amount="${x.amount}">Marcar pago</button><button class="mini danger" data-waive="${x.operator_id}" data-period="${x.period}" data-amount="${x.amount}">Isentar</button></div></div>`).join('')||'<p class="muted">Nenhuma mensalidade gerada.</p>'}</div></div></section>`;
}
async function commanderData(){const d=await api('commander');syncInstagramHeader(d.instagram_url);return d}
function commandSubnav(active){const items=[['equipe','Equipe'],['jogos','Jogos'],['patentes-elos','Patentes e Elos'],['historico','Histórico de jogos'],['financeiro','Financeiro'],['visitas','Visitas'],['configuracoes','Configurações']];return `<div class="commandNav">${items.map(([id,label])=>`<a class="${active===id?'active':''}" href="/comandante/${id}">${label}</a>`).join('')}</div>`}
function commandHeader(title,sub){return `<div class="pageTitle"><div class="pageBrand"><img src="/logo.webp" alt="Tactical Group Airsoft"><div><div class="eyebrow">COMANDO TGA</div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div></div></div>`}
function commanderOverview(d){return `<section>${commandHeader('Painel do Comandante','Operações, equipe, presença, financeiro e disciplina.')}${commandSubnav('equipe')}<div class="commandStats"><a class="card statLink" href="/comandante/jogos"><b>${d.games.length}</b><span>Jogos programados</span></a><a class="card statLink" href="/comandante/equipe"><b>${d.operators.filter(x=>x.role==='operator'&&x.active).length}</b><span>Operadores ativos</span></a><a class="card statLink" href="/comandante/financeiro"><b>${d.dues.filter(x=>x.status==='pending'||x.status==='overdue').length}</b><span>Financeiro pendente</span></a><a class="card statLink" href="/comandante/visitas"><b>${d.requests.filter(x=>x.status==='pending').length}</b><span>Visitas pendentes</span></a></div><div class="card"><div class="cardKicker">ACESSOS RÁPIDOS</div><div class="quickGrid"><a class="goldbtn" href="/comandante/jogos">Gerenciar jogos</a><a class="outlinebtn" href="/comandante/equipe">Gerenciar equipe</a><a class="outlinebtn" href="/comandante/financeiro">Financeiro</a><a class="outlinebtn" href="/comandante/configuracoes">Configurações</a></div></div></section>`}
function renderGamesPage(){
  return `<section class="commanderGamesV6Page"><div id="commanderGamesV6Host"><div class="cmdGamesV6Loading">CARREGANDO OPERAÇÕES...</div></div></section>`
}

function renderRanksPage(d){
  const ranks=d.ranks||['Recruta','Soldado','Cabo','3º Sargento','2º Sargento','1º Sargento','Subtenente','Aspirante','Tenente','Capitão','Major','Tenente-Coronel','Coronel'];
  const activeOps=d.operators.filter(o=>o.active);
  return `<section>${commandHeader('Patentes e Elos','Controle patente, Elo e decisões disciplinares dos operadores.')}${commandSubnav('patentes-elos')}
    <div class="card formCard">
      <div class="cardKicker">DISCIPLINA</div><h2>Registrar falta</h2>
      <p class="muted">Selecione um ou mais operadores, escolha o tipo de falta e aplique. O Elo será reduzido conforme as regras do comando.</p>
      <form id="disciplineBulkForm" class="formGrid">
        <label>Tipo de falta<select name="type"><option value="absence">Falta no jogo</option><option value="highlander">Highlander</option><option value="misconduct">Conduta</option></select></label>
        <label>Motivo<input name="reason" placeholder="Motivo / observação"></label>
        <label class="fullSpan">Selecionar operadores<select name="operator_ids" multiple size="6">${activeOps.map(o=>`<option value="${o.id}">@${esc(o.nickname)} · ${esc(o.rank)} · ${eloBadge(o.elo_level)}</option>`).join('')}</select></label>
        <button class="goldbtn" type="submit">Aplicar falta</button>
      </form>
    </div>
    <details class="card collapsibleCard" open><summary><div><div class="sectionHead compact"><div><div class="eyebrow">EQUIPE</div><h2>Todos os operadores</h2></div></div></div></summary><div class="collapsibleBody"><div class="rankProfileGrid">${activeOps.map(o=>`<article class="rankProfileCard">${photoOrInitial(o,true)}<div class="rankProfileMain"><a class="profileLink" href="/visitantes?operator=${o.id}&from=commander"><b>@${esc(o.nickname)}</b></a>${o.name?`<div class="operatorRealName">${esc(o.name)}</div>`:''}<div class="rankLine"><span>${esc(o.rank)}</span>${eloBadge(o.elo_level)}</div><small>${esc(o.function||'Operador')} · ${o.games_count||0} jogo(s) · ${o.absences||0} falta(s)</small><div class="rankActions"><select data-rank="${o.id}" aria-label="Patente de @${esc(o.nickname)}">${ranks.map(r=>`<option ${o.rank===r?'selected':''}>${r}</option>`).join('')}</select><select data-elo-level="${o.id}" aria-label="Elo de @${esc(o.nickname)}">${[7,6,5,4,3,2,1].map(n=>`<option value="${n}" ${Number(o.elo_level)===n?'selected':''}>Elo ${n} · ${eloMeta(n).label}</option>`).join('')}</select><a class="mini" href="/visitantes?operator=${o.id}&from=commander">Ver perfil</a></div><div class="rankPenaltyBox"><label>Falta / disciplina<select data-discipline-type="${o.id}" aria-label="Tipo de falta de @${esc(o.nickname)}"><option value="absence">Falta no jogo</option><option value="highlander">Highlander</option><option value="misconduct">Conduta</option></select></label><button type="button" class="mini danger" data-apply-penalty="${o.id}">Aplicar falta</button></div></div></article>`).join('')}</div></div></details>
  </section>`
}
function renderTeamPage(d){
  const all=Array.isArray(d.operators)?d.operators:[];
  const commanders=all.filter(o=>o.role==='commander'&&o.active);
  const operators=all.filter(o=>o.role!=='commander'&&o.active);
  const invites=all.filter(o=>!o.active);
  const ranksList=d.ranks||ranks;
  const statusLabel=o=>o.role==='commander'?(o.is_primary_commander?'COMANDANTE PRINCIPAL':'COMANDO'):'ATIVO';
  const personCard=o=>{
    const isCommander=o.role==='commander';
    const elo=eloMeta(o.elo_level);
    return `<article class="cmdRosterCard ${isCommander?'commander':'operator'}">
      <div class="cmdRosterTop">
        <div class="cmdRosterIdentity">
          <div class="cmdRosterRankMark"><span>${rankIcon(o.rank||'Recruta')}</span><small>${esc(String(o.rank||'REC').slice(0,3).toUpperCase())}</small></div>
          ${photoOrInitial(o)}
          <div class="cmdRosterName">
            <div><b>@${esc(o.nickname)}</b><span class="cmdRosterStatus ${isCommander?'command':'active'}">${statusLabel(o)}</span></div>
            ${o.name?`<small>${esc(o.name)}</small>`:''}
            <strong>${esc(o.rank||'Recruta')}</strong>
          </div>
        </div>
        <a class="cmdRosterProfile" href="/visitantes?operator=${o.id}&from=commander">VER PERFIL</a>
      </div>
      <p class="cmdRosterBio">${esc(o.bio||o.function|| (isCommander?'Gestão e comando da equipe.':'Operador do Tactical Group Airsoft.'))}</p>
      <div class="cmdRosterStats">
        <span><small>FUNÇÃO</small><b>${esc(o.function|| (isCommander?'Comando':'Operador'))}</b></span>
        <span><small>JOGOS</small><b>${Number(o.games_count||0)}</b></span>
        <span><small>FALTAS</small><b>${Number(o.absences||0)}</b></span>
        <span><small>ELO</small><b>${elo.symbol} ${elo.label}</b></span>
      </div>
      <div class="cmdRosterControls">
        <label><small>PATENTE</small><select data-rank="${o.id}">${ranksList.map(r=>`<option ${o.rank===r?'selected':''}>${r}</option>`).join('')}</select></label>
        <div class="cmdRosterActions">
          ${o.role==='operator'
            ?`<button class="mini" data-promote="${o.id}">Tornar comandante</button><button class="mini" data-penalty="${o.id}">Suspender 3 dias</button><button class="mini danger" data-deleteop="${o.id}">Excluir</button>`
            :(o.is_primary_commander?'<span class="cmdRosterPrimary">COMANDO PRINCIPAL</span>':`<button class="mini danger" data-demote="${o.id}">Remover comando</button>`)}
        </div>
      </div>
    </article>`;
  };
  return `<section class="commanderRosterV2">
    ${commandHeader('Operadores','Gerencie comandantes, operadores, patentes, acessos e disciplina.')}
    ${commandSubnav('equipe')}
    <div class="cmdRosterHero">
      <div><div class="cardKicker">GESTÃO DO EFETIVO</div><h2>QUADRO TÁTICO DA EQUIPE</h2><p>Comando e operadores no mesmo padrão visual, com patente, função, histórico e ações administrativas.</p></div>
      <div class="cmdRosterCounters"><span><b>${commanders.length}</b><small>COMANDANTES</small></span><span><b>${operators.length}</b><small>OPERADORES</small></span><span><b>${all.filter(o=>o.active).length}</b><small>ATIVOS</small></span></div>
    </div>
    <div class="cmdRosterTools">
      <form id="inviteForm" class="cmdRosterInvite">
        <div><small>NOVO OPERADOR</small><b>GERAR CONVITE DE ACESSO</b></div>
        <input name="nickname" placeholder="Apelido do operador" required>
        <button class="goldbtn">GERAR CÓDIGO</button>
        <div id="inviteResult"></div>
      </form>
      <a class="cmdRosterProgress" href="/comandante/patentes-elos"><span>◆</span><div><small>PROGRESSÃO & DISCIPLINA</small><b>PATENTES E ELOS</b></div><em>ABRIR →</em></a>
    </div>
    <section class="cmdRosterSection">
      <div class="cmdRosterSectionHead"><div><span>COMANDO</span><h3>COMANDANTES</h3></div><b>${commanders.length}</b></div>
      <div class="cmdRosterGrid">${commanders.map(personCard).join('')||'<p class="muted">Nenhum comandante cadastrado.</p>'}</div>
    </section>
    <section class="cmdRosterSection">
      <div class="cmdRosterSectionHead"><div><span>EFETIVO OPERACIONAL</span><h3>OPERADORES</h3></div><b>${operators.length}</b></div>
      <div class="cmdRosterGrid">${operators.map(personCard).join('')||'<p class="muted">Nenhum operador ativo.</p>'}</div>
    </section>
    ${invites.length?`<section class="cmdRosterSection invites"><div class="cmdRosterSectionHead"><div><span>ACESSO</span><h3>CONVITES PENDENTES</h3></div><b>${invites.length}</b></div><div class="cmdRosterInviteList">${invites.map(o=>`<div><span><b>@${esc(o.nickname)}</b><small>${o.invite_expires_at?'Expira '+fmt(o.invite_expires_at):'Convite expirado'}</small></span><button class="mini danger" data-revoke="${o.id}">Excluir convite</button></div>`).join('')}</div></section>`:''}
  </section>`;
}

async function compressMatchPhoto(file){
  if(!file) return '';
  if(file.size>5_000_000) throw new Error('A foto da partida pode ter no máximo 5 MB.');
  const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src});
  let maxSide=2400,w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
  for(let attempt=0;attempt<6;attempt++){
    const scale=Math.min(1,maxSide/Math.max(w,h)); const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(w*scale)); c.height=Math.max(1,Math.round(h*scale)); c.getContext('2d',{alpha:false}).drawImage(img,0,0,c.width,c.height);
    const data=c.toDataURL('image/jpeg',[0.84,0.75,0.66,0.58,0.50,0.43][attempt]); if(data.length<=4_100_000) return data; maxSide=Math.max(1000,Math.round(maxSide*0.8));
  }
  throw new Error('Não foi possível reduzir a foto para o tamanho aceito.');
}

async function ensureCommanderFinanceAnnual(){
  if(typeof window.__renderCommanderFinanceAnnual==='function')return window.__renderCommanderFinanceAnnual;
  await new Promise((resolve,reject)=>{
    const found=document.querySelector('script[data-commander-finance-annual]');
    if(found){found.addEventListener('load',resolve,{once:true});found.addEventListener('error',reject,{once:true});return}
    const s=document.createElement('script');s.src='/commander-finance-v1.js?v=2';s.async=false;s.dataset.commanderFinanceAnnual='1';s.onload=resolve;s.onerror=()=>reject(new Error('Não foi possível carregar o financeiro anual.'));document.body.appendChild(s);
  });
  if(typeof window.__renderCommanderFinanceAnnual!=='function')throw new Error('Financeiro anual não iniciou.');
  return window.__renderCommanderFinanceAnnual;
}
async function commanderPage(page='equipe'){
  if(page==='financeiro'){
    const renderAnnual=await ensureCommanderFinanceAnnual();
    app.innerHTML=await renderAnnual();
    document.getElementById('routeLoading')?.classList.remove('show');
    return;
  }
  if(page==='jogos'){
    app.innerHTML=renderGamesPage();
    document.getElementById('routeLoading')?.classList.remove('show');
    window.dispatchEvent(new Event('tga:commander-games-ready'));
    return;
  }
  const d=await commanderData();
  app.innerHTML=page==='patentes-elos'?renderRanksPage(d):page==='historico'?renderHistoryPage(d):page==='visitas'?renderVisitsPage(d):page==='configuracoes'?renderSettingsPage(d):renderTeamPage(d);
  bindCommander(page,d)
}

function closeGameModal(){document.getElementById('gameEditModal')?.remove()}
function openGameEditModal(g,d,page){
  const fields=(d.fields||[]).map(f=>`<option value="${f.id}" ${String(f.id)===String(g.field_id)?'selected':''}>${esc(f.name)}</option>`).join('')
  const modal=document.createElement('div');modal.id='gameEditModal';modal.className='modal';modal.innerHTML=`<div class="modalBox gameEditModalBox"><button class="x" type="button" id="closeGameModal">×</button><div class="cardKicker">EDITAR JOGO</div><h2>${esc(g.title)}</h2><p>Edite todas as informações da operação e salve pelo botão <b>Atualizar jogo</b>.</p><form id="gameEditForm" class="formGrid"><input type="hidden" name="game_id" value="${g.id}"><label>Nome do jogo<input name="title" required value="${esc(g.title||'')}"></label><label>Data<input type="date" name="game_date" required value="${esc(g.game_date||'')}"></label><label>Horário<input type="time" name="game_time" value="${esc((g.game_time||'').slice(0,5))}"></label><label>Campo<select name="field_id" required>${fields}</select></label><label>Mínimo de operadores<input type="number" min="1" name="min_players" value="${esc(g.min_players||4)}"></label><label>Máximo de operadores<input type="number" min="1" name="max_players" value="${esc(g.max_players||'')}"></label><label>Elo por participação<input type="number" min="1" name="elo_reward" value="${esc(g.elo_reward||1)}"></label><label>Prazo da lista - data<input type="date" name="rsvp_deadline_date" value="${esc(g.rsvp_deadline_date||'')}"></label><label>Prazo da lista - hora<input type="time" name="rsvp_deadline_time" value="${esc((g.rsvp_deadline_time||'').slice(0,5))}"></label><label>Status<select name="status"><option value="confirmado" ${g.status==='confirmado'?'selected':''}>Confirmado</option><option value="preparação" ${g.status==='preparação'?'selected':''}>Em preparação</option><option value="cancelado" ${g.status==='cancelado'?'selected':''}>Cancelado</option></select></label><label class="fullSpan">Resumo<textarea name="description">${esc(g.description||'')}</textarea></label><label class="fullSpan">Briefing<textarea name="briefing">${esc(g.briefing||'')}</textarea></label><label class="fullSpan">Observações do comando<textarea name="notes">${esc(g.notes||'')}</textarea></label><div class="modalActions fullSpan"><button type="submit" class="goldbtn">Atualizar jogo</button><button type="button" class="mini" id="modalCloseRsvp" ${g.rsvp_closed?'disabled':''}>${g.rsvp_closed?'Lista já encerrada':'Encerrar lista agora'}</button><button type="button" class="mini danger" id="modalDeleteGame">Excluir jogo</button></div></form></div>`;
  document.body.appendChild(modal);
  modal.querySelector('#closeGameModal').onclick=closeGameModal;
  modal.onclick=e=>{if(e.target===modal)closeGameModal()}
  modal.querySelector('#gameEditForm').onsubmit=async e=>{e.preventDefault();try{await post('edit-game',Object.fromEntries(new FormData(e.target)));toast('Jogo atualizado');closeGameModal();commanderPage(page)}catch(x){toast(x.message)}};
  modal.querySelector('#modalCloseRsvp').onclick=async()=>{if(g.rsvp_closed)return;if(!confirm('Encerrar a lista? Quem estiver como Vou não poderá mais retirar a presença. Quem não respondeu perderá Elo.'))return;try{const r=await post('close-rsvp',{game_id:g.id});toast(`Lista encerrada. ${r.penalized||0} operador(es) penalizado(s)`);closeGameModal();commanderPage(page)}catch(x){toast(x.message)}};
  modal.querySelector('#modalDeleteGame').onclick=async()=>{if(!confirm('Excluir este jogo e todas as respostas?'))return;try{await post('delete-game',{game_id:g.id});toast('Jogo excluído');closeGameModal();commanderPage('jogos')}catch(x){toast(x.message)}};
}

function bindCommander(page,d){app.querySelector('#gameForm')?.addEventListener('submit',async e=>{e.preventDefault();try{await post('create-game',Object.fromEntries(new FormData(e.target)));toast('Jogo criado');commanderPage('jogos')}catch(x){toast(x.message)}});app.querySelector('#financeSettingsForm')?.addEventListener('submit',async e=>{e.preventDefault();try{const payload=Object.fromEntries(new FormData(e.target));payload.active=e.target.elements.active.checked;await post('finance-settings',payload);toast('Financeiro atualizado');commanderPage('financeiro')}catch(x){toast(x.message)}});app.querySelector('#generateDues')?.addEventListener('click',async()=>{try{await post('finance-generate',{});toast('Mensalidades geradas');commanderPage('financeiro')}catch(x){toast(x.message)}});app.querySelector('#financeTransactionForm')?.addEventListener('submit',async e=>{e.preventDefault();try{await post('finance-transaction',Object.fromEntries(new FormData(e.target)));toast('Lançamento salvo');commanderPage('financeiro')}catch(x){toast(x.message)}});app.querySelectorAll('[data-ledger]').forEach(b=>b.onclick=()=>{history.replaceState({},'',`/comandante/financeiro?period=${b.dataset.ledger}`);commanderPage('financeiro')});app.querySelectorAll('[data-delete-tx]').forEach(b=>b.onclick=async()=>{if(!confirm('Excluir este lançamento?'))return;try{await post('finance-delete-transaction',{id:b.dataset.deleteTx});toast('Lançamento excluído');commanderPage('financeiro')}catch(x){toast(x.message)}});app.querySelectorAll('[data-pay]').forEach(b=>b.onclick=async()=>{try{await post('finance-payment',{operator_id:b.dataset.pay,period:b.dataset.period,amount:b.dataset.amount,status:'paid'});toast('Pagamento registrado');commanderPage('financeiro')}catch(x){toast(x.message)}});app.querySelectorAll('[data-waive]').forEach(b=>b.onclick=async()=>{try{await post('finance-payment',{operator_id:b.dataset.waive,period:b.dataset.period,amount:b.dataset.amount,status:'waived'});toast('Mensalidade isentada');commanderPage('financeiro')}catch(x){toast(x.message)}});
app.querySelector('#instagramForm')?.addEventListener('submit',async e=>{e.preventDefault();try{await post('site-settings',Object.fromEntries(new FormData(e.target)));toast('Instagram salvo');commanderPage(page)}catch(x){toast(x.message)}});app.querySelector('#loginSettingsForm')?.addEventListener('submit',async e=>{e.preventDefault();try{await post('update-login-settings',Object.fromEntries(new FormData(e.target)));toast('Configurações de login atualizadas');const d2=await api('me');me=d2.user;shell();commanderPage(page)}catch(x){toast(x.message)}});app.querySelector('#fieldForm')?.addEventListener('submit',async e=>{e.preventDefault();try{await post('create-field',Object.fromEntries(new FormData(e.target)));toast('Campo criado');commanderPage('configuracoes')}catch(x){toast(x.message)}});app.querySelector('#inviteForm')?.addEventListener('submit',async e=>{e.preventDefault();try{const r=await post('create-invite',Object.fromEntries(new FormData(e.target)));document.getElementById('inviteResult').innerHTML=`<div class="inviteResult"><span>Código gerado</span><strong>${esc(r.code)}</strong><button type="button" id="copyInvite" class="mini">Copiar</button></div>`;document.getElementById('copyInvite').onclick=async()=>{await navigator.clipboard?.writeText(r.code);toast('Código copiado')};e.target.reset()}catch(x){toast(x.message)}});app.querySelector('#disciplineBulkForm')?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.target);const ids=[...e.target.elements.operator_ids.selectedOptions].map(o=>o.value);if(!ids.length){toast('Selecione pelo menos um operador.');return}const type=fd.get('type');const reason=String(fd.get('reason')||'Decisão disciplinar do comando');try{for(const operator_id of ids) await post('discipline-elo',{operator_id,type,reason});toast(`${ids.length} operador(es) atualizado(s)`);commanderPage('patentes-elos')}catch(err){toast(err.message)}});app.querySelectorAll('[data-elo-level]').forEach(s=>s.onchange=async()=>{try{await post('elo-adjust',{operator_id:s.dataset.eloLevel,level:s.value,reason:'Ajuste manual do comando'});toast('Elo atualizado');commanderPage('patentes-elos')}catch(e){toast(e.message)}});app.querySelectorAll('[data-apply-penalty]').forEach(b=>b.onclick=async()=>{const id=b.dataset.applyPenalty;const type=app.querySelector(`[data-discipline-type="${id}"]`)?.value||'absence';const labels={absence:'Falta no jogo',highlander:'Highlander',misconduct:'Conduta'};if(!confirm(`Aplicar ${labels[type]} em @${(d.operators.find(o=>String(o.id)===String(id))||{}).nickname||'operador'}? O Elo será reduzido conforme as regras.`))return;try{await post('discipline-elo',{operator_id:id,type,reason:`${labels[type]} registrada pelo comando`});toast('Falta aplicada e Elo atualizado');commanderPage('patentes-elos')}catch(e){toast(e.message)}});app.querySelectorAll('[data-attendance]').forEach(b=>b.onclick=async()=>{try{await post('attendance',{game_id:b.dataset.attendance,operator_id:b.dataset.operator,present:b.dataset.present==='1'});toast(b.dataset.present==='1'?'Presença registrada e Elo atualizado':'Falta registrada');commanderPage('jogos')}catch(e){toast(e.message)}});app.querySelector('#installSettings')?.addEventListener('click',installPWA);app.querySelector('#installTeam')?.addEventListener('click',installPWA);;app.querySelectorAll('[data-finishgame]').forEach(b=>b.onclick=async()=>{const id=b.dataset.finishgame;const file=app.querySelector('#finishPhoto-'+id)?.files?.[0];if(!file){if(!confirm('Finalizar sem foto da partida?'))return;}const caption=app.querySelector('#finishCaption-'+id)?.value||'Foto da partida';try{const image_data=await compressMatchPhoto(file);await post('finish-game',{game_id:id,image_data,caption});toast('Jogo finalizado');commanderPage('historico')}catch(e){toast(e.message)}});app.querySelectorAll('[data-delete-field]').forEach(b=>b.onclick=async()=>{if(!confirm('Excluir este campo?'))return;try{await post('delete-field',{id:b.dataset.deleteField});toast('Campo excluído');commanderPage(page)}catch(e){toast(e.message)}});app.querySelectorAll('[data-rank]').forEach(s=>s.onchange=async()=>{try{await post('rank',{operator_id:s.dataset.rank,rank:s.value,reason:'Alteração pelo comando'});toast('Patente atualizada');commanderPage('patentes-elos')}catch(e){toast(e.message)}});app.querySelectorAll('[data-penalty]').forEach(b=>b.onclick=async()=>{if(!confirm('Suspender este operador por 3 dias?'))return;try{await post('penalty',{operator_id:b.dataset.penalty,days:3,type:'suspensão',reason:'Disciplina'});toast('Suspensão aplicada');commanderPage(page)}catch(e){toast(e.message)}});app.querySelectorAll('[data-promote]').forEach(b=>b.onclick=async()=>{if(!confirm('Tornar este operador comandante?'))return;try{await post('change-role',{operator_id:b.dataset.promote,role:'commander'});toast('Operador promovido a comandante');commanderPage(page)}catch(e){toast(e.message)}});app.querySelectorAll('[data-demote]').forEach(b=>b.onclick=async()=>{if(!confirm('Remover função de comandante?'))return;try{await post('change-role',{operator_id:b.dataset.demote,role:'operator'});toast('Comando removido');commanderPage(page)}catch(e){toast(e.message)}});app.querySelectorAll('[data-deleteop]').forEach(b=>b.onclick=async()=>{if(!confirm('Excluir definitivamente este operador?'))return;try{await post('delete-operator',{operator_id:b.dataset.deleteop});toast('Operador excluído');commanderPage(page)}catch(e){toast(e.message)}});app.querySelectorAll('[data-revoke]').forEach(b=>b.onclick=async()=>{if(!confirm('Excluir convite e remover o cadastro pendente do time?'))return;try{await post('revoke-invite',{operator_id:b.dataset.revoke});toast('Convite e cadastro removidos');commanderPage(page)}catch(e){toast(e.message)}});app.querySelectorAll('[data-decision]').forEach(b=>b.onclick=async()=>{try{await post('visitor-decision',{id:b.dataset.id,status:b.dataset.decision});toast('Solicitação atualizada');commanderPage('visitas')}catch(e){toast(e.message)}});app.querySelectorAll('[data-editgame]').forEach(b=>b.onclick=()=>{const g=d.games.find(x=>String(x.id)===String(b.dataset.editgame));if(g)openGameEditModal(g,d,page)});app.querySelectorAll('[data-close-rsvp]').forEach(b=>b.onclick=async()=>{if(b.disabled)return;if(!confirm('Encerrar a lista? Quem estiver como Vou não poderá mais retirar a presença. Quem não respondeu perderá Elo.'))return;try{const r=await post('close-rsvp',{game_id:b.dataset.closeRsvp});toast(`Lista encerrada. ${r.penalized||0} operador(es) penalizado(s)`);commanderPage(page)}catch(e){toast(e.message)}});app.querySelectorAll('[data-deletegame]').forEach(b=>b.onclick=async()=>{if(!confirm('Excluir este jogo? Essa ação remove o jogo e suas confirmações.'))return;try{await post('delete-game',{game_id:b.dataset.deletegame});toast('Jogo excluído');commanderPage('jogos')}catch(e){toast(e.message)}});
}

async function start(){
  if(location.pathname==='/entrar'){me=null;shell();return accessChoice()}
  if(location.pathname==='/operador/primeiro-acesso'){me=null;shell();return firstAccess()}
  const cachedMe=readMeCache();
  if(cachedMe){
    me=cachedMe;
  }else{
    try{me=(await api('me',{timeoutMs:5500})).user;writeMeCache(me)}catch{me=null;writeMeCache(null)}
  }
  window.__tgaCurrentOperator=me||null;
  window.dispatchEvent(new CustomEvent('tga:operator-user',{detail:me||null}));
  shell();
  if(cachedMe){
    setTimeout(async()=>{
      try{
        const fresh=(await api('me',{timeoutMs:4000})).user||null;
        if(fresh){
          writeMeCache(fresh);
          window.__tgaCurrentOperator=fresh;
          window.dispatchEvent(new CustomEvent('tga:operator-user',{detail:fresh}));
        }else writeMeCache(null);
      }catch{}
    },1400);
  }
  document.getElementById('routeLoading')?.classList.remove('show');
  try{
    if(location.pathname==='/visitantes')return await visitors();
    if(location.pathname==='/operador'){if(me?.role==='operator'||me?.role==='commander')return operator();return loginBox('operator')}
    if(location.pathname==='/operador/configuracoes'){if(me?.role==='operator'||me?.role==='commander')return operatorSettings();return loginBox('operator')}
    if(location.pathname==='/comandante'){if(me?.role==='commander')return commanderPage('equipe');return loginBox('commander')}
    if(location.pathname.startsWith('/comandante/')){if(me?.role!=='commander')return loginBox('commander');const page=location.pathname.split('/').filter(Boolean)[1];return commanderPage(page||'equipe')}
    return home()
  }catch(e){app.innerHTML=`<div class="error">${esc(e.message)}</div>`}
}
start();
