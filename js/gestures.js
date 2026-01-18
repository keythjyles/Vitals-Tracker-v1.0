/* File: js/gestures.js */
/*
Vitals Tracker — Gesture Engine (Swipe + Protection Layer)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023c
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns ALL gesture interpretation (horizontal swipe for panel carousel).
- Protects chart interaction region from carousel swipes.
- Emits navigation intents ONLY (next/prev), does not switch panels itself.
- Does NOT draw charts or touch storage.

v2.023c — Change Log (THIS FILE ONLY)
1) Restores stable, minimal horizontal swipe detection.
2) Hard-protects chart canvas area (#canvasWrap) from swipe hijack.
3) Requires explicit swipe start zones via [data-swipezone="1"].
4) Debounced thresholds to avoid accidental triggers.
5) Emits window.VTGestures events for panels.js to consume.

ANTI-DRIFT RULES
- Do NOT manipulate DOM visibility here.
- Do NOT read/write records here.
- Do NOT rename IDs or data attributes.

Schema position:
File 8 of 10

Previous file:
File 7 — js/chart.js

Next file:
File 9 — js/panels.js
*/

(function () {
  "use strict";

  const VERSION = "v2.023c";

  /* ===== Config ===== */
  const H_THRESHOLD = 40;      // px horizontal travel to trigger
  const DOMINANCE = 1.2;       // dx must dominate dy by this ratio
  const SINGLE_TOUCH = 1;

  /* ===== DOM helpers ===== */
  function el(id){ return document.getElementById(id); }
  function within(elm, target){
    return !!(elm && target && (elm === target || elm.contains(target)));
  }

  /* ===== State ===== */
  let swipe = {
    active:false,
    ok:false,
    sx:0,
    sy:0,
    mode:null, // "h" | "v"
  };

  function reset(){
    swipe.active = false;
    swipe.ok = false;
    swipe.sx = 0;
    swipe.sy = 0;
    swipe.mode = null;
  }

  /* ===== Guards ===== */
  function isSwipeAllowedStart(target){
    // Hard block: chart interaction region
    const canvasWrap = el("canvasWrap");
    if (canvasWrap && within(canvasWrap, target)) return false;

    // Require explicit swipe zone marker
    const z = target.closest && target.closest("[data-swipezone='1']");
    return !!z;
  }

  /* ===== Emitters ===== */
  function emit(name, detail){
    try{
      window.dispatchEvent(new CustomEvent(name, { detail }));
    }catch(_){}
  }

  function emitNext(){
    emit("VT:swipeNext", { source:"gestures" });
  }
  function emitPrev(){
    emit("VT:swipePrev", { source:"gestures" });
  }

  /* ===== Handlers ===== */
  function onTouchStart(e){
    if (e.touches.length !== SINGLE_TOUCH) return;
    const t = e.touches[0];
    swipe.active = true;
    swipe.sx = t.clientX;
    swipe.sy = t.clientY;
    swipe.ok = isSwipeAllowedStart(e.target);
    swipe.mode = null;
  }

  function onTouchMove(e){
    if (!swipe.active || !swipe.ok) return;
    if (e.touches.length !== SINGLE_TOUCH) return;

    const t = e.touches[0];
    const dx = t.clientX - swipe.sx;
    const dy = t.clientY - swipe.sy;

    if (!swipe.mode){
      if (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * DOMINANCE){
        swipe.mode = "h";
      } else if (Math.abs(dy) > 18 && Math.abs(dy) > Math.abs(dx) * DOMINANCE){
        swipe.mode = "v";
      }
    }

    // Prevent vertical scroll only if horizontal swipe is established
    if (swipe.mode === "h"){
      e.preventDefault();
    }
  }

  function onTouchEnd(e){
    if (!swipe.active || !swipe.ok){
      reset();
      return;
    }

    if (swipe.mode !== "h"){
      reset();
      return;
    }

    const t = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
    if (!t){
      reset();
      return;
    }

    const dx = t.clientX - swipe.sx;
    if (Math.abs(dx) < H_THRESHOLD){
      reset();
      return;
    }

    if (dx < 0) emitNext();
    else emitPrev();

    reset();
  }

  /* ===== Attach ===== */
  const root = el("panelsRoot") || document.body;

  root.addEventListener("touchstart", onTouchStart, { passive:true });
  root.addEventListener("touchmove", onTouchMove, { passive:false });
  root.addEventListener("touchend", onTouchEnd, { passive:true });

  /* ===== Public API (diagnostic only) ===== */
  window.VTGestures = {
    VERSION,
    _reset: reset
  };

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/gestures.js
App Version: v2.023c
Base: v2.021
Touched in v2.023c: js/gestures.js
Schema order: File 8 of 10
Next planned file: js/panels.js (File 9)
*/
