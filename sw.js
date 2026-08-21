const CACHE='tga-v61';
const ASSETS=['/','/logo.webp','/manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.pathname.startsWith('/api/')){event.respondWith(fetch(event.request));return;}
  if(['/app.js','/style.css','/sw.js','/mobile-fixes.css','/mobile-public-profile.js','/visitor-profile-mobile-fix.js','/operator-guardian-fix.js'].includes(url.pathname)){event.respondWith(fetch(event.request,{cache:'no-store'}));return;}
  if(event.request.mode==='navigate'){event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match('/')));return;}
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok&&response.status===200){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{})}return response})));
});
self.addEventListener('push',event=>{let data={title:'Tactical Group Airsoft',body:'Nova atualização do comando.',url:'/operador'};try{data=event.data?.json()||data}catch(e){}event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/logo.webp',badge:'/logo.webp',data:{url:data.url||'/operador'}}))});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=event.notification.data?.url||'/';event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus' in c)return c.focus()}return clients.openWindow(url)}));
});
