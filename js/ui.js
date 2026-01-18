/* File: js/ui.js */
/*
Vitals Tracker — UI Binder & Screen Text Controller
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023d
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns ALL non-chart, non-gesture UI wiring.
- Updates visible labels, notes, and status text.
- Bridges core state/version info into the DOM.
- MUST NOT implement business logic, storage, charts, or gestures.

This file exists so index.html stays declarative and readable.

v2.023d — Change Log (THIS FILE ONLY)
1) Centralizes version display using js/version.js if present.
2) Controls Home footer version + boot text.
3) Controls Charts top note text (date range placeholder).
4) Controls Log header/top note placeholder.
5) Ensures UI text updates never crash app if modules are missing.

ANTI-DRIFT RULES
- Do NOT draw charts here.
- Do NOT calculate data ranges here.
- Do NOT store data here.
- Text only. Wiring only.

Schema position:
File 10 of 10

Previous file:
File 9 — js/panels.js
*/

(function () {
  "use strict";

  const VERSION_FALLBACK = "v2.023d";

  /* ===== Safe DOM helpers ===== */
  function $(id){
    return document.getElementById(id);
  }

  function setText(id, text){
    const el = $(id);
    if (el) el.textContent = text;
  }

  /* ===== Version handling ===== */
  function resolveVersion(){
    try{
      if (window.VTVersion &&
          typeof window.VTVersion.getVersionString === "function") {
        return window.VTVersion.getVersionString();
      }
    }catch(_){}
    return VERSION_FALLBACK;
  }

  const APP_VERSION = resolveVersion();

  /* ===== Home UI ===== */
  function initHome(){
    setText("homeVersion", APP_VERSION);
    setText("bootText", "BOOT OK " + APP_VERSION);
  }

  /* ===== Charts UI ===== */
  function initCharts(){
    const note =
      "Charts show only data recorded on this device. Swipe panels outside the chart.";
    setText("chartsTopNote", note);
  }

  function updateChartsDateLabel(label){
    // Chart module may call this later
    setText("chartsTopNote", label);
  }

  /* ===== Log UI ===== */
  function initLog(){
    const note =
      "Log entries are ordered by time recorded. Times are critical for review.";
    setText("logTopNote", note);
  }

  /* ===== Settings UI ===== */
  function initSettings(){
    // Static for now; nothing dynamic required
  }

  /* ===== Init ===== */
  function init(){
    initHome();
    initCharts();
    initLog();
    initSettings();
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* ===== Public API ===== */
  window.VTUI = {
    VERSION: APP_VERSION,
    updateChartsDateLabel
  };

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/ui.js
App Version: v2.023d
Base: v2.021
Touched in v2.023d: js/ui.js
Schema order: File 10 of 10
Implementation set COMPLETE for v2.023 series (shell + panels + UI)
Next phase: Restore js/chart.js from known-good logic (v2.021 behavior)
*/
