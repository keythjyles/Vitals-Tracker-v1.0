/* File: js/gestures.js */
/*
Vitals Tracker — Panel Gesture Controller (Swipe Only)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.025e
Base: v2.021
Date: 2026-01-18

Schema position:
File 7 of 10

Former file:
File 6 — js/log.js

Next file:
File 8 — js/state.js

FILE ROLE (LOCKED)
- Owns ONLY panel-to-panel swipe navigation.
- Horizontal swipe = rotate panels.
- Vertical gestures are ignored here.
- MUST NOT touch chart canvas gestures.
- MUST NOT handle pinch, zoom, or pan inside charts.
- MUST remain simple and predictable.

v2.025e — Change Log (THIS FILE ONLY)
1) Removes complex zone-based gesture system.
2) Restores simple left/right swipe detection.
3) Ignores multi-touch entirely (chart owns pinch).
4) Prevents accidental activation from short or vertical swipes.
5) Does NOT interfere with pull-to-refresh or chart gestures.

ANTI-DRIFT RULES
- Do NOT add velocity curves.
- Do NOT add inertia or momentum.
- Do NOT bind to canvas.
- Do NOT add settings panel to rotation.
*/

(function () {
  "use strict";

  const SWIPE_MIN_PX = 48;
  const SWIPE_MAX_VERTICAL = 40;

  let startX = null;
  let startY = null;
  let tracking = false;

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;

    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    tracking = true;
  }

  function onTouchMove(e) {
    if (!tracking || e.touches.length !== 1) return;

    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    // Abort if vertical intent detected
    if (Math.abs(dy) > SWIPE_MAX_VERTICAL) {
      tracking = false;
    }
  }

  function onTouchEnd(e) {
    if (!tracking) {
      reset();
      return;
    }

    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    reset();

    if (Math.abs(dx) < SWIPE_MIN_PX) return;
    if (Math.abs(dy) > SWIPE_MAX_VERTICAL) return;

    if (dx < 0) {
      rotateNext();
    } else {
      rotatePrev();
    }
  }

  function reset() {
    tracking = false;
    startX = null;
    startY = null;
  }

  function rotateNext() {
    try {
      window.VTPanels?.next();
    } catch (_) {}
  }

  function rotatePrev() {
    try {
      window.VTPanels?.prev();
    } catch (_) {}
  }

  function bind() {
    const root = document.body;
    if (!root) return;

    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
  }

  // Bind immediately
  bind();

})();
