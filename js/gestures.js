/* File: js/gestures.js */
/*
Vitals Tracker — Gestures (Panel Swipe Only)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.025d
Base: v2.021
Date: 2026-01-18

Schema position:
File 3 of 10

Former file:
File 2 — js/version.js

Next file:
File 4 — js/chart.js

FILE ROLE (LOCKED)
- Owns ONLY horizontal panel rotation swipe.
- Settings is NOT in rotation.
- Chart canvas area is protected; chart.js owns chart gestures.
- No "zones". No complex modes. Simple and predictable.

v2.025d — Change Log (THIS FILE ONLY)
1) Complete gesture restart: simple left/right swipe for panel rotation.
2) No swipe zones. No snapping. No heuristics beyond a single threshold.
3) Chart interaction area is hard-protected: swipes that start inside #canvasWrap are ignored.
4) Settings is excluded: rotation is home <-> charts <-> log.
5) Uses VTPanels.next()/prev() when available; otherwise falls back to DOM class toggles.

ANTI-DRIFT RULES
- Do NOT implement chart pan/zoom here.
- Do NOT implement Settings navigation here (gear handles settings).
- Do NOT implement pull-to-refresh here.
*/

(function(){
  "use strict";

  const ROOT_ID = "panelsRoot";
  const CANVAS_WRAP_ID = "canvasWrap";

  // Rotation excludes settings by design.
  const ROTATION = ["home","charts","log"];

  const THRESHOLD_PX = 55;     // horizontal distance required
  const MAX_OFF_AXIS = 45;     // if vertical movement exceeds this, ignore swipe
  const EDGE_GUARD_PX = 8;     // ignore ultra-edge accidental swipes

  function $(id){ return document.getElementById(id); }

  const root = $(ROOT_ID);
  if(!root) return;

  const canvasWrap = $(CANVAS_WRAP_ID);

  function within(el, target){
    if(!el || !target) return false;
    return el === target || el.contains(target);
  }

  function activePanelFromDOM(){
    if($("panelHome")?.classList.contains("active")) return "home";
    if($("panelCharts")?.classList.contains("active")) return "charts";
    if($("panelLog")?.classList.contains("active")) return "log";
    if($("panelSettings")?.classList.contains("active")) return "settings";
    if($("panelAdd")?.classList.contains("active")) return "add";
    return "home";
  }

  function showPanelFallback(which){
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

  function nextPanel(){
    // If panels router exists, use it.
    if(window.VTPanels && typeof window.VTPanels.next === "function"){
      const a = window.VTPanels.getActive?.() || activePanelFromDOM();
      if(a === "settings" || a === "add") return; // do not swipe out/in
      return window.VTPanels.next();
    }

    // Fallback: DOM rotation
    const a = activePanelFromDOM();
    if(a === "settings" || a === "add") return;
    const i = ROTATION.indexOf(a);
    if(i < 0) return;
    showPanelFallback(ROTATION[(i+1) % ROTATION.length]);
  }

  function prevPanel(){
    if(window.VTPanels && typeof window.VTPanels.prev === "function"){
      const a = window.VTPanels.getActive?.() || activePanelFromDOM();
      if(a === "settings" || a === "add") return;
      return window.VTPanels.prev();
    }

    const a = activePanelFromDOM();
    if(a === "settings" || a === "add") return;
    const i = ROTATION.indexOf(a);
    if(i < 0) return;
    showPanelFallback(ROTATION[(i-1 + ROTATION.length) % ROTATION.length]);
  }

  // Swipe state
  const sw = {
    active:false,
    sx:0, sy:0,
    lastX:0, lastY:0,
    ok:false,
  };

  function startAllowed(target){
    // Never begin a panel swipe inside the chart interaction area.
    if(canvasWrap && within(canvasWrap, target)) return false;

    // If current panel is settings or add, do not swipe at all.
    const a = (window.VTPanels?.getActive?.() || activePanelFromDOM());
    if(a === "settings" || a === "add") return false;

    return true;
  }

  root.addEventListener("touchstart", (e) => {
    if(e.touches.length !== 1) return;
    const t = e.touches[0];

    // Guard ultra-edge accidental touches
    if(t.clientX <= EDGE_GUARD_PX || t.clientX >= (window.innerWidth - EDGE_GUARD_PX)) return;

    sw.active = true;
    sw.sx = t.clientX; sw.sy = t.clientY;
    sw.lastX = t.clientX; sw.lastY = t.clientY;
    sw.ok = startAllowed(e.target);
  }, { passive:true });

  root.addEventListener("touchmove", (e) => {
    if(!sw.active || !sw.ok) return;
    if(e.touches.length !== 1) return;

    const t = e.touches[0];
    sw.lastX = t.clientX; sw.lastY = t.clientY;

    const dx = t.clientX - sw.sx;
    const dy = t.clientY - sw.sy;

    // If the gesture has become strongly vertical, stop tracking.
    if(Math.abs(dy) > MAX_OFF_AXIS && Math.abs(dy) > Math.abs(dx)){
      sw.ok = false;
      return;
    }

    // If horizontal intent is clear, prevent native scroll bounce.
    if(Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy)){
      e.preventDefault();
    }
  }, { passive:false });

  root.addEventListener("touchend", (e) => {
    if(!sw.active){ return; }
    sw.active = false;

    if(!sw.ok) return;

    const t = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
    if(!t) return;

    const dx = t.clientX - sw.sx;
    const dy = t.clientY - sw.sy;

    // Reject strong vertical swipes.
    if(Math.abs(dy) > MAX_OFF_AXIS && Math.abs(dy) > Math.abs(dx)) return;

    if(dx <= -THRESHOLD_PX) nextPanel();
    else if(dx >= THRESHOLD_PX) prevPanel();
  }, { passive:true });

  root.addEventListener("touchcancel", () => {
    sw.active = false;
    sw.ok = false;
  }, { passive:true });

})();
