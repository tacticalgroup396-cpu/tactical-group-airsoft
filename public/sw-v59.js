const CACHE='tga-v59';
const CORE=['/logo.webp','/manifest.webmanifest'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||req.headers.has('range'))return;
  const url=new URL(req.url);

  if(url.pathname.startsWith('/api/')){
    event.respondWith(fetch(req,{cache:'no-store'}));
    return;
  }

  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req,{cache:'no-store'}).catch(()=>caches.match('/').then(r=>r||new Response(
        '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tactical Group Airsoft</title><body style="background:#080a0c;color:#eee;font-family:Arial;padding:24px"><h2>Sem conexão</h2><p>Conecte-se à internet e tente novamente.</p></body>',
        {headers:{'Content-Type':'text/html; charset=utf-8'}}
      )))
    );
    return;
  }

  const sameOrigin=url.origin===self.location.origin;
  const staticAsset=sameOrigin&&/\.(?:js|css|webp|png|jpe?g|svg|woff2?|webmanifest)$/i.test(url.pathname);
  if(staticAsset){
    event.respondWith((async()=>{
      const cached=await caches.match(req);
      const refresh=fetch(req).then(async response=>{
        if(response&&response.ok){
          try{const cache=await caches.open(CACHE);await cache.put(req,response.clone())}catch{}
        }
        return response;
      }).catch(()=>null);
      if(cached){
        event.waitUntil(refresh);
        return cached;
      }
      return (await refresh)||new Response('',{status:504,statusText:'Offline'});
    })());
  }
});

self.addEventListener('push',event=>{
  let data={title:'Tactical Group Airsoft',body:'Nova atualização do comando.',url:'/operador'};
  try{data=event.data?.json()||data}catch{}
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/logo.webp',badge:'/logo.webp',data:{url:data.url||'/operador'}}));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=event.notification.data?.url||'/';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
    for(const c of cs){if('focus' in c){c.navigate?.(url);return c.focus()}}
    return clients.openWindow(url);
  }));
});
