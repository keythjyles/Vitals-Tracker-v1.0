/* ------------------------------------------------------------
   Vitals Tracker — sw.js
   App Version: v2.011

   Purpose:
   - Offline-first caching for the modular shell
   - Force cache refresh when versions change
   - Never touches user data (localStorage / IndexedDB remain untouched)

   Latest update (v2.011):
   - Aggressively clears older caches on activate
   - Uses network-first for HTML/JS/CSS to prevent “stuck on old code”
   - Cache-first for static assets (icons/images)

   Safety:
   - No storage writes beyond Cache Storage
   - Does not read/modify vitals data
   ------------------------------------------------------------ */

(() => {
  "use strict";

  const VERSION = "v2.011";
  const CACHE_PREFIX = "vt-cache-";
  const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;

  // Add the files that must always be available offline.
  // Keep this list conservative: the network-first strategy below will keep these fresh.
  const CORE_ASSETS = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./sw.js",

    // Core JS (add/remove as your repo actually uses)
    "./js/app.js",
    "./js/panels.js",
    "./js/gestures.js",
    "./js/storage.js",
    "./js/charts.js",
    "./js/export.js",

    // Core CSS if separated (safe if missing; fetch handler covers it)
    "./css/app.css"
  ];

  self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
      self.skipWaiting();
      try {
        const cache = await caches.open(CACHE_NAME);
        // Precache best-effort; missing files should not brick install.
        await Promise.allSettled(
          CORE_ASSETS.map((url) => cache.add(url))
        );
      } catch (_) {}
    })());
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
      // Delete ALL old vt caches
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME) {
            return caches.delete(k);
          }
          return Promise.resolve(true);
        })
      );

      await self.clients.claim();

      // Optional: tell open pages to reload (non-blocking)
      try {
        const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const c of clients) {
          c.postMessage({ type: "VT_SW_UPDATED", version: VERSION });
        }
      } catch (_) {}
    })());
  });

  function isHtml(req) {
    return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  }

  function isCodeOrStyle(url) {
    const p = url.pathname.toLowerCase();
    return p.endsWith(".js") || p.endsWith(".css") || p.endsWith(".mjs") || p.endsWith(".json") || p.endsWith(".webmanifest");
  }

  function isStaticAsset(url) {
    const p = url.pathname.toLowerCase();
    return (
      p.endsWith(".png") || p.endsWith(".jpg") || p.endsWith(".jpeg") || p.endsWith(".webp") ||
      p.endsWith(".svg") || p.endsWith(".ico")
    );
  }

  async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
      const fresh = await fetch(request, { cache: "no-store" });
      if (fresh && fresh.ok) cache.put(request, fresh.clone());
      return fresh;
    } catch (_) {
      const cached = await cache.match(request);
      if (cached) return cached;
      throw _;
    }
  }

  async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    const resp = await fetch(request);
    if (resp && resp.ok) cache.put(request, resp.clone());
    return resp;
  }

  self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);

    // Only handle same-origin requests
    if (url.origin !== self.location.origin) return;

    // Keep HTML/JS/CSS fresh to avoid “stuck placeholder” UI
    if (isHtml(req) || isCodeOrStyle(url)) {
      event.respondWith(networkFirst(req));
      return;
    }

    // Static assets can be cache-first
    if (isStaticAsset(url)) {
      event.respondWith(cacheFirst(req));
      return;
    }

    // Default: network-first (safer for correctness)
    event.respondWith(networkFirst(req));
  });

})();
