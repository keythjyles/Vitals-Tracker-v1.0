/* File: js/panels.js */
/*
Vitals Tracker — Panels Router (Home / Charts / Log) + Settings Access
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: (authority) js/version.js
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns which panels are in the swipe rotation (carousel).
- Settings is NOT in the rotation. Settings is only opened via gear buttons.
- Fires "vt:panelChanged" {active:<panelName>} on transitions.
- Provides global API: VTPanels

ANTI-DRIFT RULES
- Do NOT implement swipe detection here (gestures.js owns that).
- Do NOT implement chart rendering here (chart.js owns that).
- Do NOT hard-code version strings here (version.js wins).

Schema position:
File 9 of 10
Previous file: File 8 — js/gestures.js
Next file: File 10 — js/ui.js
*/

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  const PANEL_IDS = Object.freeze({
    home: "panelHome",
    add: "panelAdd",
    charts: "panelCharts",
    log: "panelLog",
    settings: "panelSettings"
  });

  const ROTATION = Object.freeze(["home","charts","log"]); // settings excluded

  const state = { active: "home", lastMain: "home" };

  function getPanelEl(name) {
    const id = PANEL_IDS[name];
    return id ? $(id) : null;
  }

  function emitPanelChanged(name) {
    try {
      document.dispatchEvent(new CustomEvent("vt:panelChanged", { detail: { active: name } }));
    } catch (_) {}
  }

  function setActive(name) {
    if (!name || !PANEL_IDS[name]) return;

    // Toggle DOM visibility
    for (const key of Object.keys(PANEL_IDS)) {
      const el = getPanelEl(key);
      if (!el) continue;
      el.classList.toggle("active", key === name);
    }

    // Track last main (non-settings) for back behavior
    if (name !== "settings") state.lastMain = name;

    state.active = name;
    emitPanelChanged(name);

    // Lifecycle hook: charts render on entry
    if (name === "charts") {
      try { window.VTChart?.onShow?.(); } catch (_) {}
    }
  }

  function getActive() { return state.active; }

  function goHome() { setActive("home"); }
  function goCharts() { setActive("charts"); }
  function goLog() { setActive("log"); }

  function openSettings() { setActive("settings"); }
  function closeSettings() { setActive(state.lastMain || "home"); }

  function next() {
    const i = ROTATION.indexOf(state.active);
    if (i === -1) {
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
    // Idempotency: do not bind twice
    const key = `vtBound_${id}`;
    if (el.dataset && el.dataset[key] === "1") return;
    if (el.dataset) el.dataset[key] = "1";
    el.addEventListener("click", function (e) { try { fn(e); } catch (_) {} });
  }

  function initButtons() {
    bindClick("btnGoCharts", goCharts);
    bindClick("btnGoLog", goLog);

    bindClick("btnHomeFromCharts", goHome);
    bindClick("btnHomeFromLog", goHome);

    bindClick("btnSettings", openSettings);
    bindClick("btnSettingsFromCharts", openSettings);
    bindClick("btnSettingsFromLog", openSettings);

    bindClick("btnBackFromSettings", closeSettings);
  }

  function init() {
    initButtons();

    // Respect whatever .active is already set in DOM
    let found = null;
    for (const name of Object.keys(PANEL_IDS)) {
      const el = getPanelEl(name);
      if (el && el.classList.contains("active")) { found = name; break; }
    }
    setActive(found || "home");
  }

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

  // Auto-init (safe)
  function onReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") setTimeout(fn, 0);
    else document.addEventListener("DOMContentLoaded", fn);
  }
  onReady(function () { try { window.VTPanels.init(); } catch (_) {} });

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/panels.js
App Version: (authority) js/version.js
Base: v2.021
Touched in: panels anti-drift + idempotent binding
Rotation: home <-> charts <-> log (settings excluded)
Next planned file: js/ui.js (File 10 of 10)
*/
