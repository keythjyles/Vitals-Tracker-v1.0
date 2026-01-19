/* File: js/app.js */
/*
Vitals Tracker — App Orchestrator
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: (authority) js/version.js

FILE ROLE (LOCKED)
- App-level wiring only: version display + calling module init() in correct order + safe boot checks.
- Must NOT contain chart render logic (chart.js owns that).
- Must NOT implement swipe rules (gestures.js owns that).
- Must NOT own panel show/hide rules long-term (panels.js owns that).
- Must NOT duplicate UI button wiring long-term (ui.js owns that).

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

  function setText(id, text){
    const el = $(id);
    if(el) el.textContent = text;
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

  function safeInitPWA(){
    try{
      if(window.VTPWA && typeof window.VTPWA.init === "function"){
        window.VTPWA.init();
      }
    }catch(_){}
  }

  function safeInitialRender(){
    try{
      const active = (function(){
        if($("panelHome")?.classList.contains("active")) return "home";
        if($("panelCharts")?.classList.contains("active")) return "charts";
        if($("panelLog")?.classList.contains("active")) return "log";
        if($("panelAdd")?.classList.contains("active")) return "add";
        if($("panelSettings")?.classList.contains("active")) return "settings";
        return "home";
      })();

      if(active === "charts" && window.VTChart && typeof window.VTChart.onShow === "function"){
        window.VTChart.onShow();
      }
      if(active === "log" && window.VTLog){
        // support either name
        if(typeof window.VTLog.onShow === "function") window.VTLog.onShow();
        else if(typeof window.VTLog.render === "function") window.VTLog.render();
      }
    }catch(_){}
  }

  async function init(){
    const ver = vStr();

    // Version labels
    setText("bootText", "BOOT OK " + ver);
    setText("homeVersion", ver);
    setText("settingsVersion", ver);

    /*
      CRITICAL BOOT ORDER (LOCKED):
      1) VTStore.init()   -> data layer ready for chart/log
      2) VTPanels.init()  -> deck DOM cached + transform set + swipe API ready
      3) VTUI.init()      -> buttons wired (load-order safe)
      4) VTPWA.init()     -> install prompt etc. (optional)
    */
    await safeInitStore();
    safeInitPanels();
    safeInitUI();
    safeInitPWA();

    // If a panel is already active on load (or after a restore), render once.
    safeInitialRender();
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
Notes: Boot order fixed. Removed duplicate UI wiring from app.js (ui.js owns buttons).
*/
```0
