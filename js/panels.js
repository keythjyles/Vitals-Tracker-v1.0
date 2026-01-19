/* File: js/panels.js */
/*
Vitals Tracker — Panel Router & Carousel Controller
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023c
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns panel visibility, order, and carousel-style navigation.
- Enforces continuous looping (wrap-around) behavior.
- Dispatches lifecycle events so other modules (charts, log) can react.
- NO chart logic. NO storage logic. NO gesture math.

v2.023c — Change Log (THIS FILE ONLY)
1) Restores canonical panel order and looping behavior:
   Order: home → charts → log → settings → (wraps to home)
2) Adds goStep(+1 / -1) API for gestures.js.
3) Emits `vt:panelChanged` CustomEvent with `{ active }`.
4) Ensures only ONE panel is aria-visible at any time.
5) Safe no-op if panels are missing (defensive for partial builds).

Schema position:
File 9 of 10

Previous file:
File 8 — js/gestures.js

Next file:
File 10 — js/log.js
*/

(function () {
  "use strict";

  // ---- Canonical panel order (LOCKED) ----
  const PANEL_ORDER = ["home", "charts", "log", "settings"];

  const PANEL_IDS = {
    home: "homePanel",
    charts: "chartsPanel",
    log: "logPanel",
    settings: "settingsPanel",
  };

  let active = "home";

  function el(id) {
    return document.getElementById(id);
  }

  function hideAll() {
    for (const key of PANEL_ORDER) {
      const p = el(PANEL_IDS[key]);
      if (p) {
        p.setAttribute("aria-hidden", "true");
        p.style.display = "none";
      }
    }
  }

  function show(name) {
    const id = PANEL_IDS[name];
    const p = el(id);
    if (!p) return;

    hideAll();

    p.style.display = "";
    p.setAttribute("aria-hidden", "false");
    active = name;

    // Notify listeners (app.js, charts, log)
    try {
      document.dispatchEvent(
        new CustomEvent("vt:panelChanged", {
          detail: { active: name }
        })
      );
    } catch (_) {}
  }

  function goTo(name) {
    if (!PANEL_ORDER.includes(name)) return;
    show(name);
  }

  function goStep(step) {
    const idx = PANEL_ORDER.indexOf(active);
    const len = PANEL_ORDER.length;
    if (idx < 0) {
      show(PANEL_ORDER[0]);
      return;
    }
    let next = (idx + step) % len;
    if (next < 0) next += len;
    show(PANEL_ORDER[next]);
  }

  function getActive() {
    return active;
  }

  function init() {
    // On boot, show home by default
    show(active);
  }

  // ---- Expose API ----
  window.VTPanels = {
    init,
    goTo,
    goStep,
    getActive,
    order: PANEL_ORDER.slice()
  };

  // ---- Auto-init on DOM ready ----
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(init, 0);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/panels.js
App Version: v2.023c
Base: v2.021
Touched in v2.023c: js/panels.js (panel carousel + lifecycle restore)
Schema order: File 9 of 10
Next planned file: js/log.js (File 10)
*/
