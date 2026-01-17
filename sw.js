/* =========================================================
   Vitals Tracker — Service Worker
   File: sw.js
   App Version: v2.009

   Purpose:
   - Force-refresh cached shell after modular migration
   - Eliminate stale HTML/JS served by older SW versions
   - Preserve ALL user data (localStorage / IndexedDB)

   Latest update (v2.009):
   - New cache namespace
   - Aggressive old-cache cleanup
   - Immediate activation + control
   ========================================================= */

const CACHE_NAME = 'vitals-tracker-v2-009-clean';

self.addEventListener('install', event => {
  self.skipWaiting();
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
  // Always go to network first for HTML/JS/CSS
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
