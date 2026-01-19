/* File: js/panels.js */
/*
Vitals Tracker — Panels Router (Home / Charts / Log) + Settings Access
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023d
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
- Owns which panels are in the swipe rotation (carousel).
- Settings is NOT in the rotation. Settings is only opened via gear buttons.
- Emits vt:panelChanged events so js/app.js can run lifecycle hooks.
- Provides a single global API: VTPanels

v2.023d — Change Log (THIS FILE ONLY)
1) Removes Settings from rotation (rotation is: home -> charts -> log -> home).
2) Settings becomes an overlay panel reachable ONLY via gear buttons.
3) Back from Settings returns to the last non-settings panel.
4) Fires document event "vt:panelChanged" {active: <panelName>} on every transition.
5) Defensive: if panels missing, no throw; stays stable.

ANTI-DRIFT RULES
- Do NOT implement swipe detection here (that is js/gestures.js).
- Do NOT implement chart rendering here (that is js/chart.js).
- Do NOT hard-code version strings here (js/version.js wins).

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
    charts: "panelCharts",
    log: "panelLog",
    settings: "panelSettings"
  });

  // Rotation excludes settings by design.
  const ROTATION = Object.freeze(["home", "charts", "log"]);

  const state = {
    active: "home",
    lastMain: "home"
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

  function setActive(name) {
    if (!name || !PANEL_IDS[name]) return;

    // Toggle DOM
    const keys = Object.keys(PANEL_IDS);
    for (const k of keys) {
      const el = getPanelEl(k);
      if (!el) continue;
      el.classList.toggle("active", k === name);
    }

    // Track last non-settings (main) panel
    if (name !== "settings") state.lastMain = name;

    state.active = name;
    emitPanelChanged(name);
  }

  function getActive() {
    return state.active;
  }

  function goHome() { setActive("home"); }
  function goCharts() { setActive("charts"); }
  function goLog() { setActive("log"); }

  function openSettings() { setActive("settings"); }
  function closeSettings() { setActive(state.lastMain || "home"); }

  function next() {
    const i = ROTATION.indexOf(state.active);
    if (i === -1) {
      // If currently in settings, advance relative to last main
      const j = ROTATION.indexOf(state.lastMain);
      setActive(ROTATION[(Math.max(0, j) + 1) % ROTATION.length]);
      return;
    }
    setActive(ROTATION[(i + 1) % ROTATION.length]);
  }

  function prev() {
    const i = ROTATION.indexOf(state.active);
    if (i === -1) {
      const j = ROTATION.indexOf(state.lastMain);
      setActive(ROTATION[(Math.max(0, j) - 1 + ROTATION.length) % ROTATION.length]);
      return;
    }
    setActive(ROTATION[(i - 1 + ROTATION.length) % ROTATION.length]);
  }

  function bindClick(id, fn) {
    const el = $(id);
    if (!el) return;
    el.addEventListener("click", function (e) {
      try { fn(e); } catch (_) {}
    });
  }

  function initButtons() {
    // Home main nav
    bindClick("btnGoCharts", goCharts);
    bindClick("btnGoLog", goLog);

    // Charts / Log home buttons
    bindClick("btnHomeFromCharts", goHome);
    bindClick("btnHomeFromLog", goHome);

    // Settings open (gear)
    bindClick("btnSettings", openSettings);
    bindClick("btnSettingsFromCharts", openSettings);
    bindClick("btnSettingsFromLog", openSettings);

    // Settings back
    bindClick("btnBackFromSettings", closeSettings);
  }

  function init() {
    initButtons();

    // Ensure active panel reflects DOM state at load:
    // Prefer any panel already marked .active; otherwise default to home.
    let found = null;
    for (const name of Object.keys(PANEL_IDS)) {
      const el = getPanelEl(name);
      if (el && el.classList.contains("active")) { found = name; break; }
    }
    setActive(found || "home");
  }

  // Public API
  window.VTPanels = Object.freeze({
    ROTATION,
    init,
    setActive,
    getActive,
    next,
    prev,
    goHome,
    goCharts,
    goLog,
    openSettings,
    closeSettings
  });

  // Auto-init on DOM ready (safe + idempotent)
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
App Version: v2.023d
Base: v2.021
Touched in v2.023d: js/panels.js (remove Settings from rotation; event wiring)
Rotation: home <-> charts <-> log (settings excluded)
Next planned file: js/ui.js (File 10 of 10)
*/
