/* File: js/panels.js
------------------------------------------------------------
Vitals Tracker — Panel Carousel Controller
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.021
Role: Panel navigation + swipe carousel
Authoritative Version Source: js/version.js

Change Log (v2.021)
- Implements horizontal swipe carousel for panels:
  Index order:
    0 = Home
    1 = Charts
    2 = Log
    3 = Settings (placeholder, may not yet exist)
- Continuous loop behavior:
    Swipe right from last panel → wraps to first
    Swipe left from first panel → wraps to last
- Explicit protection of chart interaction zone:
    • Swipes starting inside #canvasWrap are ignored here
    • Chart pinch/pan remains fully controlled by chart logic
- No vertical swipe handling (vertical gestures belong to scroll/chart)
- No visual logic, navigation only
------------------------------------------------------------
*/

(function () {
  if (!window.VTVersion) {
    console.error("VTVersion not found. version.js must load first.");
    return;
  }

  const PANELS = [
    "panelHome",
    "panelCharts",
    "panelLog",
    "panelSettings" // may not exist yet; safely ignored
  ];

  let currentIndex = 0;
  let startX = null;
  let startY = null;
  let tracking = false;

  const SWIPE_THRESHOLD = 48; // px horizontal movement required
  const VERTICAL_TOLERANCE = 32; // ignore if vertical movement dominates

  function getActiveIndex() {
    return currentIndex;
  }

  function setActiveIndex(idx) {
    const max = PANELS.length;
    currentIndex = (idx + max) % max;

    PANELS.forEach((id, i) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle("active", i === currentIndex);
    });
  }

  function isInProtectedZone(target) {
    return !!target.closest("#canvasWrap");
  }

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;

    const t = e.touches[0];
    if (isInProtectedZone(e.target)) return;

    startX = t.clientX;
    startY = t.clientY;
    tracking = true;
  }

  function onTouchMove(e) {
    if (!tracking || e.touches.length !== 1) return;

    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (Math.abs(dy) > Math.abs(dx) + VERTICAL_TOLERANCE) {
      tracking = false;
      return;
    }

    // do not preventDefault unless threshold crossed
  }

  function onTouchEnd(e) {
    if (!tracking) return;
    tracking = false;

    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (Math.abs(dy) > Math.abs(dx) + VERTICAL_TOLERANCE) return;

    if (dx < 0) {
      // swipe left → next panel
      setActiveIndex(currentIndex + 1);
    } else {
      // swipe right → previous panel
      setActiveIndex(currentIndex - 1);
    }
  }

  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("touchmove", onTouchMove, { passive: true });
  document.addEventListener("touchend", onTouchEnd, { passive: true });

  // expose minimal API for index sync if needed
  window.VTPanels = {
    getIndex: getActiveIndex,
    setIndex: setActiveIndex
  };
})();
