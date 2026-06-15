const CACHE='ete-diagnostico-v1';
const ASSETS=['./','./index.html','./css/style.css','./js/app.js','./manifest.webmanifest','./descritores/portugues-em.json','./descritores/matematica-em.json','./assets/icons/icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
