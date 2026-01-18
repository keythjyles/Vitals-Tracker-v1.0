/* File: js/state.js */
/*
Vitals Tracker — State (View + Interaction State Authority)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023b
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Holds transient application state (NO persistence).
- Coordinates active panel, chart window, and view-related flags.
- Acts as the single shared state object for app.js, chart.js, panels.js, ui.js.

v2.023b — Change Log (THIS FILE ONLY)
1) Introduces window.VTState as a plain, inspectable state container.
2) Tracks:
   - activePanel
   - lastNonSettingsPanel
   - chart window (days, center time)
   - flags for first-load and chart-dirty
3) Provides setters/getters with no side effects.
4) Zero DOM access. Zero storage access.

ANTI-DRIFT RULES
- Do NOT read or write localStorage/IndexedDB here.
- Do NOT render UI here.
- Do NOT draw charts here.
- Do NOT attach event listeners here.

Schema position:
File 6 of 10

Previous file:
File 5 — js/store.js

Next file:
File 7 — js/chart.js
*/

(function () {
  "use strict";

  const VERSION = "v2.023b";

  const DEFAULTS = {
    activePanel: "home",          // home | charts | log | settings
    lastNonSettings: "home",

    // Chart view window
    chartWindowDays: 7,            // visible days
    chartMinDays: 1,
    chartMaxDays: 14,
    chartCenterMs: null,           // timestamp center for window

    // Flags
    firstLoad: true,
    chartDirty: true,              // chart needs redraw
  };

  // Internal mutable state (never expose directly)
  const _state = { ...DEFAULTS };

  /* ===== Panel State ===== */

  function setActivePanel(panel) {
    if (!panel) return;
    _state.activePanel = panel;
    if (panel !== "settings") {
      _state.lastNonSettings = panel;
    }
  }

  function getActivePanel() {
    return _state.activePanel;
  }

  function getLastNonSettings() {
    return _state.lastNonSettings;
  }

  /* ===== Chart Window State ===== */

  function setChartWindowDays(days) {
    if (!Number.isFinite(days)) return;
    _state.chartWindowDays = Math.max(
      _state.chartMinDays,
      Math.min(_state.chartMaxDays, Math.floor(days))
    );
    _state.chartDirty = true;
  }

  function getChartWindowDays() {
    return _state.chartWindowDays;
  }

  function setChartCenterMs(ms) {
    if (!Number.isFinite(ms)) return;
    _state.chartCenterMs = ms;
    _state.chartDirty = true;
  }

  function getChartCenterMs() {
    return _state.chartCenterMs;
  }

  function markChartClean() {
    _state.chartDirty = false;
  }

  function isChartDirty() {
    return _state.chartDirty;
  }

  /* ===== Lifecycle Flags ===== */

  function isFirstLoad() {
    return _state.firstLoad;
  }

  function clearFirstLoad() {
    _state.firstLoad = false;
  }

  /* ===== Reset ===== */

  function reset() {
    for (const k of Object.keys(DEFAULTS)) {
      _state[k] = DEFAULTS[k];
    }
  }

  /* ===== Debug / Inspection ===== */

  function snapshot() {
    return { ..._state, version: VERSION };
  }

  window.VTState = {
    VERSION,

    // panel
    setActivePanel,
    getActivePanel,
    getLastNonSettings,

    // chart window
    setChartWindowDays,
    getChartWindowDays,
    setChartCenterMs,
    getChartCenterMs,
    isChartDirty,
    markChartClean,

    // lifecycle
    isFirstLoad,
    clearFirstLoad,

    // maintenance
    reset,
    snapshot,
  };
})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/state.js
App Version: v2.023b
Base: v2.021
Touched in v2.023b: js/state.js
Schema order: File 6 of 10
Next planned file: js/chart.js (File 7)
*/
