/* File: js/panels.js */
/*
Vitals Tracker — Panels Router (AUTHORITATIVE)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.024
Base: v2.023d
Date: 2026-01-18

CURRENT FIX SCOPE
- Restore reliable panel switching for:
  home <-> charts <-> log
- Settings is EXCLUDED from swipe rotation (gear only).
- Add panel (if present) is ISOLATED (no swipe, Home button must work).
- Single source of truth for which panel is active.

FILE ROLE (LOCKED)
- Owns panel activation and DOM .active toggling.
- Owns rotation order.
- Emits panel-change events for other modules (chart, ui).

ANTI-DRIFT RULES
- Do NOT implement swipe detection here (gestures.js owns that).
- Do NOT implement chart rendering here (chart.js owns that).
- Do NOT hard-code version strings elsewhere (version.js wins).

Schema position:
File 9 of 10

Previous file:
File 8 — js/gestures.js

Next file:
File 10 — js/ui.js
*/

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  /* ========= PANEL CONTRACT ========= */

  const PANEL_IDS = Object.freeze({
    home: "panelHome",
    charts: "panelCharts",
    log: "panelLog",
    add: "panelAdd",
    settings: "panelSettings",
  });

  // Swipe rotation order (settings + add excluded)
  const ROTATION = Object.freeze(["home", "charts", "log"]);

  const state = {
    active: "home",
    lastMain: "home",
  };

  /* ========= INTERNAL HELPERS ========= */

  function getPanelEl(name) {
    const id = PANEL_IDS[name];
    return id ? $(id) : null;
  }

  function emitChange(name) {
    try {
      document.dispatchEvent(
        new CustomEvent("vt:panelChanged", { detail: { active: name } })
      );
    } catch (_) {}
  }

  function applyDOM(name) {
    for (const key of Object.keys(PANEL_IDS)) {
      const el = getPanelEl(key);
      if (!el) continue;
      el.classList.toggle("active", key === name);
    }
  }

  /* ========= CORE API ========= */

  function setActive(name) {
    if (!PANEL_IDS[name]) return;

    applyDOM(name);

    state.active = name;

    if (name !== "settings" && name !== "add") {
      state.lastMain = name;
    }

    emitChange(name);

    // Lifecycle hook: charts render on entry
    if (name === "charts") {
      try { window.VTChart?.onShow?.(); } catch (_) {}
    }
  }

  function getActive() {
    return state.active;
  }

  /* ========= ROTATION ========= */

  function next() {
    if (!ROTATION.includes(state.active)) return;

    const i = ROTATION.indexOf(state.active);
    setActive(ROTATION[(i + 1) % ROTATION.length]);
  }

  function prev() {
    if (!ROTATION.includes(state.active)) return;

    const i = ROTATION.indexOf(state.active);
    setActive(ROTATION[(i - 1 + ROTATION.length) % ROTATION.length]);
  }

  /* ========= DIRECT NAV ========= */

  function goHome() { setActive("home"); }
  function goCharts() { setActive("charts"); }
  function goLog() { setActive("log"); }

  function openSettings() { setActive("settings"); }
  function closeSettings() { setActive(state.lastMain || "home"); }

  function openAdd() { setActive("add"); }

  /* ========= BUTTON BINDING ========= */

  function bind(id, fn) {
    const el = $(id);
    if (!el) return;
    el.addEventListener("click", () => {
      try { fn(); } catch (_) {}
    });
  }

  function bindButtons() {
    // Home
    bind("btnGoCharts", goCharts);
    bind("btnGoLog", goLog);
    bind("btnGoAdd", openAdd);

    // Return to Home
    bind("btnHomeFromCharts", goHome);
    bind("btnHomeFromLog", goHome);
    bind("btnHomeFromAdd", goHome);

    // Settings
    bind("btnSettings", openSettings);
    bind("btnSettingsFromCharts", openSettings);
    bind("btnSettingsFromLog", openSettings);
    bind("btnBackFromSettings", closeSettings);
  }

  /* ========= INIT ========= */

  function detectInitialPanel() {
    for (const name of Object.keys(PANEL_IDS)) {
      const el = getPanelEl(name);
      if (el && el.classList.contains("active")) return name;
    }
    return "home";
  }

  function init() {
    bindButtons();
    setActive(detectInitialPanel());
  }

  /* ========= EXPORT ========= */

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
    closeSettings,
    openAdd,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/panels.js
App Version: v2.024
Base: v2.023d
Touched in v2.024: js/panels.js
Fixes:
- Swipe target stability
- Home button routing
- Settings isolation
- Add isolation
Next planned file:
File 10 — js/ui.js
*/
