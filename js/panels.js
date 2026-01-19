/* File: js/panels.js */
/*
Vitals Tracker — Panels Router (Home / Charts / Log / Add) + Settings (gear-only)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.024a
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns which panels exist and how they are shown/hidden.
- Owns the panel index mapping for swipe navigation.
- Settings is NOT part of swipe rotation (gear-only).
- Guarantees Home button works from EVERY panel that has a Home button.

CURRENT ROTATION (LOCKED)
Index 0 = Home
Index 1 = Charts
Index 2 = Log
(Add + Settings are NOT in rotation)

ANTI-DRIFT RULES
- Do NOT implement swipe detection here (gestures.js owns that).
- Do NOT implement chart rendering here (chart.js owns that).
- Do NOT hard-code canonical version strings (version.js wins long-term).

Next planned file: js/chart.js
*/

(function () {
  "use strict";

  function $(id){ return document.getElementById(id); }

  const PANEL_IDS = Object.freeze({
    home: "panelHome",
    add: "panelAdd",
    charts: "panelCharts",
    log: "panelLog",
    settings: "panelSettings"
  });

  // Swipe rotation (NO settings, NO add)
  const ROTATION = Object.freeze(["home", "charts", "log"]);

  const state = {
    active: "home",
    lastMain: "home" // last non-settings, non-add main panel (home/charts/log)
  };

  function getPanelEl(name){
    const id = PANEL_IDS[name];
    return id ? $(id) : null;
  }

  function emitPanelChanged(name){
    try{
      document.dispatchEvent(new CustomEvent("vt:panelChanged", {
        detail: { active: name }
      }));
    }catch(_){}
  }

  function setActive(name){
    if(!name || !PANEL_IDS[name]) return;

    // Toggle DOM
    for(const k of Object.keys(PANEL_IDS)){
      const el = getPanelEl(k);
      if(!el) continue;
      el.classList.toggle("active", k === name);
    }

    // Track last main (home/charts/log only)
    if(name === "home" || name === "charts" || name === "log"){
      state.lastMain = name;
    }

    state.active = name;

    // Mirror into VTState if present
    try{
      window.VTState?.setActivePanel?.(name);
      if(name === "home")   window.VTState?.setPanelIndex?.(0);
      if(name === "charts") window.VTState?.setPanelIndex?.(1);
      if(name === "log")    window.VTState?.setPanelIndex?.(2);
    }catch(_){}

    // On entry to charts, ask chart module to render
    if(name === "charts"){
      try{ window.VTChart?.onShow?.(); }catch(_){}
    }

    emitPanelChanged(name);
  }

  function getActive(){ return state.active; }

  /* ===== Rotation / Index ===== */

  function showIndex(i){
    const idx = Number.isFinite(i) ? i : 0;
    const safe = Math.max(0, Math.min(ROTATION.length - 1, idx));
    setActive(ROTATION[safe]);
  }

  /* ===== Public nav helpers ===== */

  function goHome(){ setActive("home"); }
  function goCharts(){ setActive("charts"); }
  function goLog(){ setActive("log"); }

  function openAdd(){ setActive("add"); } // not in rotation
  function openSettings(){ setActive("settings"); } // not in rotation

  function closeSettings(){
    // Return to last main (home/charts/log)
    setActive(state.lastMain || "home");
  }

  /* ===== Button binding ===== */

  function bindClick(id, fn){
    const el = $(id);
    if(!el) return;
    el.addEventListener("click", function(e){
      try{ fn(e); }catch(_){}
    }, false);
  }

  function bindButtons(){
    // Home panel nav
    bindClick("btnGoAdd", openAdd);
    bindClick("btnGoCharts", goCharts);
    bindClick("btnGoLog", goLog);

    // Charts + Log "Home"
    bindClick("btnHomeFromCharts", goHome);
    bindClick("btnHomeFromLog", goHome);

    // Add "Home" — THIS FIXES YOUR BROKEN HOME BUTTON
    // (supports both id variants; whichever exists will bind)
    bindClick("btnHomeFromAdd", goHome);
    bindClick("btnHomeFromAddPanel", goHome);
    bindClick("btnHomeAdd", goHome);

    // Settings (gear) open from anywhere it exists
    bindClick("btnSettings", openSettings);
    bindClick("btnSettingsFromCharts", openSettings);
    bindClick("btnSettingsFromLog", openSettings);
    bindClick("btnSettingsFromAdd", openSettings);

    // Settings back
    bindClick("btnBackFromSettings", closeSettings);
  }

  function init(){
    bindButtons();

    // Determine initial active panel from DOM (if one is pre-marked active)
    let found = null;
    for(const name of Object.keys(PANEL_IDS)){
      const el = getPanelEl(name);
      if(el && el.classList.contains("active")) { found = name; break; }
    }
    setActive(found || "home");
  }

  function onReady(fn){
    if(document.readyState === "complete" || document.readyState === "interactive"){
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  // Expose
  window.VTPanels = Object.freeze({
    ROTATION,
    init,
    setActive,
    getActive,
    showIndex,
    goHome,
    goCharts,
    goLog,
    openAdd,
    openSettings,
    closeSettings
  });

  onReady(function(){
    try{ init(); }catch(_){}
  });

})();
