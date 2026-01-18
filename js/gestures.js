/* ======================================================================
File: /js/gestures.js
Vitals Tracker — Panel Carousel Gestures
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.020
File #: 2 of 7
Phase: Panel Navigation Foundation

Purpose
- Implements horizontal swipe navigation between panels as a continuous carousel.
- Order (fixed): Home = 0, Charts = 1, Log = 2, Settings = 3 (future).
- Swiping right advances (+1), swiping left reverses (-1).
- Wrap-around behavior: past last → first, before first → last.
- STRICT PROTECTION: gestures are disabled when the touch originates inside
  protected regions (e.g., chart canvas area) so chart pan/zoom is unaffected.
- No UI rendering, no styling, no chart logic here. Navigation only.

Touched by this file
- Reads: DOM panel elements via data-panel-index
- Emits: Custom event `vt:panelchange` with { index }
- Does NOT import or depend on other app modules.

Non-Negotiables
- Horizontal only (vertical movement ignored).
- No interference with chart gestures.
- One responsibility only: panel index calculation + dispatch.

====================================================================== */

(function () {
  "use strict";

  /* =========================
     CONFIG
  ========================= */
  const SWIPE_MIN_DISTANCE = 50;     // px
  const SWIPE_MAX_VERTICAL = 40;     // px
  const TOTAL_PANELS = 4;            // 0..3 (Settings reserved)

  /* =========================
     STATE
  ========================= */
  let startX = null;
  let startY = null;
  let active = false;

  /* =========================
     HELPERS
  ========================= */

  function isInProtectedRegion(target) {
    // Any element marked with data-gesture-lock blocks panel swipes
    // Chart wrapper MUST include this attribute.
    return !!target.closest("[data-gesture-lock]");
  }

  function getCurrentIndex() {
    const el = document.querySelector(".panel.active");
    if (!el) return 0;
    const idx = parseInt(el.getAttribute("data-panel-index"), 10);
    return Number.isInteger(idx) ? idx : 0;
  }

  function nextIndex(current, delta) {
    let n = current + delta;
    if (n < 0) n = TOTAL_PANELS - 1;
    if (n >= TOTAL_PANELS) n = 0;
    return n;
  }

  function dispatchPanelChange(index) {
    document.dispatchEvent(
      new CustomEvent("vt:panelchange", {
        detail: { index }
      })
    );
  }

  /* =========================
     TOUCH HANDLERS
  ========================= */

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    if (isInProtectedRegion(e.target)) return;

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    active = true;
  }

  function onTouchMove(e) {
    if (!active || e.touches.length !== 1) return;

    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    // Abort if vertical intent detected
    if (Math.abs(dy) > SWIPE_MAX_VERTICAL) {
      active = false;
    }
  }

  function onTouchEnd(e) {
    if (!active || startX === null) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    active = false;
    startX = startY = null;

    if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return;
    if (Math.abs(dy) > SWIPE_MAX_VERTICAL) return;

    const direction = dx < 0 ? +1 : -1;
    const current = getCurrentIndex();
    const target = nextIndex(current, direction);

    dispatchPanelChange(target);
  }

  /* =========================
     INIT
  ========================= */

  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("touchmove", onTouchMove, { passive: true });
  document.addEventListener("touchend", onTouchEnd, { passive: true });

})();
  
/* ======================================================================
EOF — /js/gestures.js
File #: 2 of 7
Implements carousel swipe navigation only.
Next file will consume `vt:panelchange` and apply panel visibility.
====================================================================== */
