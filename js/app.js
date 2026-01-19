/* File: js/app.js */
/*
Vitals Tracker — App Orchestrator
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: (authority) js/version.js

FILE ROLE (LOCKED)
- App-level wiring only: version display, high-level navigation delegation, safe boot checks.
- Must NOT contain chart render logic (chart.js owns that).
- Must NOT implement swipe rules (gestures.js owns that).
- Must NOT own panel show/hide rules long-term (panels.js owns that).

Stabilization Pass: Render Recovery + Swipe Feel
- This file is responsible for calling module init() in the correct order.
*/

(function(){
  "use strict";

  function vStr(){
    try{
      return window.VTVersion && typeof window.VTVersion.getVersionString === "function"
        ? window.VTVersion.getVersionString()
        : "v?.???";
    }catch(_){
      return "v?.???";
    }
  }

  function $(id){ return document.getElementById(id); }

  function firstEl(ids){
    for(const id of ids){
      const el = $(id);
      if(el) return el;
    }
    return null;
  }

  function setText(id, text){
    const el = $(id);
    if(el) el.textContent = text;
  }

  function bindOnce(el, key, handler, opts){
    if(!el) return;
    const k = "vtBound_" + key;
    try{
      if(el.dataset && el.dataset[k] === "1") return;
      if(el.dataset) el.dataset[k] = "1";
    }catch(_){}
    el.addEventListener("click", handler, opts || false);
  }

  function bindOnceAny(ids, key, handler, opts){
    const el = firstEl(ids);
    bindOnce(el, key, handler, opts);
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
    // Preferred delegation path
    try{
      if(window.VTPanels && typeof window.VTPanels.show === "function"){
        window.VTPanels.show(name);
        return;
      }
    }catch(_){}
    try{
      if(window.VTUI && typeof window.VTUI.showPanel === "function"){
        window.VTUI.showPanel(name);
        return;
      }
    }catch(_){}

    // Fallback: direct DOM toggle
    const ids = {
      home: "panelHome",
      add: "panelAdd",
      charts: "panelCharts",
      log: "panelLog",
      settings: "panelSettings"
    };

    const targetId = ids[name];
    const all = ["panelHome","panelAdd","panelCharts","panelLog","panelSettings"]
      .map($).filter(Boolean);

    for(const p of all) p.classList.remove("active");

    const tgt = targetId ? $(targetId) : null;
    if(tgt) tgt.classList.add("active");

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

  function safeInitPanels(){
    try{
      if(window.VTPanels && typeof window.VTPanels.init === "function"){
        window.VTPanels.init();
      }
    }catch(_){}
  }

  function safeInitUI(){
    try{
      if(window.VTUI && typeof window.VTUI.init === "function"){
        window.VTUI.init();
      }
    }catch(_){}
  }

  function safeInitGestures(){
    try{
      if(window.VTGestures && typeof window.VTGestures.init === "function"){
        window.VTGestures.init();
      }
    }catch(_){}
  }

  function safeInitPWA(){
    try{
      if(window.VTPWA && typeof window.VTPWA.init === "function"){
        window.VTPWA.init();
      }
    }catch(_){}
  }

  function wireButtons(){
    // Home main buttons
    bindOnceAny(["btnGoCharts"], "goCharts", () => showPanel("charts"));
    bindOnceAny(["btnGoLog"], "goLog", () => showPanel("log"));

    bindOnceAny(["btnGoAdd"], "goAdd", () => {
      if(addPanelExists()){
        showPanel("add");
        return;
      }
      safeAlert("Add Reading panel is not installed in this build yet.");
    });

    // Home-from panels
    bindOnceAny(["btnHomeFromCharts"], "homeFromCharts", () => showPanel("home"));
    bindOnceAny(["btnHomeFromLog"], "homeFromLog", () => showPanel("home"));
    bindOnceAny(["btnHomeFromAdd"], "homeFromAdd", () => showPanel("home"));

    // Settings via gear only (including alt gear button on Home)
    const openSettings = () => showPanel("settings");
    bindOnceAny(["btnSettings", "btnSettingsHomeAlt"], "openSettingsHome", openSettings);
    bindOnceAny(["btnSettingsFromCharts"], "openSettingsCharts", openSettings);
    bindOnceAny(["btnSettingsFromLog"], "openSettingsLog", openSettings);

    bindOnceAny(["btnBackFromSettings"], "backFromSettings", () => {
      try{
        if(window.VTPanels && typeof window.VTPanels.backFromSettings === "function"){
          window.VTPanels.backFromSettings();
          return;
        }
      }catch(_){}
      showPanel("home");
    });

    // Install / Clear Data / Exit are owned elsewhere.
    // We do NOT reimplement them here; this file only ensures panels and gestures are alive.
  }

  async function init(){
    const ver = vStr();

    // Version labels
    setText("bootText", "BOOT OK " + ver);
    setText("homeVersion", ver);

    // Settings panel version label (if present)
    setText("settingsVersion", ver);

    // Store first (so charts/log can render when opened)
    await safeInitStore();

    // Then init UI/panels/gestures (so binding + interactions are active)
    safeInitUI();
    safeInitPanels();
    safeInitGestures();

    // PWA init (install prompt wiring etc.) if module provides it
    safeInitPWA();

    // Finally wire top-level buttons
    wireButtons();

    // If charts panel is active on load, render now
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
Pass: Render Recovery + Swipe Feel
Notes: Restores init chain (Store -> UI/Panels/Gestures -> bindings)
*/
