/*
Vitals Tracker (Modular) — js/pwa.js
App Version: v2.001
Purpose:
- PWA setup identical in behavior to v1:
  - Injects a manifest via a blob URL so we remain modular without external files.
  - Registers a minimal service worker (offline-first shell behavior depends on browser; no network calls).
  - Manages Install/Uninstall UX:
    - If installed, shows uninstall instructions (cannot programmatically uninstall).
    - If not installed, triggers the native install prompt when available.

Data Safety:
- PWA behavior does NOT modify storage keys or data.
- All vitals data remains in localStorage under the same STORAGE_KEY used by v1.

Latest Update (v2.001):
- Initial modular PWA implementation (manifest + SW + install prompt handling).
*/

import { $ } from "./utils.js";

let deferredPrompt = null;

export function isStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function refreshInstallButton(){
  const btn = $("btnInstall");
  if(!btn) return;
  btn.textContent = isStandalone() ? "Uninstall" : "Install";
}

export function wireInstallPromptCapture(){
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    refreshInstallButton();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    refreshInstallButton();
  });
}

export async function handleInstallClick(){
  if(isStandalone()){
    alert(
      "Uninstall:\n\n" +
      "Android: press-and-hold the app icon → Uninstall.\n" +
      "Uninstall typically does NOT delete your saved data, but device/browser behavior can vary.\n\n" +
      "To delete data on purpose: use Clear Data (home screen)."
    );
    return;
  }

  if(deferredPrompt){
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch {}
    deferredPrompt = null;
    refreshInstallButton();
    return;
  }

  alert("Install is available when your browser offers it (menu → Install app).");
}

export function injectManifest(){
  const svg =
`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2f78ff"/>
      <stop offset="1" stop-color="#0b1324"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="110" fill="url(#g)"/>
  <path d="M128 290h70l26-94 44 160 30-98h84" fill="none"
        stroke="rgba(235,245,255,.92)" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="160" cy="290" r="10" fill="rgba(235,245,255,.92)"/>
  <circle cx="382" cy="258" r="10" fill="rgba(235,245,255,.92)"/>
</svg>`;

  const encoded = encodeURIComponent(svg).replace(/'/g,"%27").replace(/"/g,"%22");
  const icon = `data:image/svg+xml;charset=utf-8,${encoded}`;

  const manifest = {
    name: "Vitals Tracker",
    short_name: "Vitals",
    start_url: ".",
    display: "standalone",
    background_color: "#0b1324",
    theme_color: "#0b1324",
    icons: [{ src: icon, sizes: "512x512", type: "image/svg+xml", purpose: "any" }]
  };

  const blob = new Blob([JSON.stringify(manifest)], { type:"application/manifest+json" });
  const url = URL.createObjectURL(blob);

  const link = document.querySelector('link[rel="manifest"]');
  if(link) link.setAttribute("href", url);
}

export async function registerSW(){
  if(!("serviceWorker" in navigator)) return;

  // Minimal SW (same as v1): install/activate only. No fetch interception.
  const swCode =
`self.addEventListener('install', (e)=>{ self.skipWaiting(); });
self.addEventListener('activate', (e)=>{ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e)=>{ });`;

  const blob = new Blob([swCode], { type:"text/javascript" });
  const swUrl = URL.createObjectURL(blob);

  try { await navigator.serviceWorker.register(swUrl); } catch {}
}

/*
Vitals Tracker (Modular) — js/pwa.js (EOF)
App Version: v2.001
Notes:
- Manifest is injected at runtime; no extra manifest.json file required.
- Service worker remains minimal to avoid unexpected caching issues during development.
- Next expected file: js/storage.js (load/save/clear + legacy import safeguard so we never destroy existing data)
*/
