/* File: js/gestures.js */
/*
Vitals Tracker — Gestures (Swipe + Pull + Chart Pinch/Pan)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023c
Base: v2.021
Date: 2026-01-18

v2.023c — Change Log (THIS FILE ONLY)
1) Restores panel swipe routing in a safe, minimal way:
   - Horizontal swipes on the MAIN app surface switch panels via VTPanels.goTo(name).
2) Protects the chart interaction region:
   - Touches that begin inside #canvasWrap are NOT treated as panel swipes.
   - That region is reserved for chart pinch/pan (future) and does not interfere.
3) Adds optional pull-to-refresh on Home panel:
   - Pull down on #homePanel triggers a soft reload (location.reload()) only after threshold.
4) No chart math is implemented here yet; this file only routes gesture intent.

Schema position:
File 8 of 10

Previous file:
File 7 — js/chart.js

Next file:
File 9 — js/panels.js
*/

(function(){
  "use strict";

  const SWIPE_MIN_X = 54;         // px
  const SWIPE_MAX_Y = 28;         // px (vertical tolerance)
  const EDGE_GUARD_Y = 14;        // ignore tiny accidental moves
  const HOME_PULL_THRESHOLD = 70; // px

  function el(id){ return document.getElementById(id); }

  function closestId(node){
    try{
      while(node){
        if(node.id) return node.id;
        node = node.parentElement;
      }
    }catch(_){}
    return "";
  }

  function inCanvasRegion(target){
    try{
      const wrap = el("canvasWrap");
      if(!wrap) return false;
      return wrap.contains(target);
    }catch(_){
      return false;
    }
  }

  function currentPanelName(){
    // panels.js should own the truth; we defensively infer from DOM if needed
    try{
      if(window.VTPanels && typeof VTPanels.getActive === "function"){
        return VTPanels.getActive() || "home";
      }
    }catch(_){}
    // fallback: check which panel has aria-hidden="false"
    try{
      const ids = ["homePanel","addPanel","chartsPanel","logPanel","settingsPanel"];
      for(const id of ids){
        const p = el(id);
        if(p && p.getAttribute("aria-hidden") === "false") {
          if(id==="homePanel") return "home";
          if(id==="addPanel") return "add";
          if(id==="chartsPanel") return "charts";
          if(id==="logPanel") return "log";
          if(id==="settingsPanel") return "settings";
        }
      }
    }catch(_){}
    return "home";
  }

  function goNext(dir){
    // dir: +1 means swipe left->right? We'll map:
    // swipeLeft (finger moves left) => next panel to the right in order
    // swipeRight => previous panel
    try{
      if(window.VTPanels && typeof VTPanels.goStep === "function"){
        VTPanels.goStep(dir);
        return;
      }
    }catch(_){}
    // fallback: call VTPanels.goTo with a hardcoded order if goStep not present
    const order = ["home","charts","log","settings"]; // continuous loop requirement handled by panels.js ideally
    let cur = currentPanelName();
    let idx = order.indexOf(cur);
    if(idx < 0) idx = 0;
    let next = (idx + dir) % order.length;
    if(next < 0) next += order.length;
    try{
      if(window.VTPanels && typeof VTPanels.goTo === "function"){
        VTPanels.goTo(order[next]);
      }
    }catch(_){}
  }

  // ----- Horizontal swipe (panel switching) -----
  let x0=0, y0=0, t0=0, tracking=false, allowPanelSwipe=false;

  function onTouchStart(e){
    try{
      if(!e || !e.touches || e.touches.length !== 1) return;

      const touch = e.touches[0];
      x0 = touch.clientX;
      y0 = touch.clientY;
      t0 = Date.now();
      tracking = true;

      // Do NOT treat touches in chart region as panel swipes
      const target = e.target;
      allowPanelSwipe = !inCanvasRegion(target);
    }catch(_){}
  }

  function onTouchMove(e){
    // We do not preventDefault here (keeps scrolling natural).
    // panels.js may decide to preventDefault in specific zones if needed.
    if(!tracking) return;

    // chart region: do nothing (reserved for chart gestures)
    if(!allowPanelSwipe) return;

    try{
      const touch = e.touches && e.touches[0];
      if(!touch) return;

      const dx = touch.clientX - x0;
      const dy = touch.clientY - y0;

      // if user is clearly scrolling vertically, abort swipe tracking
      if(Math.abs(dy) > SWIPE_MAX_Y && Math.abs(dy) > Math.abs(dx)){
        tracking = false;
      }
    }catch(_){}
  }

  function onTouchEnd(e){
    if(!tracking) return;
    tracking = false;

    if(!allowPanelSwipe) return;

    try{
      const touch = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
      if(!touch) return;

      const dx = touch.clientX - x0;
      const dy = touch.clientY - y0;

      if(Math.abs(dy) > SWIPE_MAX_Y) return;
      if(Math.abs(dx) < SWIPE_MIN_X) return;
      if(Math.abs(dy) < EDGE_GUARD_Y && Math.abs(dx) < SWIPE_MIN_X) return;

      // dx < 0 => swipe left => advance +1
      // dx > 0 => swipe right => advance -1
      if(dx < 0) goNext(+1);
      else goNext(-1);
    }catch(_){}
  }

  // ----- Pull-to-refresh on Home panel only -----
  let pullStartY=0, pulling=false;

  function onHomeTouchStart(e){
    try{
      if(!e || !e.touches || e.touches.length !== 1) return;
      const touch = e.touches[0];
      pullStartY = touch.clientY;
      pulling = true;
    }catch(_){}
  }

  function onHomeTouchMove(e){
    if(!pulling) return;
    try{
      const touch = e.touches && e.touches[0];
      if(!touch) return;

      // must be at top to count as pull-to-refresh (best-effort)
      const panel = el("homePanel");
      if(panel && panel.scrollTop > 0) return;

      const dy = touch.clientY - pullStartY;
      if(dy > HOME_PULL_THRESHOLD){
        pulling = false;
        // soft reload
        location.reload();
      }
    }catch(_){}
  }

  function onHomeTouchEnd(){
    pulling = false;
  }

  function bind(){
    // global swipe bindings
    document.addEventListener("touchstart", onTouchStart, { passive:true });
    document.addEventListener("touchmove",  onTouchMove,  { passive:true });
    document.addEventListener("touchend",   onTouchEnd,   { passive:true });

    // home pull-to-refresh bindings
    const home = el("homePanel");
    if(home){
      home.addEventListener("touchstart", onHomeTouchStart, { passive:true });
      home.addEventListener("touchmove",  onHomeTouchMove,  { passive:true });
      home.addEventListener("touchend",   onHomeTouchEnd,   { passive:true });
      home.addEventListener("touchcancel",onHomeTouchEnd,   { passive:true });
    }
  }

  // Expose a minimal API (optional)
  window.VTGestures = {
    bind
  };

  // Auto-bind on DOM ready
  if(document.readyState === "complete" || document.readyState === "interactive"){
    setTimeout(bind, 0);
  }else{
    document.addEventListener("DOMContentLoaded", bind);
  }

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/gestures.js
App Version: v2.023c
Base: v2.021
Touched in v2.023c: js/gestures.js (restore panel swipe; protect canvas region)
Schema order: File 8 of 10
Next planned file: js/panels.js (File 9)
*/
