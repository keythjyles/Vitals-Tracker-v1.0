/* File: js/app.js */
/*
Vitals Tracker — App Orchestrator
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: (authority) js/version.js
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- App-level wiring only: version display, high-level navigation delegation, safe boot checks.
- Must NOT contain chart render logic (chart.js owns that).
- Must NOT implement swipe rules (gestures.js owns that).
- Must NOT own panel show/hide rules long-term (panels.js owns that).

v2.023e — Change Log (THIS FILE ONLY)
1) Initializes VTStore on boot (so Charts/Log have data).
2) Ensures VTChart.onShow() runs every time Charts is opened (not just on load).
3) Continues reading version exclusively from window.VTVersion.
4) Settings remains accessible ONLY via gear button (rotation handled elsewhere).

Schema position:
File 3 of 10
*/

(function(){
  "use strict";

  function vStr(){
    try{
      return window.VTVersion?.getVersionString?.() || "v?.???";
    }catch(_){
      return "v?.???";
    }
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

  function safeAlert(msg){
    try{ alert(msg); }catch(_){}
  }

  function callChartOnShowIfPresent(){
    try{
      if(window.VTChart && typeof window.VTChart.onShow === "function"){
        window.VTChart.onShow();
      }
    }catch(_){}
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

    // If we just opened Charts, render now
    if(name === "charts") callChartOnShowIfPresent();
  }

  function addPanelExists(){
    return !!$("panelAdd") || !!$("addCard") || !!$("addForm") || !!$("btnSaveReading");
  }

  async function safeInitStore(){
    try{
      if(window.VTStore && typeof window.VTStore.init === "function"){
        await window.VTStore.init();
      }
    }catch(_){}
  }

  async function init(){
    const ver = vStr();

    // Version labels
    setText("bootText", `BOOT OK ${ver}`);
    setText("homeVersion", ver);

    // Ensure store is loaded early (Charts and Log rely on this)
    await safeInitStore();

    // Wire buttons
    bindOnce($("btnGoCharts"), "goCharts", () => showPanel("charts"));
    bindOnce($("btnGoLog"), "goLog", () => showPanel("log"));

    // Add Reading button (routes if Add panel exists)
    bindOnce($("btnGoAdd"), "goAdd", () => {
      if(addPanelExists()){
        showPanel("add");
        return;
      }
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
      if(window.VTPanels && typeof window.VTPanels.backFromSettings === "function"){
        window.VTPanels.backFromSettings();
      }else{
        showPanel("home");
      }
    });

    // If charts panel is active on load, render now (and store is loaded)
    try{
      const charts = $("panelCharts");
      if(charts && charts.classList.contains("active")){
        callChartOnShowIfPresent();
      }
    }catch(_){}
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", () => { init(); });
  }else{
    init();
  }

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/app.js
App Version: (authority) js/version.js
Base: v2.021
Touched in: v2.023e (store init + charts onShow on nav)
Schema order: File 3 of 10
*/
