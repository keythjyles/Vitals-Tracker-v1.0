/* File: js/gestures.js */
/*
Vitals Tracker — Panel Swipe Gestures (OWNER)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023d
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns horizontal panel swipe between core panels only.
- Settings is EXCLUDED from swipe rotation (gear-only access).
- Must NOT implement chart pan/zoom (chart.js owns that).

v2.023d — Change Log (THIS FILE ONLY)
1) Restores working horizontal swipe.
2) Swipe allowed only from elements marked data-swipezone="1".
3) Hard-block swipe starts inside #canvasWrap so chart gestures always win.
*/

(function(){
  "use strict";

  function $(id){ return document.getElementById(id); }

  const root = $("panelsRoot");
  if(!root) return;

  const canvasWrap = $("canvasWrap");

  // Core panels only (no settings)
  const order = ["home","charts","log"];

  function getActive(){
    if($("panelHome")?.classList.contains("active")) return "home";
    if($("panelCharts")?.classList.contains("active")) return "charts";
    if($("panelLog")?.classList.contains("active")) return "log";
    if($("panelSettings")?.classList.contains("active")) return "settings";
    if($("panelAdd")?.classList.contains("active")) return "add";
    return "home";
  }

  function show(which){
    // Prefer panels module if it exists
    if(window.VTPanels?.show) return window.VTPanels.show(which);

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

    if(which === "charts"){
      try{ window.VTChart?.onShow?.(); }catch(_){}
    }
  }

  function next(){
    const a = getActive();
    if(a === "settings") return; // no swipe in/out of settings
    if(a === "add") return;      // do not swipe from add in this build
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

  function within(el, target){
    if(!el || !target) return false;
    return el === target || el.contains(target);
  }

  function isSwipeStartAllowed(target){
    // Chart area is protected: chart.js must receive gestures
    if(getActive() === "charts" && canvasWrap && within(canvasWrap, target)) return false;

    // Only allow swipe when start is in explicit swipe zone/header areas
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
