/* File: js/gestures.js */
/*
Vitals Tracker — Gestures (Panel Swipe ONLY)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.025c
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns ONLY: horizontal swipe between main panels (home <-> charts <-> log).
- Settings is NOT part of swipe rotation.
- Chart pan/zoom belongs ONLY to chart.js and must win inside the chart area.

DESIGN (SIMPLE, RELIABLE)
- Swipe works from anywhere on the app EXCEPT inside the chart interaction region.
- No "zones". No header-only constraints. Those are unreliable on mobile.
- Swipe triggers only when:
    - single finger
    - horizontal intent dominates vertical
    - distance threshold exceeded
- Does NOT block normal vertical scroll unless we have clearly committed to horizontal swipe.

HARD RULES
- Never swipe when user starts gesture inside #canvasWrap (chart).
- Never swipe while active panel is "settings".
*/

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  const root = $("panelsRoot") || document.body;
  const canvasWrap = $("canvasWrap");

  function within(el, target) {
    if (!el || !target) return false;
    return el === target || el.contains(target);
  }

  function getActivePanelName() {
    try {
      if (window.VTPanels && typeof window.VTPanels.getActive === "function") {
        return window.VTPanels.getActive();
      }
    } catch (_) {}
    // Fallback by DOM classes
    if ($("panelHome")?.classList.contains("active")) return "home";
    if ($("panelCharts")?.classList.contains("active")) return "charts";
    if ($("panelLog")?.classList.contains("active")) return "log";
    if ($("panelSettings")?.classList.contains("active")) return "settings";
    if ($("panelAdd")?.classList.contains("active")) return "add";
    return "home";
  }

  function goNext() {
    if (window.VTPanels?.next) return window.VTPanels.next();
  }
  function goPrev() {
    if (window.VTPanels?.prev) return window.VTPanels.prev();
  }

  // Gesture state
  const G = {
    active: false,
    sx: 0,
    sy: 0,
    lastX: 0,
    lastY: 0,
    mode: null,     // null | "h" | "v"
    ok: false
  };

  // Tunables
  const INTENT_PX = 14;     // pixels to decide intent
  const SWIPE_PX = 48;      // pixels to trigger panel change
  const DOMINANCE = 1.25;   // dx must exceed dy * DOMINANCE

  function swipeAllowed(target) {
    const active = getActivePanelName();

    // Never swipe in/out of settings
    if (active === "settings") return false;

    // Optional: do not swipe from add panel (you have explicit buttons there)
    if (active === "add") return false;

    // Chart interaction region is protected
    if (canvasWrap && within(canvasWrap, target)) return false;

    return true;
  }

  root.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) return;

    const t = e.touches[0];
    G.active = true;
    G.sx = G.lastX = t.clientX;
    G.sy = G.lastY = t.clientY;
    G.mode = null;
    G.ok = swipeAllowed(e.target);
  }, { passive: true });

  root.addEventListener("touchmove", function (e) {
    if (!G.active || !G.ok) return;
    if (e.touches.length !== 1) return;

    const t = e.touches[0];
    const x = t.clientX;
    const y = t.clientY;

    const dx = x - G.sx;
    const dy = y - G.sy;

    // Decide intent
    if (!G.mode) {
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      if (adx > INTENT_PX && adx > ady * DOMINANCE) G.mode = "h";
      else if (ady > INTENT_PX && ady > adx * DOMINANCE) G.mode = "v";
    }

    // Once we commit to horizontal swipe, prevent scroll
    if (G.mode === "h") {
      e.preventDefault();
    }

    G.lastX = x;
    G.lastY = y;
  }, { passive: false });

  root.addEventListener("touchend", function (e) {
    if (!G.active) return;
    G.active = false;

    if (!G.ok) return;
    if (G.mode !== "h") return;

    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;

    const dx = t.clientX - G.sx;
    if (Math.abs(dx) < SWIPE_PX) return;

    // Left swipe => next, right swipe => prev
    if (dx < 0) goNext();
    else goPrev();
  }, { passive: true });

})();
