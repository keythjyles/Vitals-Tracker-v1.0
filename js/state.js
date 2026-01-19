/* File: js/state.js */
/*
Vitals Tracker — State (View + Interaction State Authority)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: (authority) js/version.js
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Holds transient application state (NO persistence).
- Coordinates active panel, chart window, and view-related flags.
- Acts as shared state for app.js, chart.js, panels.js, ui.js.

ANTI-DRIFT RULES
- Do NOT read/write storage here.
- Do NOT render UI here.
- Do NOT draw charts here.
- Do NOT attach event listeners here.

Schema position:
File 6 of 10
Previous file: File 5 — js/store.js
Next file: File 7 — js/chart.js
*/

(function () {
  "use strict";

  function vStr(){
    try{ return window.VTVersion?.getVersionString?.() || "v?.???"; }catch(_){ return "v?.???"; }
  }

  const DEFAULTS = {
    activePanel: "home",           // home | add | charts | log | settings
    lastNonSettings: "home",

    // Chart view window
    chartWindowDays: 7,
    chartMinDays: 1,
    chartMaxDays: 14,
    chartCenterMs: null,

    // Flags
    firstLoad: true,
    chartDirty: true,
  };

  const _state = { ...DEFAULTS };

  /* ===== Panel State ===== */
  function setActivePanel(panel) {
    if (!panel) return;
    _state.activePanel = panel;
    if (panel !== "settings") _state.lastNonSettings = panel;
  }
  function getActivePanel() { return _state.activePanel; }
  function getLastNonSettings() { return _state.lastNonSettings; }

  /* ===== Chart Window State ===== */
  function setChartWindowDays(days) {
    if (!Number.isFinite(days)) return;
    _state.chartWindowDays = Math.max(
      _state.chartMinDays,
      Math.min(_state.chartMaxDays, Math.floor(days))
    );
    _state.chartDirty = true;
  }
  function getChartWindowDays() { return _state.chartWindowDays; }

  function setChartCenterMs(ms) {
    if (!Number.isFinite(ms)) return;
    _state.chartCenterMs = ms;
    _state.chartDirty = true;
  }
  function getChartCenterMs() { return _state.chartCenterMs; }

  function markChartClean() { _state.chartDirty = false; }
  function isChartDirty() { return _state.chartDirty; }

  /* ===== Lifecycle Flags ===== */
  function isFirstLoad() { return _state.firstLoad; }
  function clearFirstLoad() { _state.firstLoad = false; }

  /* ===== Reset ===== */
  function reset() {
    for (const k of Object.keys(DEFAULTS)) _state[k] = DEFAULTS[k];
  }

  /* ===== Debug / Inspection ===== */
  function snapshot() {
    return { ..._state, appVersion: vStr() };
  }

  window.VTState = Object.freeze({
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
  });

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/state.js
App Version: (authority) js/version.js
Base: v2.021
Touched in: state anti-drift alignment
Schema order: File 6 of 10
Next planned file: js/chart.js (File 7)
*/
