const CACHE='tga-v58b';
const ASSETS=['/logo.webp','/manifest.webmanifest'];
const APP_PATCH=`\n;(()=>{\n  if(!location.pathname.startsWith('/operador'))return;\n  const wanted=[['/operador','Visão geral'],['/operador/equipe','Ver operadores'],['/operador/jogos','Jogos'],['/operador/arena','Mini jogos'],['/operador/configuracoes','Configurações']];\n  const fix=()=>{\n    const n=document.querySelector('.operatorNav');if(!n)return false;\n    const p=location.pathname.replace(/\\/+$/,'')||'/';\n    const current=[...n.querySelectorAll('a')].map(a=>a.getAttribute('href')||'').join('|');\n    const target=wanted.map(x=>x[0]).join('|');\n    if(current!==target)n.innerHTML=wanted.map(([href,label])=>'<a class="'+(p===href?'active':'')+'" href="'+href+'">'+label+'</a>').join('');\n    else n.querySelectorAll('a').forEach(a=>a.classList.toggle('active',(a.getAttribute('href')||'')===p));\n    return true;\n  };\n  fix();\n  const root=document.getElementById('app')||document.body;\n  new MutationObserver(fix).observe(root,{childList:true,subtree:true});\n  let i=0,t=setInterval(()=>{if(fix()||++i>100)clearInterval(t)},100);\n})();\n`;

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    await Promise.all(windows.map(client=>client.navigate(client.url).catch(()=>{})));
  })())
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  if(req.headers.has('range'))return;
  const url=new URL(req.url);

  if(url.pathname.startsWith('/api/')){
    event.respondWith(fetch(req,{cache:'no-store'}));
    return;
  }

  if(req.mode==='navigate'){
    event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tactical Group Airsoft</title><body style="background:#080a0c;color:#eee;font-family:Arial;padding:24px"><h2>Sem conexão</h2><p>Conecte-se à internet e abra o aplicativo novamente.</p></body>',{headers:{'Content-Type':'text/html; charset=utf-8'}})));
    return;
  }

  if(url.pathname==='/app.js'){
    event.respondWith(fetch(req,{cache:'no-store'}).then(async response=>{
      if(!response||response.status!==200)return response;
      const text=await response.text();
      const headers=new Headers(response.headers);headers.delete('content-length');headers.set('Content-Type','application/javascript; charset=utf-8');
      return new Response(text+APP_PATCH,{status:200,statusText:response.statusText,headers});
    }).catch(()=>caches.match(req)));
    return;
  }

  const isCode=url.pathname.endsWith('.js')||url.pathname.endsWith('.css');
  if(isCode){
    event.respondWith(fetch(req,{cache:'no-store'}).then(response=>{
      if(response&&response.status===200){
        const copy=response.clone();
        event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{}));
      }
      return response;
    }).catch(()=>caches.match(req)));
    return;
  }

  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{
    if(response&&response.status===200){
      const copy=response.clone();
      event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{}));
    }
    return response;
  })));
});

self.addEventListener('push',event=>{
  let data={title:'Tactical Group Airsoft',body:'Nova atualização do comando.',url:'/operador'};
  try{data=event.data?.json()||data}catch{}
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/logo.webp',badge:'/logo.webp',data:{url:data.url||'/operador'}}))
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=event.notification.data?.url||'/';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus'in c){c.navigate?.(url);return c.focus()}}return clients.openWindow(url)}))
});
