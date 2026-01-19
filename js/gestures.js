/* File: js/gestures.js */
/*
Vitals Tracker — Panel Navigation Gestures (SIMPLIFIED RESET)

App Version: v2.024a
Purpose:
- Handle ONLY panel-to-panel navigation (Home, Charts, Log).
- Explicitly EXCLUDES:
  - Chart pan/zoom
  - Pull-to-refresh
  - Settings panel rotation

OWNERSHIP RULES (LOCKED):
- This file controls panel index ONLY.
- chart.js controls all chart gestures.
- panels.js controls visibility + activation.
*/

(function () {
  "use strict";

  const SWIPE_THRESHOLD = 50;   // px
  const AXIS_LOCK_RATIO = 1.6;  // must be clearly horizontal

  let startX = 0;
  let startY = 0;
  let tracking = false;

  function $(id){ return document.getElementById(id); }

  function activePanelIndex(){
    return window.VTState?.getPanelIndex?.() ?? 0;
  }

  function setPanelIndex(i){
    window.VTState?.setPanelIndex?.(i);
    window.VTPanels?.showIndex?.(i);
  }

  function panelCount(){
    // Home, Charts, Log ONLY
    return 3;
  }

  function isInsideChart(target){
    const chartWrap = $("canvasWrap");
    if(!chartWrap) return false;
    return chartWrap.contains(target);
  }

  function onTouchStart(e){
    if(e.touches.length !== 1) return;

    // Do NOT intercept chart gestures
    if(isInsideChart(e.target)) return;

    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    tracking = true;
  }

  function onTouchMove(e){
    if(!tracking) return;

    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    // If vertical movement dominates, abort (no panel change)
    if(Math.abs(dy) > Math.abs(dx) / AXIS_LOCK_RATIO){
      tracking = false;
    }
  }

  function onTouchEnd(e){
    if(!tracking) return;
    tracking = false;

    if(e.changedTouches.length !== 1) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    // Horizontal intent only
    if(Math.abs(dx) < SWIPE_THRESHOLD) return;
    if(Math.abs(dx) < Math.abs(dy) * AXIS_LOCK_RATIO) return;

    const dir = dx > 0 ? -1 : 1; // swipe left = next panel
    const current = activePanelIndex();
    const next = clamp(current + dir, 0, panelCount() - 1);

    if(next !== current){
      setPanelIndex(next);
    }
  }

  function clamp(n, a, b){
    return Math.max(a, Math.min(b, n));
  }

  function init(){
    document.addEventListener("touchstart", onTouchStart, { passive:true });
    document.addEventListener("touchmove",  onTouchMove,  { passive:true });
    document.addEventListener("touchend",   onTouchEnd,   { passive:true });
  }

  function onReady(fn){
    if(document.readyState === "complete" || document.readyState === "interactive"){
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  onReady(init);

})();
