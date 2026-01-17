/*
Vitals Tracker (Modular) — sw.js
App Version: v2.001

Purpose:
- Minimal service worker for installability and offline resilience.
- IMPORTANT: This SW is deliberately conservative:
  - It does not aggressively cache-bust or pre-cache everything.
  - It avoids behavior that could “trap” older assets during rapid iteration.
- It supports:
  - Immediate activation (skipWaiting + clients.claim).
  - Network-first for navigations with offline fallback to cached index.
  - Cache-first for same-origin static assets once cached.

Latest Update (v2.001):
- Initial modular service worker.
- Adds a small core pre-cache list for index + main modules to support offline startup.

Operational Notes:
- This does not touch any localStorage data (your vitals records remain intact).
*/

const APP_VERSION = "v2.001";
const CACHE_NAME = `vitals_mod_${APP_VERSION}`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./js/state.js",
  "./js/utils.js",
  "./js/storage.js",
  "./js/ui.js",
  "./js/panels.js",
  "./js/gestures.js",
  "./js/chart.js",
  "./js/reporting.js",
  "./js/pwa.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try{
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(k => k.startsWith("vitals_mod_") && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      );
    }catch{}
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if(url.origin !== self.location.origin) return;

  // Navigation: network-first, then cached index.html
  if(req.mode === "navigate"){
    event.respondWith((async () => {
      try{
        const net = await fetch(req);
        return net;
      }catch{
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match("./index.html");
        return cached || new Response("Offline", { status: 503, headers: {"Content-Type":"text/plain"} });
      }
    })());
    return;
  }

  // Static: cache-first once available, else fetch and cache
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if(cached) return cached;

    try{
      const res = await fetch(req);
      // Cache successful basic responses
      if(res && res.status === 200 && (res.type === "basic" || res.type === "default")){
        cache.put(req, res.clone()).catch(()=>{});
      }
      return res;
    }catch{
      return cached || new Response("", { status: 504 });
    }
  })());
});

/*
Vitals Tracker (Modular) — sw.js (EOF)
App Version: v2.001
Notes:
- If you add new JS/CSS files, add them to CORE_ASSETS for better offline startup.
- Next expected file: css/app.css (styling)
*/
