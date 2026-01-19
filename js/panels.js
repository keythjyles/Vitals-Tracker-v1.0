/* File: js/panels.js */
/*
Vitals Tracker — Panels Router (Home / Add / Charts / Log) + Settings Access
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023g
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

SCOPE (THIS MOMENT)
- Make navigation deterministic and consistent:
  - Core panels in swipe order: Home ↔ Add ↔ Charts ↔ Log
  - Settings is NOT in swipe rotation (gear-only).
- Ensure Home buttons route correctly (including from Add).
- Ensure Charts panel triggers chart render on entry.
- Avoid drift: one place owns panel activation: VTPanels.setActive().

FILE ROLE (LOCKED)
- Owns which panels are in the swipe rotation (carousel).
- Settings is EXCLUDED from swipe rotation. Settings is opened via gear buttons.
- Provides a single global API: window.VTPanels
- Emits document event "vt:panelChanged" {active:<panel>} on every transition.

v2.023g — Change Log (THIS FILE ONLY)
1) Restores Add panel into rotation (home/add/charts/log).
2) Settings remains gear-only (excluded from rotation).
3) Adds deterministic button bindings:
   - Home screen: Add/Charts/Log buttons
   - Add screen: Home button + (optional) back-to-home
   - Charts/Log: Home buttons
   - Gears: open settings from all panels
   - Settings: back returns to last non-settings panel
4) Ensures entering "charts" calls VTChart.onShow() once per entry.

ANTI-DRIFT RULES
- Do NOT implement swipe detection here (js/gestures.js owns swipe).
- Do NOT implement chart drawing here (js/chart.js owns chart).
- Do NOT hard-code version strings elsewhere (js/version.js wins).

Schema position:
File 9 of 10

Previous file:
File 8 — js/gestures.js

Next file:
File 10 — js/ui.js
*/

(function () {
  "use strict";

  const PANEL_IDS = Object.freeze({
    home: "panelHome",
    add: "panelAdd",
    charts: "panelCharts",
    log: "panelLog",
    settings: "panelSettings"
  });

  // Swipe rotation excludes settings by design.
  const ROTATION = Object.freeze(["home", "add", "charts", "log"]);

  const state = {
    active: "home",
    lastNonSettings: "home"
  };

  function $(id) { return document.getElementById(id); }

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

  function callChartOnShowIfEntering(name, prev) {
    if (name !== "charts") return;
    if (prev === "charts") return;
    try {
      if (window.VTChart && typeof window.VTChart.onShow === "function") {
        window.VTChart.onShow();
      }
    } catch (_) {}
  }

  function setActive(name) {
    if (!name || !PANEL_IDS[name]) return;

    const prev = state.active;

    // Toggle DOM visibility
    for (const k of Object.keys(PANEL_IDS)) {
      const el = getPanelEl(k);
      if (!el) continue;
      el.classList.toggle("active", k === name);
    }

    // Track last non-settings panel for return behavior
    if (name !== "settings") state.lastNonSettings = name;

    state.active = name;

    callChartOnShowIfEntering(name, prev);
    emitPanelChanged(name);
  }

  function getActive() {
    return state.active;
  }

  function next() {
    const a = state.active;
    if (a === "settings") return; // gear-only

    const i = ROTATION.indexOf(a);
    if (i < 0) return;
    const j = i + 1;
    if (j >= ROTATION.length) return; // no wrap
    setActive(ROTATION[j]);
  }

  function prev() {
    const a = state.active;
    if (a === "settings") return;

    const i = ROTATION.indexOf(a);
    if (i < 0) return;
    const j = i - 1;
    if (j < 0) return; // no wrap
    setActive(ROTATION[j]);
  }

  function openSettings() {
    setActive("settings");
  }

  function closeSettings() {
    setActive(state.lastNonSettings || "home");
  }

  function bindClick(id, fn) {
    const el = $(id);
    if (!el) return;
    // Avoid double-binding if multiple modules init
    if (el.dataset && el.dataset.vtBoundPanels === "1") return;
    if (el.dataset) el.dataset.vtBoundPanels = "1";
    el.addEventListener("click", function (e) {
      try { fn(e); } catch (_) {}
    });
  }

  function initButtons() {
    // Home → Add/Charts/Log
    bindClick("btnGoAdd", () => setActive("add"));
    bindClick("btnGoCharts", () => setActive("charts"));
    bindClick("btnGoLog", () => setActive("log"));

    // Charts / Log → Home
    bindClick("btnHomeFromCharts", () => setActive("home"));
    bindClick("btnHomeFromLog", () => setActive("home"));

    // Add → Home (support both common IDs)
    bindClick("btnHomeFromAdd", () => setActive("home"));
    bindClick("btnBackFromAdd", () => setActive("home"));
    bindClick("btnCancelAdd", () => setActive("home"));

    // Settings gear open (all panels)
    bindClick("btnSettings", openSettings);
    bindClick("btnSettingsFromAdd", openSettings);
    bindClick("btnSettingsFromCharts", openSettings);
    bindClick("btnSettingsFromLog", openSettings);

    // Settings back
    bindClick("btnBackFromSettings", closeSettings);
  }

  function detectInitialActive() {
    // Prefer any panel already marked .active; else home.
    let found = null;
    for (const name of Object.keys(PANEL_IDS)) {
      const el = getPanelEl(name);
      if (el && el.classList.contains("active")) { found = name; break; }
    }
    return found || "home";
  }

  function init() {
    initButtons();
    const initial = detectInitialActive();
    setActive(initial);
  }

  // Public API
  window.VTPanels = Object.freeze({
    ROTATION,
    init,
    setActive,
    getActive,
    next,
    prev,
    openSettings,
    closeSettings
  });

  // Auto-init on DOM ready (safe + idempotent)
  function onReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    }
  }

  onReady(function () {
    try { window.VTPanels.init(); } catch (_) {}
  });

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/panels.js
App Version: v2.023g
Base: v2.021
Touched in v2.023g: js/panels.js (Add restored to rotation; deterministic nav; charts onShow hook)
Rotation: home <-> add <-> charts <-> log (no wrap). Settings gear-only.
Next planned file: js/ui.js (File 10 of 10)
*/
