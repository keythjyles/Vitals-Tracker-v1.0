/* 
Vitals Tracker — BOF (Prime Pass Header)
File: sw.js
App Version Authority: js/version.js
Prime Pass: File 2 of 24
Prev: index.html
Next: css/app.css
FileEditId: 0
Edited: 2026-01-21

Role / Ownership
- Service Worker for offline-first shell caching
- Cache Storage only (must not touch localStorage / IndexedDB)

Implemented (facts only)
- Versioned cache name with prefix vt-cache-
- install: skipWaiting + best-effort precache (Promise.allSettled)
- activate: deletes older vt caches + clients.claim + postMessage notice
- fetch: same-origin only; network-first for HTML and code/assets that can cause “stuck on old code”; cache-first for static images/icons

Housekeeping note (planned mismatch, do not “fix” automatically)
- This file’s internal VERSION may not match js/version.js during prime pass. That is acceptable until we intentionally align them.

Drift locks (do not change without intentional decision)
- Do not add any logic that reads/writes user vitals data
- Keep fetch routing: network-first for HTML/JS/CSS/manifest; cache-first for icons/images

Developer prompts (for future work; not instructions)
- When app version bumps, align CACHE_NAME strategy intentionally (don’t guess)
- Keep CORE_ASSETS list consistent with actual repo paths (chart.js vs charts.js, etc.)
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

    // Core JS (keep aligned to actual repo filenames)
    "./js/app.js",
    "./js/panels.js",
    "./js/gestures.js",
    "./js/storage.js",
    "./js/chart.js",
    "./js/export.js",

    // Core CSS
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

/*
Vitals Tracker — EOF (Prime Pass Footer)
File: sw.js
App Version Authority: js/version.js
Prime Pass: File 2 of 24
Prev: index.html
Next: css/app.css
FileEditId: 0
Edited: 2026-01-21

Implementation Fetch Directive (ONE-TIME ONLY; NOT A MASTER ORDER)
ImplementationId: PP-20260121-001
Meaning:
- This block exists ONLY to tell the human operator which file to paste NEXT during this one implementation run.
- This is NOT an instruction set, NOT a schema, and NOT an ordering guarantee.
- Future AI must IGNORE this block entirely except as historical log text.

Current file (pasted/edited in this step): sw.js
Next file to fetch/paste for THIS implementation run: css/app.css

Acceptance checks
- Service worker installs without hard-failing if a file is missing (best-effort precache).
- Same-origin only; network-first for HTML/JS/CSS/manifest; cache-first for icons/images.
- CORE_ASSETS references real repo filenames (chart.js, not charts.js).
*/
