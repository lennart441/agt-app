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
  '/v2/client/lib/jspdf.umd.min.js',
  // ggf. weitere statische Assets hier ergänzen
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
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
            ASSETS_TO_CACHE.some(asset => event.request.url.endsWith(asset.replace('/v2/client/', '')))
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