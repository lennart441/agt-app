const CACHE_NAME = 'agt-app-cache-v1';
const ASSETS_TO_CACHE = [
  '/v1/client/index.html',
  '/v1/client/style.css',
  '/v1/client/logic.js',
  '/v1/client/ui.js',
  '/v1/client/overlays.js',
  '/v1/client/report.js',
  '/v1/client/manifest.json',
  '/v1/client/agtler.json',
  '/v1/client/auftrag.json',
  '/v1/client/truppnamen.json',
  '/v1/client/lib/jspdf.umd.min.js',
  '/v1/client/lib/webdav.min.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Cache addAll failed:', err);
        // Versuche, Assets einzeln zu cachen
        return Promise.all(
          ASSETS_TO_CACHE.map(asset =>
            cache.add(asset).catch(e => {
              console.warn('Asset konnte nicht gecacht werden:', asset, e);
            })
          )
        );
      });
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
          return caches.match('/v1/client/index.html');
        }
      });
    })
  );
});