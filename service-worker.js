const CACHE_NAME = "procedure-logbook-v49-force";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-1024.png",
  "./apple-touch-icon.png",
  "./favicon.ico",
  "./favicon-32.png",
  "./favicon-64.png",
  "./xlsx.full.min.js"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isAppShellRequest(request) {
  const url = new URL(request.url);
  if (request.mode === "navigate") return true;
  if (url.origin !== self.location.origin) return false;

  return [
    "/logbook/",
    "/logbook/index.html",
    "/logbook/app.js",
    "/logbook/styles.css",
    "/logbook/manifest.json",
    "/logbook/service-worker.js"
  ].includes(url.pathname);
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  if (isAppShellRequest(event.request)) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(networkResponse => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request).then(networkResponse => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        return networkResponse;
      });
    })
  );
});
