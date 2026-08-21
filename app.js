const app=document.getElementById('app');
const nav=document.getElementById('nav');
let me=null;

const api=async(action,options={})=>{
  const [rawAction, rawQuery='']=String(action||'').split('&',2);
  const query=rawQuery?('&'+rawQuery):'';
  const cacheBust=(options.method||'GET')==='GET'?`${query?'&':'&'}_t=${Date.now()}`:'';
  const fetchOptions={cache:'no-store',headers:{'Content-Type':'application/json',...(options.headers||{})},...options};
  const r=await fetch('/api/index.js?action='+encodeURIComponent(rawAction)+query+cacheBust,fetchOptions);
  const text=await r.text();
  let data={};
  try{data=text?JSON.parse(text):{}}catch{data={error:'Resposta inválida do servidor.'}}
  if(!r.ok)throw new Error(data.error||'Erro interno.');
  return data;
};
const post=(action,data)=>api(action,{method:'POST',body:JSON.stringify(data)});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=d=>{if(!d)return 'Data não informada';const s=String(d);const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return new Date(Date.UTC(+m[1],+m[2]-1,+m[3])).toLocaleDateString('pt-BR',{timeZone:'UTC'});const x=new Date(s);return Number.isNaN(x.getTime())?'Data não informada':x.toLocaleDateString('pt-BR')};
const fmtTime=t=>t?String(t).slice(0,5):'';
const photoOrInitial=(o,big=false)=>o.photo_url?`<img class="profilePhoto ${big?'big':''}" loading="lazy" decoding="async" src="${o.photo_url}" alt="Foto de ${esc(o.nickname)}">`:`<div class="avatar ${big?'big':''}">${esc((o.nickname||'?').slice(0,2))}</div>`;
const eloMeta=level=>{const n=Math.min(7,Math.max(1,Number(level)||7));const map={1:['Diamante','diamond','💎'],2:['Esmeralda','emerald','🟩'],3:['Platina','platinum','🔷'],4:['Ouro','gold','🏆'],5:['Prata','silver','🥈'],6:['Bronze','bronze','🥉'],7:['Ferro','iron','⚙️']};const m=map[n]||map[7];return {level:n,label:m[0],tone:m[1],symbol:m[2]}};
const rankSymbols={'Recruta':'🪖','Soldado':'🎖️','Cabo':'⭐','3º Sargento':'🏅','2º Sargento':'🏅','1º Sargento':'🏅','Subtenente':'🛡️','Aspirante':'🎯','Tenente':'⚔️','Capitão':'🛡️','Major':'🏆','Tenente-Coronel':'🎖️','Coronel':'👑'};
const rankIcon=rank=>rankSymbols[rank]||'🎖️';
const DEFAULT_RANKS=['Recruta','Soldado','Cabo','3º Sargento','2º Sargento','1º Sargento','Subtenente','Aspirante','Tenente','Capitão','Major','Tenente-Coronel','Coronel'];
const ranks=DEFAULT_RANKS;
const eloBadge=level=>{const e=eloMeta(level);return `<span class="eloBadge ${e.tone}"><span class="eloSymbol">${e.symbol}</span> Elo ${e.level} · ${e.label}</span>`};
function showRouteLoading(){let x=document.getElementById('routeLoading');if(!x){x=document.createElement('div');x.id='routeLoading';x.className='routeLoading';x.innerHTML='<div class="routeSpinner"></div><span>Carregando...</span>';document.body.appendChild(x)}requestAnimationFrame(()=>x.classList.add('show'));}
function gameParticipantSummary(p,admin=false,gameId=''){const l=p.loadout||{};const extras=Array.isArray(l.equipamentos_extras)?l.equipamentos_extras.filter(Boolean):[];const gear=[l.funcao,l.aeg_secundaria||l.replica,...extras].filter(Boolean);return `<div class="gameParticipant"><a class="gameParticipantIdentity" href="/visitantes?operator=${encodeURIComponent(p.id)}${admin?'&from=commander':''}"><img loading="lazy" decoding="async" src="${p.photo_url||'/logo.webp'}" alt="Foto de ${esc(p.nickname)}" class="gameParticipantPhoto"><div><b>@${esc(p.nickname)}</b>${p.name?`<span class="participantName">${esc(p.name)}</span>`:''}<span>${esc(p.rank||'Operador')} · ${esc(p.function||'Operador')}</span>${p.elo_level?eloBadge(p.elo_level):''}</div></a><div class="gameParticipantGear">${gear.length?gear.map(x=>`<span>${esc(x)}</span>`).join(''):'<span class="muted">Sem equipamentos informados</span>'}</div>${admin?`<div class="gameParticipantAdmin"><button type="button" class="mini" data-attendance="${gameId}" data-operator="${p.id}" data-present="1">✓ Presente</button><button type="button" class="mini danger" data-attendance="${gameId}" data-operator="${p.id}" data-present="0">Faltou</button><button type="button" class="mini" data-discipline="${p.id}" data-type="highlander">Highlander</button><button type="button" class="mini danger" data-discipline="${p.id}" data-type="misconduct">Conduta</button></div>`:''}</div>`;}
function openImageLightbox(src,alt='Imagem'){const m=document.createElement('div');m.className='lightbox';m.innerHTML=`<button class="lightboxClose" type="button">×</button><img src="${src}" alt="${esc(alt)}">`;document.body.appendChild(m);const close=()=>m.remove();m.onclick=e=>{if(e.target===m||e.target.classList.contains('lightboxClose'))close()};document.addEventListener('keydown',function onKey(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',onKey)}},{once:true});}
function toast(t){const x=document.createElement('div');x.className='toast';x.textContent=t;document.body.appendChild(x);setTimeout(()=>x.remove(),3500)}
function installButton(){return me&&['operator','commander'].includes(me.role)?'<button id="installApp" class="ghost">Instalar app</button>':''}
