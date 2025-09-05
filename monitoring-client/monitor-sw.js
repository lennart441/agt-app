const CACHE_NAME = 'agt-monitor-cache-v1';
const ASSETS_TO_CACHE = [
  '/v1/monitoring-client/monitoring.html',
  '/v1/monitoring-client/mon-base.css',
  '/v1/monitoring-client/mon-trupp.css',
  '/v1/monitoring-client/monitor-ui.js',
  '/v1/monitoring-client/monitor.js',
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
  // Nicht cachen: Sync-API
  if (url.includes('/v1/sync-api/')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/monitoring-client/monitoring.html');
        }
      });
    })
  );
});