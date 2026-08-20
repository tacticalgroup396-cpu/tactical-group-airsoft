const CACHE='tga-v23';
const ASSETS=['/','/app.js','/style.css','/logo.webp','/manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never cache API/auth requests. Session state must always come from the server.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache static app assets; use network-first for navigations so new deploys show up.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      });
    })
  );
});


self.addEventListener('push', event => {
  let data={title:'Tactical Group Airsoft',body:'Nova atualização do comando.',url:'/operador'};
  try{data=event.data?.json()||data}catch(e){}
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/logo.webp',badge:'/logo.webp',data:{url:data.url||'/operador'}}));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url=event.notification.data?.url||'/';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus' in c)return c.focus()}return clients.openWindow(url)}));
});
