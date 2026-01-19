/* File: js/ui.js */
/*
Vitals Tracker — UI Wiring / Lifecycle Glue
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023e
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
8) js/gestures.js
9) js/panels.js
10) js/ui.js   <-- THIS FILE (CURRENT)

FILE ROLE (LOCKED)
- Pure UI glue layer.
- Listens for panel changes and calls the owning module lifecycle hooks.
- No business logic.
- No chart math.
- No storage.
- No gesture detection.

OWNERSHIP RULES
- Panel routing → js/panels.js
- Chart rendering → js/chart.js
- Swipe detection → js/gestures.js
- Data → js/store.js / js/state.js

v2.023e — Change Log (THIS FILE ONLY)
1) Listens for "vt:panelChanged" events.
2) On Charts entry, calls VTChart.onShow().
3) On Charts exit, calls VTChart.onHide() (if present).
4) Keeps UI passive — never mutates data.
5) Defensive guards: missing modules never throw.

Schema position:
File 10 of 10 (end of current pass)
*/

(function () {
  "use strict";

  let lastPanel = null;

  function safe(fn) {
    try { fn(); } catch (_) {}
  }

  function onPanelChanged(e) {
    const active = e && e.detail && e.detail.active;
    if (!active) return;

    // Charts lifecycle
    if (active === "charts") {
      safe(() => {
        if (window.VTChart && typeof window.VTChart.onShow === "function") {
          window.VTChart.onShow();
        }
      });
    }

    if (lastPanel === "charts" && active !== "charts") {
      safe(() => {
        if (window.VTChart && typeof window.VTChart.onHide === "function") {
          window.VTChart.onHide();
        }
      });
    }

    lastPanel = active;
  }

  function init() {
    document.addEventListener("vt:panelChanged", onPanelChanged);
  }

  // DOM ready helper
  function onReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  onReady(init);

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/ui.js
App Version: v2.023e
Base: v2.021
Touched in v2.023e: js/ui.js (panel lifecycle wiring)
End of current upgrade pass (Files 1–10 complete)
Next step: verify chart interactivity, then re-enable Add/Input flow.
*/
