const CACHE_NAME = 'agt-monitor-v2-cache';
const ASSETS_TO_CACHE = [
  '/v2/monitoring-client/monitoring.html',
  '/v2/monitoring-client/mon-base.css',
  '/v2/monitoring-client/mon-trupp.css',
  '/v2/monitoring-client/monitor-ui.js',
  '/v2/monitoring-client/monitor.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(ASSETS_TO_CACHE)
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  // Claim clients so updates take effect immediately
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Nur statische Assets unter /v2/monitoring-client cachen, keine API-Calls
  if (
    url.pathname.startsWith('/v2/sync-api/') ||
    url.pathname.startsWith('/v2/client/') ||
    url.pathname.startsWith('/v2/report-server/')
  ) {
    return; // Niemals cachen
  }
  // Nur für Monitoring-Client
  if (!url.pathname.startsWith('/v2/monitoring-client/')) {
    return;
  }
  // HTML-Fallback für Navigationsanfragen
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/v2/monitoring-client/monitoring.html').then(response =>
        response || fetch(event.request)
      )
    );
    return;
  }
  // Sonstige Assets
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request)
    )
  );
});