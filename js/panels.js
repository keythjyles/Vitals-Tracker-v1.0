/* File: js/panels.js */
/*
Vitals Tracker — Panels Router (Minimal + Stable)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.025f
Base: v2.021
Date: 2026-01-18

Schema position:
File 9 of 10

Former file:
File 8 — js/state.js

Next file:
File 10 — js/ui.js

FILE ROLE (LOCKED)
- Owns WHICH panel is visible.
- Emits lifecycle events ONLY.
- NO swipe logic.
- NO gesture logic.
- Settings is NOT part of rotation.

v2.025f — Change Log (THIS FILE ONLY)
1) Removes all swipe / rotation complexity.
2) Explicit panel switching only.
3) Settings accessible ONLY via gear.
4) Emits `vt:panelChanged` on every change.
5) Defensive: missing elements do not throw.

ANTI-DRIFT RULES
- Do NOT implement swipe here.
- Do NOT draw charts here.
- Do NOT read or write storage here.
*/

(function () {
  "use strict";

  const VERSION = "v2.025f";

  const PANEL_IDS = Object.freeze({
    home: "panelHome",
    add: "panelAdd",
    charts: "panelCharts",
    log: "panelLog",
    settings: "panelSettings"
  });

  let active = "home";
  let lastMain = "home";

  function $(id) {
    return document.getElementById(id);
  }

  function emit(name) {
    try {
      document.dispatchEvent(
        new CustomEvent("vt:panelChanged", {
          detail: { active: name }
        })
      );
    } catch (_) {}
  }

  function hideAll() {
    Object.values(PANEL_IDS).forEach(id => {
      const el = $(id);
      if (el) el.classList.remove("active");
    });
  }

  function show(name) {
    if (!PANEL_IDS[name]) return;

    hideAll();

    const el = $(PANEL_IDS[name]);
    if (el) el.classList.add("active");

    active = name;

    if (name !== "settings") {
      lastMain = name;
    }

    emit(name);
  }

  function openSettings() {
    show("settings");
  }

  function closeSettings() {
    show(lastMain || "home");
  }

  /* ===== Button Wiring ===== */

  function bind(id, fn) {
    const el = $(id);
    if (!el) return;
    el.addEventListener("click", function (e) {
      e.preventDefault();
      try { fn(); } catch (_) {}
    });
  }

  function initButtons() {
    // Home navigation
    bind("btnGoAdd", () => show("add"));
    bind("btnGoCharts", () => show("charts"));
    bind("btnGoLog", () => show("log"));

    // Home buttons from other panels
    bind("btnHomeFromAdd", () => show("home"));
    bind("btnHomeFromCharts", () => show("home"));
    bind("btnHomeFromLog", () => show("home"));

    // Settings (gear only)
    bind("btnSettings", openSettings);
    bind("btnSettingsFromCharts", openSettings);
    bind("btnSettingsFromLog", openSettings);

    // Settings back
    bind("btnBackFromSettings", closeSettings);
  }

  function init() {
    initButtons();

    // Determine initial active panel from DOM
    let found = null;
    for (const name of Object.keys(PANEL_IDS)) {
      const el = $(PANEL_IDS[name]);
      if (el && el.classList.contains("active")) {
        found = name;
        break;
      }
    }

    show(found || "home");
  }

  // Public API (small, explicit)
  window.VTPanels = Object.freeze({
    VERSION,
    show,
    openSettings,
    closeSettings,
    getActive: () => active
  });

  // Auto-init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
