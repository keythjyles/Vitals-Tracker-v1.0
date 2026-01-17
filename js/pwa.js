/*
Vitals Tracker (Modular) — js/pwa.js
App Version: v2.001

Purpose:
- PWA helpers (single responsibility):
  - Injects an in-memory manifest (so the app stays “single repo / modular files” without external manifest maintenance).
  - Registers the service worker.
  - Handles Install / Uninstall UX:
      - Install triggers the browser prompt when available.
      - “Uninstall” provides plain instructions (OS/app-manager controlled).
- Does NOT touch data storage. Data remains under STORAGE_KEY (v1).

Latest Update (v2.001):
- Initial PWA module: injectManifest + registerSW + Install button behavior.
*/

import { APP_VERSION } from "./state.js";

let deferredPrompt = null;

export function injectManifest(){
  const manifest = {
    name: "Vitals Tracker",
    short_name: "Vitals",
    start_url: "./index.html",
    display: "standalone",
    background_color: "#0b1324",
    theme_color: "#0b1324",
    icons: [
      {
        src: "./icons/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "./icons/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };

  const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
  const url = URL.createObjectURL(blob);

  const link = document.getElementById("manifestLink");
  if(link) link.setAttribute("href", url);
}

export function registerSW(){
  if(!("serviceWorker" in navigator)) return;
  // Keep scope local to folder
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

export function isStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function refreshInstallButton(){
  const btn = document.getElementById("btnInstall");
  if(!btn) return;
  btn.textContent = isStandalone() ? "Uninstall" : "Install";
}

export function handleInstallClick(){
  if(isStandalone()){
    // System-controlled uninstall; provide instructions only.
    alert(
      "Uninstall:\n\n" +
      "Android: press-and-hold the app icon → Uninstall.\n" +
      "Chrome: Settings → Apps → Vitals Tracker → Uninstall.\n\n" +
      "To delete your saved vitals data inside the app, use: Clear Data."
    );
    return;
  }

  if(deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice
      .catch(()=>{})
      .finally(() => {
        deferredPrompt = null;
        refreshInstallButton();
      });
    return;
  }

  alert("Install is available when your browser offers it (menu → Install app).");
}

export function wireInstallEvents(){
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

/*
Vitals Tracker (Modular) — js/pwa.js (EOF)
App Version: v2.001
Notes:
- Requires index.html to have <link id="manifestLink" rel="manifest" href="#">
- Next expected file: sw.js (service worker)
*/
