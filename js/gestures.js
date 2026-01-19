/*
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/gestures.js
App Version Authority: js/version.js
Base: v2.025f
Pass: Render Recovery + Swipe Feel
Pass order: File 6 of 9 (P0)
Prev file: js/panels.js (File 5 of 9)
Next file: js/chart.js (File 7 of 9)
*/

(function () {
  "use strict";

  /*
    GESTURE MODEL (STABLE, NO-DRIFT)
    - Translates touch movement into panel drag + snap.
    - panels.js owns rotation, wrap, and transforms.
    - MUST NOT hijack chart interactions: swipes starting on chart canvas/wrap are ignored.
    - CRITICAL: If a swipe is aborted (vertical scroll, lock, cancel, etc.), we MUST snap back
      to avoid leaving the deckTrack between panels (causes p0->p1 snapping to p2 on next swipe).
  */

  const deck = document.getElementById("panelDeck");
  if (!deck) return;

  let active = false;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let width = 1;
  let locked = false;

  // Once we have moved horizontally enough to start dragging, we must ensure we snap back on abort.
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
      return !!(window.VTPanels && typeof window.VTPanels.canSwipe === "function" && window.VTPanels.canSwipe());
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

  function snapBackIfNeeded() {
    // Use panels.js snap logic (ratio 0 => snap to current)
    try {
      if (window.VTPanels && typeof window.VTPanels.swipeEnd === "function") {
        window.VTPanels.swipeEnd(0);
      }
    } catch (_) {}
  }

  function resetGesture() {
    active = false;
    locked = false;
    didDrag = false;
  }

  function onStart(e) {
    if (!e.touches || e.touches.length !== 1) return;

    resetGesture();

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
    if (!e.touches || e.touches.length !== 1) return;

    // If panels says no swipe (state changed mid-gesture), abort safely.
    if (!canSwipeNow()) {
      locked = true;
      active = false;
      if (didDrag) snapBackIfNeeded();
      return;
    }

    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;

    const dx = x - startX;
    const dy = y - startY;

    // If user is moving more vertically than horizontally, treat as non-swipe.
    // IMPORTANT: If we already dragged, snap back to avoid deck drift.
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      locked = true;
      active = false;
      if (didDrag) snapBackIfNeeded();
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

  function finalizeSwipe(ratio) {
    try {
      if (window.VTPanels && typeof window.VTPanels.swipeEnd === "function") {
        window.VTPanels.swipeEnd(ratio);
      }
    } catch (_) {
      // If something throws during finalize, force a snap-back to avoid drift.
      snapBackIfNeeded();
    }
  }

  function onEnd() {
    if (!active) return;

    // If we were locked mid-gesture, ensure we don't leave the deck in a dragged state.
    if (locked) {
      active = false;
      if (didDrag) snapBackIfNeeded();
      return;
    }

    active = false;

    const dx = currentX - startX;
    const ratio = dx / width;

    // If we never actually dragged (noise), treat as snap-back.
    if (!didDrag) {
      finalizeSwipe(0);
      return;
    }

    finalizeSwipe(ratio);
  }

  function onCancel() {
    // Touch cancelled by OS/browser: always snap back if we dragged.
    const wasDragging = active && !locked && didDrag;
    active = false;
    locked = true;
    if (wasDragging) snapBackIfNeeded();
  }

  deck.addEventListener("touchstart", onStart, { passive: true });
  deck.addEventListener("touchmove", onMove, { passive: false });
  deck.addEventListener("touchend", onEnd, { passive: true });
  deck.addEventListener("touchcancel", onCancel, { passive: true });

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/gestures.js
Pass: Render Recovery + Swipe Feel
Pass order: File 6 of 9 (P0)
Prev file: js/panels.js (File 5 of 9)
Next file: js/chart.js (File 7 of 9)
*/
