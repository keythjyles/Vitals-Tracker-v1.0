/* File: js/app.js */
/*
Vitals Tracker — App Orchestrator
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023c
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- App-level wiring only: version display, high-level navigation delegation, safe boot checks.
- Must NOT contain chart render logic (chart.js owns that).
- Must NOT implement swipe rules (gestures.js owns that).
- Must NOT own panel show/hide rules long-term (panels.js owns that).

v2.023c — Change Log (THIS FILE ONLY)
1) Reads version exclusively from window.VTVersion (no hard-coded versions).
2) Updates BOOT + Home footer version labels from VTVersion.
3) “Turn back on Add Reading element” behavior: if an Add panel exists and panels/ui module exposes navigation, it will route there; otherwise it will show a controlled alert.
4) Settings is NOT part of carousel/rotation (handled in gestures/panels later); this file only ensures gear routes to Settings when present.

Schema position:
File 3 of 10
*/

(function(){
  "use strict";

  function vStr(){
    try{
      if(window.VTVersion && typeof window.VTVersion.getVersionString === "function"){
        return window.VTVersion.getVersionString();
      }
    }catch(_){}
    return "v?.???";
  }

  function $(id){ return document.getElementById(id); }

  function setText(id, text){
    const el = $(id);
    if(el) el.textContent = text;
  }

  function bindOnce(el, key, handler, opts){
    if(!el) return;
    const k = `vtBound_${key}`;
    if(el.dataset && el.dataset[k] === "1") return;
    if(el.dataset) el.dataset[k] = "1";
    el.addEventListener("click", handler, opts || false);
  }

  function showPanel(name){
    // Preferred delegation path (future)
    if(window.VTPanels && typeof window.VTPanels.show === "function"){
      return window.VTPanels.show(name);
    }
    if(window.VTUI && typeof window.VTUI.showPanel === "function"){
      return window.VTUI.showPanel(name);
    }

    // Fallback: direct DOM toggle (non-invasive)
    const ids = {
      home: "panelHome",
      add: "panelAdd",
      charts: "panelCharts",
      log: "panelLog",
      settings: "panelSettings"
    };
    const targetId = ids[name];
    const all = ["panelHome","panelAdd","panelCharts","panelLog","panelSettings"].map($).filter(Boolean);
    for(const p of all) p.classList.remove("active");
    const tgt = targetId ? $(targetId) : null;
    if(tgt) tgt.classList.add("active");
  }

  function addPanelExists(){
    return !!$("panelAdd") || !!$("addCard") || !!$("addForm") || !!$("btnSaveReading");
  }

  function safeAlert(msg){
    try{ alert(msg); }catch(_){}
  }

  function init(){
    const ver = vStr();

    // Version labels
    setText("bootText", `BOOT OK ${ver}`);
    setText("homeVersion", ver);

    // Wire buttons (non-destructive; binds only once)
    bindOnce($("btnGoCharts"), "goCharts", () => showPanel("charts"));
    bindOnce($("btnGoLog"), "goLog", () => showPanel("log"));

    // Turn Add Reading element back on (routes if Add panel exists)
    bindOnce($("btnGoAdd"), "goAdd", () => {
      if(addPanelExists()){
        showPanel("add");
        return;
      }
      // Controlled message: Add panel not restored in current build
      safeAlert("Add Reading panel is not installed in this build yet. Next steps: restore Add panel + save flow (add.js/storage).");
    });

    // Home-from panels
    bindOnce($("btnHomeFromCharts"), "homeFromCharts", () => showPanel("home"));
    bindOnce($("btnHomeFromLog"), "homeFromLog", () => showPanel("home"));

    // Settings via gear only
    const openSettings = () => showPanel("settings");
    bindOnce($("btnSettings"), "openSettingsHome", openSettings);
    bindOnce($("btnSettingsFromCharts"), "openSettingsCharts", openSettings);
    bindOnce($("btnSettingsFromLog"), "openSettingsLog", openSettings);

    bindOnce($("btnBackFromSettings"), "backFromSettings", () => {
      // Prefer returning to Home unless a panels module tracks last panel
      if(window.VTPanels && typeof window.VTPanels.backFromSettings === "function"){
        window.VTPanels.backFromSettings();
      }else{
        showPanel("home");
      }
    });

    // On entry to Charts, ask chart module to render (if present)
    try{
      if(window.VTChart && typeof window.VTChart.onShow === "function"){
        // If charts panel is active on load, render now
        const charts = $("panelCharts");
        if(charts && charts.classList.contains("active")){
          window.VTChart.onShow();
        }
      }
    }catch(_){}
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  }else{
    init();
  }

})();
