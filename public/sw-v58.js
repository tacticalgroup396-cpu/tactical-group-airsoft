const CACHE='tga-v58';
const ASSETS=['/logo.webp','/manifest.webmanifest'];

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
