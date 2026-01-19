/* File: js/ui.js */
/*
Vitals Tracker — UI Glue (Minimal, Authoritative)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.024
Base: v2.023d
Date: 2026-01-18

CURRENT FIX SCOPE (THIS FILE)
1) Restore Home pull-to-refresh (Home panel only).
2) Ensure Home + Add + core nav buttons are enabled (no accidental disabled state).
3) Remove UI-side panel switching (panels.js is authority) — UI calls VTPanels only.
4) Service-worker registration remains in index.html (not here).
5) No chart rendering logic here (chart.js owns it).

NOT IN THIS FILE (next passes)
- Band opacity (+35%) and legend (chart.js).
- Dataset pan clamping + default current 7 days + zoom 1–14 days (chart.js).
- Swipe detection (gestures.js).
- Add save/delete persistence (add.js/storage.js later).

Schema position:
File 10 of 10

Previous file:
File 9 — js/panels.js
*/

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function safeEnable(id) {
    const el = $(id);
    if (!el) return;
    try { el.disabled = false; } catch (_) {}
  }

  /* =========================
     Pull-to-refresh (Home)
     ========================= */

  function initPullToRefresh() {
    const home = $("panelHome");
    const homeCard = $("homeCard");
    const pullIndicator = $("pullIndicator");
    if (!home || !pullIndicator) return;

    let startY = null;
    let armed = false;

    function canStart() {
      // Only when Home is active
      if (!home.classList.contains("active")) return false;

      // Only when the scroll container is at top
      // Prefer homeCard if it scrolls; otherwise allow.
      try {
        if (homeCard && homeCard.scrollTop > 0) return false;
      } catch (_) {}

      return true;
    }

    home.addEventListener("touchstart", (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      if (!canStart()) return;

      startY = e.touches[0].clientY;
      armed = false;
    }, { passive: true });

    home.addEventListener("touchmove", (e) => {
      if (startY == null) return;
      if (!e.touches || e.touches.length !== 1) return;

      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) return;

      // Visual pull indicator
      const h = Math.min(56, Math.floor(dy / 2));
      pullIndicator.style.height = h + "px";
      armed = (h >= 38);
    }, { passive: true });

    home.addEventListener("touchend", () => {
      if (startY == null) return;

      const fire = armed;
      startY = null;
      armed = false;

      pullIndicator.style.height = "0px";

      if (fire) {
        // Refresh records + chart if possible; fallback to reload.
        (async () => {
          try {
            await window.VTStore?.refresh?.();
          } catch (_) {}

          // If we are on home, do nothing else.
          // If charts is later opened it will re-render via VTPanels event.
          try {
            // Optional: if charts already active somehow, redraw
            if ($("panelCharts")?.classList.contains("active")) {
              window.VTChart?.onShow?.();
            }
          } catch (_) {}

          // If store/storage not present, hard reload to be safe
          if (!window.VTStore || typeof window.VTStore.refresh !== "function") {
            try { location.reload(); } catch (_) {}
          }
        })();
      }
    }, { passive: true });
  }

  /* =========================
     Button sanity / enablement
     ========================= */

  function initButtonSanity() {
    // Core navigation
    safeEnable("btnGoAdd");
    safeEnable("btnGoCharts");
    safeEnable("btnGoLog");

    // Home from panels
    safeEnable("btnHomeFromCharts");
    safeEnable("btnHomeFromLog");
    safeEnable("btnHomeFromAdd");

    // Settings
    safeEnable("btnSettings");
    safeEnable("btnSettingsFromCharts");
    safeEnable("btnSettingsFromLog");
    safeEnable("btnBackFromSettings");

    // Utility buttons (do not force enable install if app logic disables it)
    // We only ensure we don't accidentally keep it disabled after install prompt.
    // btnInstall is managed by index.html; do not override disabled state here.
  }

  /* =========================
     Panel change events (optional)
     ========================= */

  function initPanelChangedListener() {
    // This is UI-only: keep top notes accurate if needed.
    document.addEventListener("vt:panelChanged", (e) => {
      const active = e?.detail?.active;
      if (!active) return;

      // When returning Home, reset pull indicator if needed
      if (active === "home") {
        const pullIndicator = $("pullIndicator");
        if (pullIndicator) pullIndicator.style.height = "0px";
      }
    });
  }

  /* =========================
     Init
     ========================= */

  function init() {
    initButtonSanity();
    initPullToRefresh();
    initPanelChangedListener();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/ui.js
App Version: v2.024
Base: v2.023d
Touched in v2.024: js/ui.js
Fixes:
- Home pull-to-refresh restored (Home-only)
- Button enablement sanity (prevents stuck disabled buttons)
- UI delegates panel changes to panels.js (no competing router)
Next step (new pass list, chart-focused):
- js/gestures.js (verify swipe starts; must call VTPanels.next/prev)
- js/chart.js (bands opacity +35%, legend, labels, clamp pan to dataset,
  default viewport = latest 7 days, zoom min 1 day, max 14 days)
*/
