/* File: js/app.js */
/*
Vitals Tracker — Application Orchestrator
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023
Base: v2.021 (last known-good orchestration logic)
Date: 2026-01-18

This file is: 7 of 10 (v2.023 phase)
Touched in this release: YES
Module owner: App bootstrap, global wiring, cross-module glue.

v2.023 SCOPE (LOCKED — do not drift)
- Restore v2.021-style boot flow and globals.
- Provide safe global hooks used by index.html and other modules.
- NO UI markup here.
- NO chart math here.
- NO storage schema changes here.
- Version alignment only; do not advance version further.

Accessibility / usability rules:
- Fail silently if optional modules are missing.
- Never throw during boot.
- All globals clearly named and commented.
- EOF footer comment REQUIRED.

Expected dependencies (defensive):
- storage.js → window.VTStorage
- chart.js   → window.renderCharts (optional)
- log.js     → window.renderLog (optional)
- add.js     → window.editReading (optional)
*/

(function(){
  "use strict";

  const APP_VERSION = "v2.023";

  // ===== Safe console tag =====
  function log(){
    try{
      console.log("[VitalsTracker]", ...arguments);
    }catch(_){}
  }

  // ===== Global state container =====
  // Central place so index.html and modules
  // do NOT invent their own globals.
  const AppState = {
    version: APP_VERSION,
    booted: false,
    recordsLoaded: false,
    records: []
  };

  // Expose read-only reference
  window.VTApp = AppState;

  // ===== Storage bootstrap =====
  async function loadRecords(){
    if(!window.VTStorage) return [];
    try{
      const res = await window.VTStorage.loadAll();
      const recs = Array.isArray(res.records) ? res.records : [];
      AppState.records = recs;
      AppState.recordsLoaded = true;
      return recs;
    }catch(e){
      log("Storage load failed", e);
      return [];
    }
  }

  // ===== Render coordination =====
  function refreshAll(){
    // Charts
    if(typeof window.renderCharts === "function"){
      try{ window.renderCharts(); }catch(e){ log("renderCharts error", e); }
    }

    // Log
    if(typeof window.renderLog === "function"){
      try{ window.renderLog(); }catch(e){ log("renderLog error", e); }
    }
  }

  // ===== Panel navigation helper =====
  // index.html defines setActive; we only proxy if present.
  window.goPanel = function(name){
    if(typeof window.setActive === "function"){
      window.setActive(name);
    }
  };

  // ===== Public refresh hook =====
  window.refreshData = async function(){
    await loadRecords();
    refreshAll();
  };

  // ===== Boot =====
  async function boot(){
    if(AppState.booted) return;

    log("Booting", APP_VERSION);

    await loadRecords();

    refreshAll();

    AppState.booted = true;
    log("Boot complete");
  }

  // ===== Visibility handling =====
  // When user returns to app, refresh views
  document.addEventListener("visibilitychange", () => {
    if(document.visibilityState === "visible"){
      refreshAll();
    }
  });

  // ===== DOM ready =====
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot, { once:true });
  } else {
    boot();
  }

  // ===== EOF =====
})();

/* EOF: js/app.js */
/*
App Version: v2.023
Base: v2.021
Touched in this release: YES

Delivered files so far (v2.023 phase):
1) index.html
6) js/add.js
7) js/app.js

Next file to deliver (on "N"):
- File 8 of 10: js/ui.js
*/
