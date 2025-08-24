const CACHE_NAME = 'agt-app-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/client/index.html',
  '/client/style.css',
  '/client/logic.js',
  '/client/ui.js',
  '/client/overlays.js',
  '/client/report.js',
  '/client/manifest.json',
  '/client/agtler.json',
  '/client/auftrag.json',
  '/client/truppnamen.json',
  '/client/lib/jspdf.umd.min.js',
  '/client/lib/webdav.min.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;
  // Nicht cachen: Sync- und Report-Server-APIs
  if (url.includes('/v1/sync-api/') || url.includes('/report-server/')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
        // Fallback: index.html für Navigationsanfragen
        if (event.request.mode === 'navigate') {
          return caches.match('/client/index.html');
        }
      });
    })
  );
});