/* File: js/panels.js */
/*
Vitals Tracker — Panels Router (Home / Add / Charts / Log) + Settings Access
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: (authority) js/version.js
Base: v2.021
Date: 2026-01-18

CURRENT UPGRADE — FILE TOUCH ORDER (LOCKED)
1) index.html
2) js/version.js
3) js/app.js
4) js/storage.js
5) js/store.js
6) js/state.js
7) js/chart.js
8) js/gestures.js
9) js/panels.js   <-- THIS FILE
10) js/ui.js

FILE ROLE (LOCKED)
- Owns panel activation (which panel is "active") for core panels.
- Carousel/rotation order is ONLY: home -> charts -> log -> home.
- Settings is NOT in rotation. Settings is opened ONLY via gear buttons.
- Add panel is NOT in rotation. Add is opened ONLY via "Add Reading" button.
- Fires document event "vt:panelChanged" {active:<panel>} on every transition.
- Calls VTChart.onShow() whenever Charts becomes active (every time).

v2.025g — Change Log (THIS FILE ONLY)
1) Hard-stabilizes panel activation so there is exactly one .active panel at a time.
2) Ensures Charts always triggers VTChart.onShow() after activation.
3) Preserves Settings gear-only access and returns from Settings to last main panel.
4) Add panel supported (home-only access) but excluded from swipe rotation.

ANTI-DRIFT RULES
- Do NOT implement swipe detection here (that is js/gestures.js).
- Do NOT draw charts here (that is js/chart.js).
- Do NOT hard-code version strings here (js/version.js wins).

Schema position:
File 9 of 10

Former file:
File 8 — js/gestures.js

Next file:
File 10 — js/ui.js
*/

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  // Panel DOM ids (support current structure)
  const PANEL_IDS = Object.freeze({
    home: "panelHome",
    add: "panelAdd",
    charts: "panelCharts",
    log: "panelLog",
    settings: "panelSettings"
  });

  // Rotation excludes settings and add by design.
  const ROTATION = Object.freeze(["home", "charts", "log"]);

  const state = {
    active: "home",
    lastMain: "home"   // last non-settings, non-add panel
  };

  function getPanelEl(name) {
    const id = PANEL_IDS[name];
    return id ? $(id) : null;
  }

  function emitPanelChanged(name) {
    try {
      document.dispatchEvent(new CustomEvent("vt:panelChanged", {
        detail: { active: name }
      }));
    } catch (_) {}
  }

  function setOnlyActive(name) {
    // Toggle DOM: ensure at most one .active at any moment.
    for (const key of Object.keys(PANEL_IDS)) {
      const el = getPanelEl(key);
      if (!el) continue;
      el.classList.toggle("active", key === name);
    }
  }

  function callChartOnShow() {
    try {
      if (window.VTChart && typeof window.VTChart.onShow === "function") {
        // Run after DOM activation so canvas sizes correctly.
        setTimeout(function () {
          try { window.VTChart.onShow(); } catch (_) {}
        }, 0);
      }
    } catch (_) {}
  }

  function setActive(name) {
    if (!name || !PANEL_IDS[name]) return;

    // Maintain last main panel
    if (name !== "settings" && name !== "add") {
      state.lastMain = name;
    }

    state.active = name;

    // DOM activation
    setOnlyActive(name);

    // Notify
    emitPanelChanged(name);

    // Side-effects on specific panels
    if (name === "charts") callChartOnShow();

    // If a state module exists, keep it aligned (no dependency)
    try {
      if (window.VTState && typeof window.VTState.setActivePanel === "function") {
        window.VTState.setActivePanel(name);
      }
    } catch (_) {}
  }

  function getActive() {
    // Prefer DOM truth if possible
    try {
      for (const key of Object.keys(PANEL_IDS)) {
        const el = getPanelEl(key);
        if (el && el.classList.contains("active")) return key;
      }
    } catch (_) {}
    return state.active;
  }

  function goHome() { setActive("home"); }
  function goAdd() { setActive("add"); }
  function goCharts() { setActive("charts"); }
  function goLog() { setActive("log"); }

  function openSettings() { setActive("settings"); }
  function closeSettings() { setActive(state.lastMain || "home"); }

  function next() {
    const a = getActive();

    // No swipe rotation from settings or add
    if (a === "settings" || a === "add") return;

    const i = ROTATION.indexOf(a);
    if (i < 0) return;
    setActive(ROTATION[(i + 1) % ROTATION.length]);
  }

  function prev() {
    const a = getActive();

    if (a === "settings" || a === "add") return;

    const i = ROTATION.indexOf(a);
    if (i < 0) return;
    setActive(ROTATION[(i - 1 + ROTATION.length) % ROTATION.length]);
  }

  function bindClick(id, fn) {
    const el = $(id);
    if (!el) return;
    // bind once marker (prevents double binding on refresh)
    const key = `vtBound_${id}`;
    if (el.dataset && el.dataset[key] === "1") return;
    if (el.dataset) el.dataset[key] = "1";

    el.addEventListener("click", function (e) {
      try { fn(e); } catch (_) {}
    });
  }

  function initButtons() {
    // Home main nav
    bindClick("btnGoCharts", goCharts);
    bindClick("btnGoLog", goLog);
    bindClick("btnGoAdd", goAdd);

    // Charts / Log -> Home
    bindClick("btnHomeFromCharts", goHome);
    bindClick("btnHomeFromLog", goHome);

    // Add -> Home (if present)
    bindClick("btnHomeFromAdd", goHome);
    bindClick("btnCancelAdd", goHome);

    // Settings open (gear) and back
    bindClick("btnSettings", openSettings);
    bindClick("btnSettingsFromCharts", openSettings);
    bindClick("btnSettingsFromLog", openSettings);
    bindClick("btnBackFromSettings", closeSettings);
  }

  function initFromDOM() {
    // Determine which panel is active at load; default home.
    let found = null;
    for (const key of Object.keys(PANEL_IDS)) {
      const el = getPanelEl(key);
      if (el && el.classList.contains("active")) { found = key; break; }
    }
    setActive(found || "home");
  }

  function init() {
    initButtons();
    initFromDOM();
  }

  // Public API (stable surface)
  window.VTPanels = Object.freeze({
    ROTATION,
    init,
    setActive,
    getActive,
    next,
    prev,
    goHome,
    goAdd,
    goCharts,
    goLog,
    openSettings,
    closeSettings
  });

  // Auto-init on DOM ready (safe)
  function onReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  onReady(function () {
    try { window.VTPanels.init(); } catch (_) {}
  });

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/panels.js
App Version: (authority) js/version.js
Base: v2.021
Touched in: v2.025g (stabilize active panel + charts onShow + settings excluded from rotation)
Schema order: File 9 of 10
Next planned file: js/ui.js (File 10 of 10)
*/
