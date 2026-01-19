/* File: js/gestures.js */
/*
Vitals Tracker — Panel Swipe Gestures (OWNER)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.024
Base: v2.023d
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns horizontal panel swipe between core panels only.
- Settings is EXCLUDED from swipe rotation (gear-only access).
- Must NOT implement chart pan/zoom (chart.js owns that).

v2.024 — Change Log (THIS FILE ONLY)
1) Restores reliable left/right swipe between: home -> charts -> log -> home.
2) Swipe starts ONLY from explicit swipe zones: [data-swipezone="1"].
3) Hard-block swipe starts inside #canvasWrap so chart pointer gestures always win.
4) Never swipes in/out of Settings or Add (if present).
5) Delegates to VTPanels.next()/prev() when available; otherwise toggles .active directly.

Schema position:
File 8 of 10

Previous file:
File 7 — js/chart.js

Next file:
File 9 — js/panels.js
*/

(function(){
  "use strict";

  function $(id){ return document.getElementById(id); }

  const root = $("panelsRoot");
  if(!root) return;

  const canvasWrap = $("canvasWrap");

  // Core panels only (no settings, no add)
  const order = ["home","charts","log"];

  function hasActive(id){
    const el = $(id);
    return !!(el && el.classList.contains("active"));
  }

  function getActive(){
    if(hasActive("panelHome")) return "home";
    if(hasActive("panelCharts")) return "charts";
    if(hasActive("panelLog")) return "log";
    if(hasActive("panelSettings")) return "settings";
    if(hasActive("panelAdd")) return "add";
    return "home";
  }

  function show(which){
    // Prefer panels router if present
    if(window.VTPanels && typeof window.VTPanels.setActive === "function"){
      try{ window.VTPanels.setActive(which); return; }catch(_){}
    }

    const map = {
      home:"panelHome",
      charts:"panelCharts",
      log:"panelLog",
      settings:"panelSettings",
      add:"panelAdd"
    };

    const allIds = ["panelHome","panelAdd","panelCharts","panelLog","panelSettings"];
    for(const id of allIds){
      const el = $(id);
      if(el) el.classList.toggle("active", map[which] === id);
    }

    // On entering charts, request chart render
    if(which === "charts"){
      try{ window.VTChart?.onShow?.(); }catch(_){}
    }
  }

  function next(){
    if(window.VTPanels && typeof window.VTPanels.next === "function"){
      try{ window.VTPanels.next(); return; }catch(_){}
    }
    const a = getActive();
    if(a === "settings" || a === "add") return;
    const i = order.indexOf(a);
    if(i < 0) return;
    show(order[(i+1) % order.length]);
  }

  function prev(){
    if(window.VTPanels && typeof window.VTPanels.prev === "function"){
      try{ window.VTPanels.prev(); return; }catch(_){}
    }
    const a = getActive();
    if(a === "settings" || a === "add") return;
    const i = order.indexOf(a);
    if(i < 0) return;
    show(order[(i-1 + order.length) % order.length]);
  }

  function within(el, target){
    if(!el || !target) return false;
    return el === target || el.contains(target);
  }

  function isSwipeStartAllowed(target){
    const active = getActive();

    // Never swipe from Settings or Add
    if(active === "settings" || active === "add") return false;

    // Chart area protected: chart.js must receive gestures
    if(active === "charts" && canvasWrap && within(canvasWrap, target)) return false;

    // Only allow swipe starts from explicit swipe zones
    const z = target.closest?.("[data-swipezone='1']");
    return !!z;
  }

  const swipe = { active:false, sx:0, sy:0, ok:false, mode:null };

  root.addEventListener("touchstart", (e) => {
    if(e.touches.length !== 1) return;
    const t = e.touches[0];
    swipe.active = true;
    swipe.sx = t.clientX;
    swipe.sy = t.clientY;
    swipe.ok = isSwipeStartAllowed(e.target);
    swipe.mode = null;
  }, { passive:true });

  root.addEventListener("touchmove", (e) => {
    if(!swipe.active || !swipe.ok) return;
    if(e.touches.length !== 1) return;

    const t = e.touches[0];
    const dx = t.clientX - swipe.sx;
    const dy = t.clientY - swipe.sy;

    if(!swipe.mode){
      if(Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.2) swipe.mode = "h";
      else if(Math.abs(dy) > 18 && Math.abs(dy) > Math.abs(dx) * 1.2) swipe.mode = "v";
    }

    // If horizontal swipe is determined, prevent scroll so it feels locked-in
    if(swipe.mode === "h"){
      e.preventDefault();
    }
  }, { passive:false });

  root.addEventListener("touchend", (e) => {
    if(!swipe.active || !swipe.ok){ swipe.active = false; return; }
    const t = e.changedTouches?.[0];
    swipe.active = false;

    if(!t || swipe.mode !== "h") return;

    const dx = t.clientX - swipe.sx;
    if(Math.abs(dx) < 40) return;

    if(dx < 0) next(); else prev();
  }, { passive:true });

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/gestures.js
App Version: v2.024
Base: v2.023d
Touched in v2.024: js/gestures.js (restore swipe reliability + chart-protection)
Rotation: home <-> charts <-> log (settings excluded)
Next planned file: js/panels.js (File 9 of 10)
*/
