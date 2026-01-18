/* File: js/app.js */
/*
Vitals Tracker — Core App Bootstrap & Wiring
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023b
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Central application bootstrap.
- Wires version authority, panels, charts, log, and UI without owning their logic.
- NO rendering logic here. NO chart math here. NO gesture math here.
- This file only coordinates modules and lifecycle.

v2.023b — Change Log (THIS FILE ONLY)
1) Reads canonical version from js/version.js (VTVersion).
2) Sets version text in UI (boot + home footer) safely.
3) Calls module lifecycle hooks if present:
   - VTChart.onShow()
   - VTLog.onShow()
4) Does NOT mutate chart logic, storage, or gestures.
5) Safe if some modules are missing (guards everywhere).

ANTI-DRIFT RULES
- Do NOT put chart code here.
- Do NOT put gesture code here.
- Do NOT hard-code version strings.
- If something breaks, fix the owning module, not app.js.

Schema position:
File 3 of 10

Previous file:
File 2 — js/version.js

Next file:
File 4 — js/storage.js
*/

(function () {
  "use strict";

  // ---- Version Authority ----
  const version = (window.VTVersion && VTVersion.getVersionString)
    ? VTVersion.getVersionString()
    : "v?.???";

  function setVersionText() {
    try {
      const boot = document.getElementById("bootText");
      const home = document.getElementById("homeVersion");
      if (boot) boot.textContent = `BOOT OK ${version}`;
      if (home) home.textContent = version;
    } catch (_) {}
  }

  // ---- Panel Lifecycle Hooks ----
  function onPanelShow(panelName) {
    try {
      if (panelName === "charts" && window.VTChart && VTChart.onShow) {
        VTChart.onShow();
      }
      if (panelName === "log" && window.VTLog && VTLog.onShow) {
        VTLog.onShow();
      }
    } catch (_) {}
  }

  // ---- Listen for panel changes (from panels.js) ----
  document.addEventListener("vt:panelChanged", function (e) {
    if (!e || !e.detail) return;
    onPanelShow(e.detail.active);
  });

  // ---- DOM Ready ----
  function onReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  onReady(function () {
    setVersionText();

    // Initial panel show (Home)
    onPanelShow("home");
  });

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/app.js
App Version: v2.023b
Base: v2.021
Touched in v2.023b: js/app.js
Schema order: File 3 of 10
Next planned file: js/storage.js (File 4)
*/
