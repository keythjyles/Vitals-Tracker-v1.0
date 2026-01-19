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
    GESTURE MODEL (SIMPLIFIED, LIQUID)
    - Translates touch movement into panel drag + snap.
    - NO panel decisions here (panels.js owns rotation + wrap + activation).
    - MUST NOT hijack chart interactions: swipes starting on chart canvas/wrap are ignored.
  */

  const deck = document.getElementById("panelDeck");
  if (!deck) return;

  let active = false;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let width = 0;
  let locked = false; // locked = we decided this gesture is NOT a horizontal swipe

  function inChartRegion(target) {
    try {
      if (!target) return false;
      return !!target.closest("#chartCanvas, .chartWrap, .chartCard");
    } catch (_) {
      return false;
    }
  }

  function shouldIgnoreStart(e) {
    // If starting on chart, do not swipe panels (allow chart interactions)
    const t = e.target;
    if (inChartRegion(t)) return true;

    // If panels says swiping is currently disabled, ignore
    if (window.VTPanels && typeof window.VTPanels.canSwipe === "function") {
      return !window.VTPanels.canSwipe();
    }
    return false;
  }

  function onStart(e) {
    if (!e.touches || e.touches.length !== 1) return;

    locked = false;
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

    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;

    const dx = x - startX;
    const dy = y - startY;

    // If user is moving more vertically than horizontally, treat as non-swipe.
    // (Home pull-down handled elsewhere; we don't block it.)
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      locked = true;
      active = false;
      return;
    }

    currentX = x;
    const ratio = dx / width;

    if (window.VTPanels && window.VTPanels.swipeDelta) {
      window.VTPanels.swipeDelta(ratio);
    }

    // Only preventDefault when we're actively dragging horizontally
    e.preventDefault();
  }

  function onEnd() {
    if (!active) return;
    if (locked) { active = false; return; }

    active = false;

    const dx = currentX - startX;
    const ratio = dx / width;

    if (window.VTPanels && window.VTPanels.swipeEnd) {
      window.VTPanels.swipeEnd(ratio);
    }
  }

  deck.addEventListener("touchstart", onStart, { passive: true });
  deck.addEventListener("touchmove", onMove, { passive: false });
  deck.addEventListener("touchend", onEnd, { passive: true });
  deck.addEventListener("touchcancel", onEnd, { passive: true });

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/gestures.js
Pass: Render Recovery + Swipe Feel
Pass order: File 6 of 9 (P0)
Prev file: js/panels.js (File 5 of 9)
Next file: js/chart.js (File 7 of 9)
*/
