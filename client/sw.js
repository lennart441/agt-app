const CACHE_VERSION = 'v2.1.0';
const CACHE_NAME = `agt-app-cache-${CACHE_VERSION}`;
const ASSETS_TO_CACHE = [
  '/v2/client/index.html',
  '/v2/client/style.css',
  '/v2/client/settings.css',
  '/v2/client/logic.js',
  '/v2/client/ui.js',
  '/v2/client/overlays.js',
  '/v2/client/report.js',
  '/v2/client/localStorage.js',
  '/v2/client/eventlistener.js',
  '/v2/client/dataTakeover.js',
  '/v2/client/alarm.mp3',
  '/v2/client/manifest.json',
  '/v2/client/agtler.json',
  '/v2/client/auftrag.json',
  '/v2/client/truppnamen.json',
  '/v2/client/lib/jspdf.umd.min.js'
  // ...weitere statische Assets nach Bedarf...
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
          console.log('Gecacht:', asset);
        } catch (err) {
          console.error('Fehler beim Cachen:', asset, err);
        }
      }
    })
  );
});

self.addEventListener('activate', event => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;
  // API-Calls nicht cachen
  if (
    url.includes('/sync-api/') ||
    url.includes('/report-server/') ||
    url.includes('/report/upload-report')
  ) {
    return;
  }
  // Cache First, Network Fallback für Assets
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request)
        .then(networkResponse => {
          // Nur GET-Anfragen und nur statische Assets cachen
          if (
            event.request.method === 'GET' &&
            ASSETS_TO_CACHE.includes(new URL(event.request.url).pathname)
          ) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback: index.html für Navigationsanfragen
          if (event.request.mode === 'navigate') {
            return caches.match('/v2/client/index.html');
          }
        });
    })
  );
});

// Debug: Service Worker lifecycle events
self.addEventListener('message', event => {
  console.log('Service Worker: Nachricht empfangen:', event.data);
});
self.addEventListener('error', event => {
  console.error('Service Worker: Fehler:', event);
});