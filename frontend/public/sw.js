const CACHE_NAME = "lic-inventory-v1";

// These are the "Seed" assets needed to start the app
const STATIC_ASSETS = ["/", "/index.html", "/logo.png", "/manifest.json"];

// Install Event: Cache core assets and skip waiting
self.addEventListener("install", (event) => {
  self.skipWaiting(); // 🔑 Force the new service worker to activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
});

// Activate Event: Cleanup old caches and claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        );
      })
      .then(() => self.clients.claim()), // 🔑 Start controlling the page immediately
  );
});

// Fetch Event: Network-first, with automatic caching fallback
self.addEventListener("fetch", (event) => {
  // 🔑 FIX 1: Ignore non-http(s) requests (prevents chrome-extension errors)
  if (!event.request.url.startsWith("http")) {
    return;
  }

  // 1. Skip non-GET and API requests
  if (event.request.method !== "GET" || event.request.url.includes("/api/")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 2. If the network request works, clone it and save it to the cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // 3. If network fails (Offline Mode), look in the cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // 🔑 FIX 2: If an image is missing while offline, return the logo as a placeholder
          if (event.request.destination === "image") {
            return caches.match("/logo.png");
          }
        });
      }),
  );
});
