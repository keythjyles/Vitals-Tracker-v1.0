/* File: js/gestures.js */
/*
Vitals Tracker — Panel Swipe Gestures (OWNER)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: (authority) js/version.js
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns horizontal panel swipe between core panels only.
- Settings is EXCLUDED from swipe rotation (gear-only access).
- Must NOT implement chart pan/zoom (chart.js owns that).
- Must NOT steal gestures inside the chart interaction region (#canvasWrap).

Swipe policy:
- Swipe allowed ONLY when touchstart begins inside an element marked data-swipezone="1".
- Swipe hard-blocked when touchstart begins inside #canvasWrap while on Charts.

Schema position:
File 8 of 10
Previous file: File 7 — js/chart.js
Next file: File 9 — js/panels.js
*/

(function(){
  "use strict";

  function $(id){ return document.getElementById(id); }

  const root = $("panelsRoot");
  if(!root) return;

  // Idempotency guard (prevents duplicate listeners after hot reload / cache behavior)
  if(root.dataset && root.dataset.vtGesturesBound === "1") return;
  if(root.dataset) root.dataset.vtGesturesBound = "1";

  const canvasWrap = $("canvasWrap");
  const order = ["home","charts","log"]; // settings excluded by design

  function getActive(){
    if($("panelHome")?.classList.contains("active")) return "home";
    if($("panelCharts")?.classList.contains("active")) return "charts";
    if($("panelLog")?.classList.contains("active")) return "log";
    if($("panelSettings")?.classList.contains("active")) return "settings";
    if($("panelAdd")?.classList.contains("active")) return "add";
    return "home";
  }

  function show(which){
    // Prefer the router if present
    if(window.VTPanels?.setActive) return window.VTPanels.setActive(which);

    const map = { home:"panelHome", add:"panelAdd", charts:"panelCharts", log:"panelLog", settings:"panelSettings" };
    const allIds = ["panelHome","panelAdd","panelCharts","panelLog","panelSettings"];
    for(const id of allIds){
      const el = $(id);
      if(el) el.classList.toggle("active", map[which] === id);
    }
    if(which === "charts"){
      try{ window.VTChart?.onShow?.(); }catch(_){}
    }
  }

  function next(){
    const a = getActive();
    if(a === "settings") return;
    if(a === "add") return;
    const i = order.indexOf(a);
    if(i < 0) return;
    show(order[(i+1) % order.length]);
  }

  function prev(){
    const a = getActive();
    if(a === "settings") return;
    if(a === "add") return;
    const i = order.indexOf(a);
    if(i < 0) return;
    show(order[(i-1 + order.length) % order.length]);
  }

  function within(container, target){
    if(!container || !target) return false;
    return container === target || container.contains(target);
  }

  function isSwipeStartAllowed(target){
    // Chart area is protected
    if(getActive() === "charts" && canvasWrap && within(canvasWrap, target)) return false;

    // Must start in explicit swipe zones only
    const z = target.closest?.("[data-swipezone='1']");
    return !!z;
  }

  const swipe = { active:false, sx:0, sy:0, ok:false, mode:null };

  root.addEventListener("touchstart", (e) => {
    if(e.touches.length !== 1) return;
    swipe.active = true;
    swipe.sx = e.touches[0].clientX;
    swipe.sy = e.touches[0].clientY;
    swipe.ok = isSwipeStartAllowed(e.target);
    swipe.mode = null;
  }, { passive:true });

  root.addEventListener("touchmove", (e) => {
    if(!swipe.active || !swipe.ok) return;
    if(e.touches.length !== 1) return;

    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    const dx = x - swipe.sx;
    const dy = y - swipe.sy;

    if(!swipe.mode){
      if(Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.2) swipe.mode = "h";
      else if(Math.abs(dy) > 18 && Math.abs(dy) > Math.abs(dx) * 1.2) swipe.mode = "v";
    }

    if(swipe.mode === "h"){
      // We must preventDefault or the page will scroll horizontally / eat the gesture
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
