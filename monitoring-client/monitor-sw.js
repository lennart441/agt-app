const CACHE_NAME = 'agt-monitoring-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/monitoring-client/monitoring.html',
  '/monitoring-client/mon-style.css',
  '/monitoring-client/monitor.js',
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