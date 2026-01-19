/* File: js/gestures.js */
/*
Vitals Tracker — Panel Swipe Gestures (OWNER)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023f
Base: v2.021
Date: 2026-01-18

CURRENT UPGRADE — FILE TOUCH ORDER (LOCKED)
1) index.html
2) js/version.js
3) js/app.js
4) js/storage.js
5) js/store.js
6) js/state.js
7) js/chart.js
8) js/gestures.js  <-- THIS FILE
9) js/panels.js
10) js/ui.js

SCOPE (THIS MOMENT)
- Fix swipe to be SIMPLE and consistent.
- Settings is NOT in rotation. Settings is gear-only.
- Swipe anywhere on the active panel EXCEPT protected regions (chart + form controls + buttons).
- No “swipe zones”. No wraparound. No accidental swipes while interacting with chart or inputs.

ROTATION (authoritative)
Home ↔ Add ↔ Charts ↔ Log
Settings excluded.

FILE ROLE (LOCKED)
- Owns horizontal panel swipe between core panels only.
- Must NOT implement chart pan/zoom (chart.js owns that).
- Must NOT implement panel show/hide rules long-term (panels.js owns that), but may fall back safely.

v2.023f — Change Log (THIS FILE ONLY)
1) Removes swipe-zone gating entirely (swipe works across panel background).
2) Enforces protected islands:
   - Chart area (#canvasWrap / #chartCanvas) is NEVER a swipe start.
   - Inputs/textareas/select/contenteditable are NEVER swipe starts.
   - Buttons/links (.btn, button, a) are NEVER swipe starts.
3) Rotation excludes Settings and DOES NOT wrap.
*/

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  const root = $("panelsRoot");
  if (!root) return;

  const canvasWrap = $("canvasWrap");
  const chartCanvas = $("chartCanvas");

  // Rotation excludes settings by design.
  const ORDER = ["home", "add", "charts", "log"];

  // Gesture tuning
  const THRESH_PX = 44;            // required horizontal travel
  const INTENT_PX = 18;            // intent detection
  const H_OVER_V = 1.25;           // must be dominantly horizontal

  function within(container, target) {
    if (!container || !target) return false;
    return container === target || container.contains(target);
  }

  function closestAny(el, selectors) {
    if (!el || !el.closest) return null;
    for (const s of selectors) {
      const hit = el.closest(s);
      if (hit) return hit;
    }
    return null;
  }

  function isProtectedStart(target) {
    // 1) Chart interaction must win
    if (within(canvasWrap, target) || within(chartCanvas, target)) return true;

    // 2) Any form controls (avoid accidental swipe while entering data)
    if (closestAny(target, ["input", "textarea", "select", "[contenteditable='true']"])) return true;

    // 3) Buttons/links (taps should stay taps)
    if (closestAny(target, ["button", "a", ".btn"])) return true;

    // 4) Optional explicit opt-out hook
    if (closestAny(target, ["[data-noswipe='1']"])) return true;

    return false;
  }

  function getActivePanelName() {
    // Prefer panels module
    try {
      if (window.VTPanels && typeof window.VTPanels.getActive === "function") {
        const a = window.VTPanels.getActive();
        if (a) return a;
      }
    } catch (_) {}

    // Fallback: DOM
    if ($("panelHome")?.classList.contains("active")) return "home";
    if ($("panelAdd")?.classList.contains("active")) return "add";
    if ($("panelCharts")?.classList.contains("active")) return "charts";
    if ($("panelLog")?.classList.contains("active")) return "log";
    if ($("panelSettings")?.classList.contains("active")) return "settings";
    return "home";
  }

  function showPanel(name) {
    // Prefer panels module
    try {
      if (window.VTPanels && typeof window.VTPanels.setActive === "function") {
        window.VTPanels.setActive(name);
        return;
      }
    } catch (_) {}

    // Fallback: DOM toggle
    const map = {
      home: "panelHome",
      add: "panelAdd",
      charts: "panelCharts",
      log: "panelLog",
      settings: "panelSettings"
    };

    const allIds = ["panelHome", "panelAdd", "panelCharts", "panelLog", "panelSettings"];
    for (const id of allIds) {
      const el = $(id);
      if (el) el.classList.toggle("active", map[name] === id);
    }

    // On entering charts, request render
    if (name === "charts") {
      try { window.VTChart?.onShow?.(); } catch (_) {}
    }
  }

  function move(delta) {
    const active = getActivePanelName();

    // Settings is gear-only; do not swipe in/out of it.
    if (active === "settings") return;

    const idx = ORDER.indexOf(active);
    if (idx < 0) return;

    const nextIdx = idx + delta;

    // No wraparound
    if (nextIdx < 0 || nextIdx >= ORDER.length) return;

    showPanel(ORDER[nextIdx]);
  }

  const swipe = {
    active: false,
    sx: 0,
    sy: 0,
    mode: null,    // "h" | "v" | null
    ok: false
  };

  root.addEventListener("touchstart", (e) => {
    if (!e.touches || e.touches.length !== 1) return;

    const t = e.touches[0];
    swipe.active = true;
    swipe.sx = t.clientX;
    swipe.sy = t.clientY;
    swipe.mode = null;
    swipe.ok = !isProtectedStart(e.target);
  }, { passive: true });

  root.addEventListener("touchmove", (e) => {
    if (!swipe.active || !swipe.ok) return;
    if (!e.touches || e.touches.length !== 1) return;

    const t = e.touches[0];
    const dx = t.clientX - swipe.sx;
    const dy = t.clientY - swipe.sy;

    if (!swipe.mode) {
      if (Math.abs(dx) > INTENT_PX && Math.abs(dx) > Math.abs(dy) * H_OVER_V) {
        swipe.mode = "h";
      } else if (Math.abs(dy) > INTENT_PX && Math.abs(dy) > Math.abs(dx) * H_OVER_V) {
        swipe.mode = "v";
      }
    }

    // If we committed to horizontal swipe, prevent vertical scroll bounce.
    if (swipe.mode === "h") {
      e.preventDefault();
    }
  }, { passive: false });

  root.addEventListener("touchend", (e) => {
    if (!swipe.active) return;

    const ok = swipe.ok;
    const mode = swipe.mode;

    swipe.active = false;
    swipe.ok = false;
    swipe.mode = null;

    if (!ok || mode !== "h") return;

    const t = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
    if (!t) return;

    const dx = t.clientX - swipe.sx;
    const dy = t.clientY - swipe.sy;

    // Require strong horizontal intent at release
    if (Math.abs(dx) < THRESH_PX) return;
    if (Math.abs(dx) < Math.abs(dy) * H_OVER_V) return;

    // dx < 0 means swipe left → move forward
    if (dx < 0) move(+1);
    else move(-1);
  }, { passive: true });

  root.addEventListener("touchcancel", () => {
    swipe.active = false;
    swipe.ok = false;
    swipe.mode = null;
  }, { passive: true });

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/gestures.js
App Version: v2.023f
Base: v2.021
Touched in v2.023f: js/gestures.js (simplified swipe; settings excluded; protected islands)
Rotation: home <-> add <-> charts <-> log (no wrap)
Next planned file: js/panels.js (File 9 of 10)
*/
