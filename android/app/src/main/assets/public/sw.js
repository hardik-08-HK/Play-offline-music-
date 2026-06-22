const CACHE_NAME = 'offline-music-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/launcher-icon.jpg',
  '/manifest.json'
];

// Install Event - cache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching core shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-while-revalidate strategy for assets
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip Firestore, Firebase Auth, chrome extensions, etc.
  if (
    event.request.method !== 'GET' ||
    requestUrl.hostname.indexOf('firestore') > -1 ||
    requestUrl.hostname.indexOf('googleapis') > -1 ||
    requestUrl.hostname.indexOf('firebase') > -1 ||
    requestUrl.protocol.startsWith('chrome-extension') ||
    requestUrl.pathname.indexOf('/api/') > -1
  ) {
    return; // Pass through directly to network
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Cache valid successful GET assets
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch((err) => {
            console.warn('[Service Worker] Network fetch failed, offline fallback.');
            return cachedResponse;
          });

        // Return cached version immediately if available, else wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});
