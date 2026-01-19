/* File: js/gestures.js */
/*
Vitals Tracker - Gesture Driver

App Version Authority: js/version.js
Base: v2.025e

FILE ROLE (LOCKED)
- Owns touch/pointer gesture capture.
- Converts gestures into drag deltas and release events.
- Delegates all panel motion to VTPanels (panels.js).
- Must NOT render charts/logs.
- Must NOT decide which panel is "next" beyond handing deltas.

IMPORTANT UX GOAL
- Liquid drag: panel track follows finger 1:1 during drag.
- Clean release: snap handled by panels.js.
- Protect interactive areas: do not hijack gestures that start inside chart canvas
  or inside scrollable content that is actively scrolling vertically.

Pass: Render Recovery + Swipe Feel
Pass order: File 5 of 9
Prev file: js/panels.js (File 4 of 9)
Next file: js/chart.js (File 6 of 9)
*/

(function () {
  "use strict";

  var root = null;

  var active = false;
  var startX = 0;
  var startY = 0;
  var lastX = 0;
  var lastY = 0;

  var dragging = false;
  var axisLocked = false;
  var lockAxis = null; // "x" or "y"

  var pointerId = null;

  function $(id) {
    return document.getElementById(id);
  }

  function now() {
    return Date.now();
  }

  function isInside(el, selector) {
    if (!el) return false;
    if (el.closest) return !!el.closest(selector);
    return false;
  }

  function isProtectedTarget(target) {
    // Do not capture swipes that start on chart canvas or inside elements
    // that must receive touch gestures (future pinch/zoom, etc.).
    if (!target) return false;

    // Chart canvas / chart region
    if (isInside(target, "#chartCanvas")) return true;
    if (isInside(target, ".chartCanvas")) return true;
    if (isInside(target, "[data-gesture-protect='1']")) return true;

    // Inputs/buttons should not start a panel swipe if user is interacting
    var tag = (target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (tag === "button") return true;

    return false;
  }

  function getPoint(e) {
    if (e.touches && e.touches.length) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function onStart(e) {
    if (!window.VTPanels || typeof window.VTPanels.onDrag !== "function") return;

    var target = e.target;

    if (isProtectedTarget(target)) {
      active = false;
      return;
    }

    // Only left button for mouse
    if (e.type === "mousedown" && e.button !== 0) return;

    active = true;
    dragging = false;
    axisLocked = false;
    lockAxis = null;

    var p = getPoint(e);
    startX = p.x;
    startY = p.y;
    lastX = p.x;
    lastY = p.y;

    pointerId = e.pointerId != null ? e.pointerId : null;

    // Capture pointer so we keep receiving move events
    try {
      if (e.target && e.target.setPointerCapture && pointerId != null) {
        e.target.setPointerCapture(pointerId);
      }
    } catch (_) {}
  }

  function onMove(e) {
    if (!active) return;

    var p = getPoint(e);
    var dx = p.x - startX;
    var dy = p.y - startY;

    // Decide axis lock early, but not immediately (avoid micro jitter)
    if (!axisLocked) {
      var adx = Math.abs(dx);
      var ady = Math.abs(dy);

      // If user moves more than a small slop, lock axis
      if (adx + ady > 8) {
        axisLocked = true;
        lockAxis = adx >= ady ? "x" : "y";
      } else {
        return; // not enough movement yet
      }
    }

    // If vertical, do not hijack - allow page/panel scrolling
    if (lockAxis === "y") {
      active = false;
      dragging = false;
      return;
    }

    // Horizontal drag begins
    dragging = true;

    // Prevent browser back/forward swipe / page scroll
    try {
      e.preventDefault();
    } catch (_) {}

    // 1:1 drag to panels
    window.VTPanels.onDrag(dx);

    lastX = p.x;
    lastY = p.y;
  }

  function onEnd(e) {
    if (!active) return;

    var p = getPoint(e);
    var dx = p.x - startX;

    // Only finalize if we were actually dragging horizontally
    if (dragging && window.VTPanels && typeof window.VTPanels.onRelease === "function") {
      window.VTPanels.onRelease(dx);
    }

    active = false;
    dragging = false;
    axisLocked = false;
    lockAxis = null;
    pointerId = null;
  }

  function init() {
    // Root gesture surface - prefer deck wrapper, else body
    root = $("deck") || document.body;

    if (!root) return;

    // Use Pointer Events when available
    if (window.PointerEvent) {
      root.addEventListener("pointerdown", onStart, { passive: true });
      root.addEventListener("pointermove", onMove, { passive: false });
      root.addEventListener("pointerup", onEnd, { passive: true });
      root.addEventListener("pointercancel", onEnd, { passive: true });
    } else {
      // Touch fallback
      root.addEventListener("touchstart", onStart, { passive: true });
      root.addEventListener("touchmove", onMove, { passive: false });
      root.addEventListener("touchend", onEnd, { passive: true });
      root.addEventListener("touchcancel", onEnd, { passive: true });

      // Mouse fallback
      root.addEventListener("mousedown", onStart, false);
      window.addEventListener("mousemove", onMove, false);
      window.addEventListener("mouseup", onEnd, false);
    }
  }

  window.VTGestures = {
    init: init
  };

})();

/*
Vitals Tracker - EOF Version Notes
File: js/gestures.js
Pass order: File 5 of 9
Prev file: js/panels.js
Next file: js/chart.js
*/
