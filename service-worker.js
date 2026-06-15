const CACHE='ete-diagnostico-v19';
const ASSETS=['./','./index.html','./css/style.css','./js/app.js','./manifest.webmanifest','./descritores/portugues-em.json','./descritores/matematica-em.json','./assets/icons/icon.svg','./assets/logo-ete.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
