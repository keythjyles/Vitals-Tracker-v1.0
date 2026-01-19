/* File: js/ui.js */
/*
Vitals Tracker — UI Glue + Home UX
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.025g
Base: v2.021
Date: 2026-01-18

Schema position:
File 10 of 10

Former file:
File 9 — js/panels.js

Next file:
NONE (end of current stabilization pass)

FILE ROLE (LOCKED)
- Home screen UX only.
- Pull-to-refresh on Home ONLY.
- Button sizing normalization (Home).
- Passive listeners for panel change events.

v2.025g — Change Log (THIS FILE ONLY)
1) Restores pull-to-refresh on Home panel.
2) Normalizes Home action buttons to identical size.
3) Listens for `vt:panelChanged` events to reset UI state.
4) Zero chart logic.
5) Zero swipe logic.

ANTI-DRIFT RULES
- Do NOT implement panel routing here.
- Do NOT implement swipe gestures here.
- Do NOT touch chart rendering here.
*/

(function () {
  "use strict";

  const VERSION = "v2.025g";

  function $(id) {
    return document.getElementById(id);
  }

  /* ============================
     Button Size Normalization
     ============================ */

  function normalizeHomeButtons() {
    const ids = [
      "btnGoAdd",
      "btnGoCharts",
      "btnGoLog"
    ];

    const btns = ids.map(id => $(id)).filter(Boolean);
    if (!btns.length) return;

    let maxW = 0;
    let maxH = 0;

    btns.forEach(btn => {
      const r = btn.getBoundingClientRect();
      maxW = Math.max(maxW, r.width);
      maxH = Math.max(maxH, r.height);
    });

    btns.forEach(btn => {
      btn.style.minWidth = Math.ceil(maxW) + "px";
      btn.style.minHeight = Math.ceil(maxH) + "px";
    });
  }

  /* ============================
     Pull-To-Refresh (Home Only)
     ============================ */

  function initPullToRefresh() {
    const home = $("panelHome");
    const indicator = $("pullIndicator");
    const card = $("homeCard");

    if (!home || !indicator || !card) return;

    let startY = null;
    let armed = false;

    home.addEventListener("touchstart", (e) => {
      if (card.scrollTop !== 0) return;
      startY = e.touches[0].clientY;
      armed = false;
    }, { passive: true });

    home.addEventListener("touchmove", (e) => {
      if (startY == null) return;

      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) return;

      const h = Math.min(56, Math.floor(dy / 2));
      indicator.style.height = h + "px";
      armed = h >= 40;
    }, { passive: true });

    home.addEventListener("touchend", () => {
      if (startY == null) return;

      indicator.style.height = "0px";

      if (armed) {
        try {
          location.reload();
        } catch (_) {}
      }

      startY = null;
      armed = false;
    }, { passive: true });
  }

  /* ============================
     Panel Change Listener
     ============================ */

  function onPanelChanged(e) {
    const active = e?.detail?.active;

    if (active === "home") {
      normalizeHomeButtons();
    }
  }

  /* ============================
     Init
     ============================ */

  function init() {
    normalizeHomeButtons();
    initPullToRefresh();

    document.addEventListener("vt:panelChanged", onPanelChanged);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
