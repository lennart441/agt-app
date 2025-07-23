const CACHE_NAME = 'atemschutz-cache-v5'; // Updated cache name to include agtler.json

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Cache geöffnet:', CACHE_NAME);
      return cache.addAll([
        "/",
        "/index.html",
        "/style.css",
        "/app.js",
        "/logic.js",
        "/ui.js",
        "/report.js",
        "/manifest.json",
        "/truppnamen.json",
        "/agtler.json",
        "/lib/jspdf.umd.min.js"
      ]).then(() => {
        console.log('Service Worker: Alle Dateien erfolgreich gecacht.');
      });
    }).catch(err => {
      console.error('Service Worker: Fehler beim Cachen:', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Lösche alten Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Aktivierung abgeschlossen, neuer Cache:', CACHE_NAME);
    })
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      if (response) {
        console.log('Service Worker: Cache-Treffer für:', e.request.url);
        return response;
      }
      console.log('Service Worker: Fetch von Netzwerk:', e.request.url);
      return fetch(e.request);
    }).catch(err => {
      console.error('Service Worker: Fetch-Fehler:', err);
    })
  );
});