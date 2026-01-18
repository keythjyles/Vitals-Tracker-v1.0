/* File: js/gestures.js */
/*
Vitals Tracker — Gesture Controller (Panels + Chart Protection)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

File Purpose
- Owns ALL horizontal swipe gesture handling at the app shell level.
- Implements panel carousel behavior (continuous loop):
    0 Home → 1 Charts → 2 Log → 3 Settings → back to 0
- Dispatches panel change requests ONLY via:
    window.dispatchEvent(new CustomEvent("vt:panelchange", { detail:{ toIndex } }))
- Explicitly PROTECTS chart interaction area:
    - If a touch starts inside a protected region (chart canvas wrapper),
      NO panel swipe logic is applied.
- Does NOT render charts, does NOT read storage, does NOT toggle .active classes.

Locked Behavioral Rules
1) Horizontal swipe anywhere EXCEPT protected zones triggers panel navigation.
2) Left swipe  → next panel index (wrap forward).
3) Right swipe → previous panel index (wrap backward).
4) Vertical movement is ignored here (handled elsewhere if needed).
5) Chart canvas area must remain fully reserved for pan/zoom logic.

Integration Contract (Locked)
- Protected elements must carry attribute: data-gesture-protect="true"
  (e.g., the chart canvas wrapper).
- panels.js is the ONLY module that activates panels.
- gestures.js NEVER touches DOM visibility or classes on panels.

App Version: v2.020
Base: v2.019
Date: 2026-01-18 (America/Chicago)

Change Log (v2.020)
1) Added strict gesture protection via data-gesture-protect.
2) Added velocity + distance thresholding to prevent accidental swipes.
3) Implemented continuous carousel math (negative-safe modulo).
4) Emits only vt:panelchange events; no direct DOM manipulation.

Reference Events
- Outbound: vt:panelchange { detail:{ toIndex:number } }
*/

(() => {
  "use strict";

  const EVT_OUT = "vt:panelchange";

  // Tunables (locked for now)
  const SWIPE_MIN_PX = 48;     // minimum horizontal travel
  const SWIPE_MAX_Y  = 36;     // max vertical drift allowed
  const SWIPE_TIME   = 600;    // ms

  let startX = 0;
  let startY = 0;
  let startT = 0;
  let tracking = false;

  function isProtectedTarget(el) {
    if (!el) return false;
    return !!el.closest("[data-gesture-protect='true']");
  }

  function wrapIndex(n, max) {
    if (max <= 0) return 0;
    return ((n % (max + 1)) + (max + 1)) % (max + 1);
  }

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;

    const t = e.touches[0];
    if (isProtectedTarget(e.target)) {
      tracking = false;
      return;
    }

    tracking = true;
    startX = t.clientX;
    startY = t.clientY;
    startT = Date.now();
  }

  function onTouchMove(e) {
    if (!tracking) return;

    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    // Abort if vertical drift is too large
    if (Math.abs(dy) > SWIPE_MAX_Y) {
      tracking = false;
    }
  }

  function onTouchEnd(e) {
    if (!tracking) return;
    tracking = false;

    const dt = Date.now() - startT;
    if (dt > SWIPE_TIME) return;

    const t = (e.changedTouches && e.changedTouches[0]) || null;
    if (!t) return;

    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (Math.abs(dx) < SWIPE_MIN_PX) return;
    if (Math.abs(dy) > SWIPE_MAX_Y) return;

    // Determine direction
    const direction = dx < 0 ? +1 : -1;

    const panelsAPI = window.VTPanels;
    if (!panelsAPI) return;

    const next = wrapIndex(panelsAPI.activeIndex + direction, panelsAPI.maxIndex);

    window.dispatchEvent(
      new CustomEvent(EVT_OUT, {
        detail: { toIndex: next, source: "swipe" }
      })
    );
  }

  function boot() {
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", () => { tracking = false; }, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
 
/* EOF File: js/gestures.js */
/*
Vitals Tracker — Gesture Controller
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.
App Version: v2.020

EOF Notes
- This file must be loaded BEFORE panels.js consumers attempt swipe navigation.
- Chart canvas wrapper MUST include data-gesture-protect="true".
- No DOM visibility logic exists here by design.
*/
