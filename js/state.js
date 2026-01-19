/* File: js/state.js */
/*
Vitals Tracker — View + Lifecycle State Authority
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.025f
Base: v2.021
Date: 2026-01-18

Schema position:
File 8 of 10

Former file:
File 7 — js/chart.js

Next file:
File 9 — js/panels.js

FILE ROLE (LOCKED)
- Holds transient UI + lifecycle state ONLY.
- Bridges panel activation → chart lifecycle.
- Owns no rendering, no gestures, no storage.

v2.025f — Change Log (THIS FILE ONLY)
1) Restores panel lifecycle awareness.
2) When Charts becomes active:
   - Calls VTChart.onShow()
   - Clears loading state
3) Tracks active panel + last non-settings panel.
4) Zero DOM rendering.
5) Zero chart drawing.
6) Zero swipe logic.

ANTI-DRIFT RULES
- Do NOT draw charts here.
- Do NOT attach gesture listeners here.
- Do NOT manipulate canvas.
- Do NOT implement panel rotation here.
*/

(function () {
  "use strict";

  const VERSION = "v2.025f";

  const _state = {
    activePanel: "home",
    lastNonSettings: "home",
    firstLoad: true
  };

  function setActivePanel(name) {
    if (!name) return;

    _state.activePanel = name;

    if (name !== "settings") {
      _state.lastNonSettings = name;
    }

    // === Chart lifecycle hook ===
    if (name === "charts") {
      try {
        if (window.VTChart && typeof window.VTChart.onShow === "function") {
          window.VTChart.onShow();
        }
      } catch (_) {}
    }
  }

  function getActivePanel() {
    return _state.activePanel;
  }

  function getLastNonSettings() {
    return _state.lastNonSettings;
  }

  function isFirstLoad() {
    return _state.firstLoad;
  }

  function clearFirstLoad() {
    _state.firstLoad = false;
  }

  function snapshot() {
    return {
      version: VERSION,
      activePanel: _state.activePanel,
      lastNonSettings: _state.lastNonSettings,
      firstLoad: _state.firstLoad
    };
  }

  // === Listen for panel changes emitted by panels.js ===
  document.addEventListener("vt:panelChanged", function (e) {
    try {
      const panel = e?.detail?.active;
      if (panel) {
        setActivePanel(panel);
      }
    } catch (_) {}
  });

  // Expose read-only API
  window.VTState = Object.freeze({
    VERSION,
    setActivePanel,
    getActivePanel,
    getLastNonSettings,
    isFirstLoad,
    clearFirstLoad,
    snapshot
  });

})();
