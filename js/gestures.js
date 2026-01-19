/*
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/gestures.js
App Version Authority: js/version.js
Base: v2.026a
Pass: Swipe + Render Recovery (P0-R1)
Pass order: File 6 of 9 (P0)
Prev file: js/panels.js (File 5 of 9)
Next file: js/chart.js (File 7 of 9)

FIX (SWIPE ONLY)
- Strengthens abort handling so any drag that started is ALWAYS snapped safely on abort/end.
- Keeps chart area protected (no swipe capture when gesture begins on chart canvas/wrap/card).
- Also snaps back on touchcancel and on unexpected multi-touch interruption after drag begins.
*/

(function () {
  "use strict";

  const deck = document.getElementById("panelDeck");
  if (!deck) return;

  let active = false;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let width = 1;
  let locked = false;

  // Once we have moved horizontally enough to start dragging, ensure we resolve cleanly.
  let didDrag = false;

  function inChartRegion(target) {
    try {
      if (!target) return false;
      return !!target.closest("#chartCanvas, .chartWrap, .chartCard");
    } catch (_) {
      return false;
    }
  }

  function canSwipeNow() {
    try {
      return !!(window.VTPanels &&
        typeof window.VTPanels.canSwipe === "function" &&
        window.VTPanels.canSwipe());
    } catch (_) {
      return false;
    }
  }

  function shouldIgnoreStart(e) {
    const t = e.target;
    if (inChartRegion(t)) return true;
    if (!canSwipeNow()) return true;
    return false;
  }

  function snapBack() {
    try {
      if (window.VTPanels && typeof window.VTPanels.swipeEnd === "function") {
        window.VTPanels.swipeEnd(0);
      }
    } catch (_) {}
  }

  function abortGesture() {
    // Abort safely and resolve any started drag.
    locked = true;
    active = false;
    if (didDrag) snapBack();
  }

  function onStart(e) {
    if (!e.touches || e.touches.length !== 1) return;

    locked = false;
    active = false;
    didDrag = false;

    if (shouldIgnoreStart(e)) {
      locked = true;
      return;
    }

    active = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = startX;
    width = deck.clientWidth || window.innerWidth || 1;
  }

  function onMove(e) {
    if (!active) return;
    if (locked) return;

    // If multi-touch appears mid-gesture, abort cleanly.
    if (!e.touches || e.touches.length !== 1) {
      abortGesture();
      return;
    }

    // If panels says no swipe (state changed mid-gesture), abort safely.
    if (!canSwipeNow()) {
      abortGesture();
      return;
    }

    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;

    const dx = x - startX;
    const dy = y - startY;

    // Vertical intent => treat as scroll; if we already dragged, snap back immediately.
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      abortGesture();
      return;
    }

    currentX = x;

    // Treat tiny motions as noise; don't start a drag until we have intent.
    if (Math.abs(dx) < 6) return;

    didDrag = true;

    const ratio = dx / width;

    try {
      if (window.VTPanels && typeof window.VTPanels.swipeDelta === "function") {
        window.VTPanels.swipeDelta(ratio);
      }
    } catch (_) {}

    // Only preventDefault while actively dragging horizontally
    e.preventDefault();
  }

  function onEnd() {
    // If start was ignored, nothing to do.
    if (!active) return;

    // If we locked mid-gesture, ensure we resolved.
    if (locked) {
      active = false;
      if (didDrag) snapBack();
      return;
    }

    active = false;

    const dx = currentX - startX;
    const ratio = dx / width;

    try {
      if (window.VTPanels && typeof window.VTPanels.swipeEnd === "function") {
        window.VTPanels.swipeEnd(ratio);
      } else if (didDrag) {
        snapBack();
      }
    } catch (_) {
      if (didDrag) snapBack();
    }
  }

  function onCancel() {
    // Always resolve cancel (OS gesture interruption, app switch, etc.)
    if (!active) return;
    active = false;
    if (didDrag) snapBack();
  }

  deck.addEventListener("touchstart", onStart, { passive: true });
  deck.addEventListener("touchmove", onMove, { passive: false });
  deck.addEventListener("touchend", onEnd, { passive: true });
  deck.addEventListener("touchcancel", onCancel, { passive: true });

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/gestures.js
Pass: Swipe + Render Recovery (P0-R1)
Pass order: File 6 of 9 (P0)
Prev file: js/panels.js (File 5 of 9)
Next file: js/chart.js (File 7 of 9)
*/
