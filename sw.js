/* ============================================================
   Vitals Tracker — Service Worker
   Version: v2.009
   Purpose:
   - Force fresh asset loading after modular split
   - Bust stale caches from pre-storage.js builds
   - Never cache IndexedDB or localStorage
   - Safe for blind/mobile deployment

   IMPORTANT:
   - This SW intentionally deletes ALL old caches
   - User data is NOT stored in SW caches
   ============================================================ */

const SW_VERSION = 'v2.009';
const CACHE_NAME = `vitals-shell-${SW_VERSION}`;

// Minimal shell — JS must load fresh
const SHELL_ASSETS = [
  './',
  './index.html'
];

self.addEventListener('install', event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(SHELL_ASSETS);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Never cache JS — always load fresh
  if (req.url.endsWith('.js')) {
    event.respondWith(fetch(req));
    return;
  }

  // Network-first for everything else
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
