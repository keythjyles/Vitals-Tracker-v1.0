/*
Vitals Tracker — Service Worker
App Version: v2.006

Purpose:
- Offline-first shell WITHOUT breaking development iteration.
- Prevent stale-cached JS from killing boot (your current issue).
- Keep icons/css/index cached for quick load.
- Always fetch JS fresh (network-first for JS), with a safe fallback if offline.

Latest Update (v2.006):
- Added strict "NO-CACHE for /js/" rule:
    * JS files are always fetched from network (cache-busting via SW behavior).
    * If offline, falls back to cached JS (if previously available).
- Cache name bumped to force old SW caches to be ignored.
- skipWaiting + clients.claim to take control immediately after update.

Install/Update Notes:
1) Replace your existing sw.js with this file (same name: sw.js at repo root).
2) Commit + push.
3) Hard reload once (or open with ?v=2006). The new SW will activate.

Data Safety:
- This does NOT touch localStorage/IndexedDB records.
- This only controls fetch/caching of static assets.
*/

"use strict";

const APP_VERSION = "v2.006";
const CACHE_PREFIX = "vt2";
const CACHE_NAME = `${CACHE_PREFIX}-${APP_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${APP_VERSION}`;

/* IMPORTANT:
   - Do NOT list JS files in precache. That is what caused stale module loads.
   - Keep precache minimal and stable.
*/
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./css/app.css",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// --- Lifecycle ---------------------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS.map(u => new Request(u, { cache: "reload" })));
    // Activate immediately so users stop being stuck on stale caches.
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Claim control immediately.
    await self.clients.claim();

    // Cleanup old caches from previous versions.
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (k.startsWith(CACHE_PREFIX + "-") && k !== CACHE_NAME && k !== RUNTIME_CACHE) {
        return caches.delete(k);
      }
      return Promise.resolve();
    }));
  })());
});

// --- Fetch Strategy ----------------------------------------------------------
// Rules:
// 1) Any /js/ file => NETWORK FIRST (avoid stale-cached JS)
// 2) Navigation (HTML) => NETWORK FIRST, fallback to cache
// 3) CSS/Icons => CACHE FIRST with background refresh
// 4) Everything else => CACHE FIRST, fallback to network

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isJS(url) {
  return url.pathname.includes("/js/") && url.pathname.endsWith(".js");
}

function isCSS(url) {
  return url.pathname.endsWith(".css");
}

function isIcon(url) {
  return url.pathname.includes("/icons/") && (url.pathname.endsWith(".png") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".ico"));
}

function isHTMLNavigation(request) {
  return request.mode === "navigate" ||
         (request.headers.get("accept") || "").includes("text/html");
}

async function cachePutSafe(cacheName, request, response) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch (e) {
    // ignore cache write errors (quota, opaque, etc.)
  }
}

async function networkFirst(request, cacheName) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) await cachePutSafe(cacheName, request, fresh);
    return fresh;
  } catch (e) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request, { ignoreSearch: false });
    if (cached) return cached;
    throw e;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: false });
  if (cached) {
    // background refresh
    fetch(request).then((fresh) => {
      if (fresh && fresh.ok) cachePutSafe(cacheName, request, fresh);
    }).catch(() => {});
    return cached;
  }
  const fresh = await fetch(request);
  if (fresh && fresh.ok) await cachePutSafe(cacheName, request, fresh);
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only handle same-origin requests (leave others alone).
  if (!isSameOrigin(url)) return;

  // 1) Critical fix: NEVER serve stale JS.
  if (isJS(url)) {
    event.respondWith(networkFirst(req, RUNTIME_CACHE));
    return;
  }

  // 2) HTML navigations should also be network-first to avoid stale shells.
  if (isHTMLNavigation(req)) {
    event.respondWith(networkFirst(req, CACHE_NAME));
    return;
  }

  // 3) CSS + icons cache-first (safe)
  if (isCSS(url) || isIcon(url)) {
    event.respondWith(cacheFirst(req, CACHE_NAME));
    return;
  }

  // 4) Default
  event.respondWith(cacheFirst(req, RUNTIME_CACHE));
});
/*
EOF — sw.js
App Version: v2.006

Summary:
- Fixes “Storage bridge not loaded” caused by stale cached JS.
- JS now network-first; HTML network-first; assets cache-first.
*/
