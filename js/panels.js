/* File: js/panels.js */
/*
Vitals Tracker — Panel Controller
Copyright (c) 2026 Wendell K. Jiles.
All rights reserved.

App Version: (authority) js/version.js
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns panel activation and visibility.
- Fires lifecycle hooks (onShow / onHide) for panels.
- Does NOT render charts (chart.js).
- Does NOT render logs (log.js).
- Does NOT handle gestures (gestures.js).

v2.023f — Change Log (THIS FILE ONLY)
1) Centralized panel show/hide with lifecycle firing.
2) Ensures Charts and Log panels call onShow every time activated.
3) Clears passive "Loading..." states via lifecycle ownership.
4) Provides safe fallback behavior if modules are missing.

Schema position:
File 4 of 10
*/

(function (global) {
  "use strict";

  const PANEL_IDS = {
    home: "panelHome",
    add: "panelAdd",
    charts: "panelCharts",
    log: "panelLog",
    settings: "panelSettings"
  };

  let lastPanel = null;

  function $(id) {
    return document.getElementById(id);
  }

  function hideAllPanels() {
    Object.values(PANEL_IDS)
      .map($)
      .filter(Boolean)
      .forEach(p => p.classList.remove("active"));
  }

  function callOnHide(panelName) {
    try {
      if (panelName === "charts" && global.VTChart?.onHide) {
        global.VTChart.onHide();
      }
      if (panelName === "log" && global.VTLog?.onHide) {
        global.VTLog.onHide();
      }
    } catch (_) {}
  }

  function callOnShow(panelName) {
    try {
      if (panelName === "charts" && global.VTChart?.onShow) {
        global.VTChart.onShow();
      }
      if (panelName === "log" && global.VTLog?.onShow) {
        global.VTLog.onShow();
      }
    } catch (_) {}
  }

  function show(panelName) {
    const panelId = PANEL_IDS[panelName];
    const panelEl = panelId ? $(panelId) : null;
    if (!panelEl) return;

    if (lastPanel && lastPanel !== panelName) {
      callOnHide(lastPanel);
    }

    hideAllPanels();
    panelEl.classList.add("active");

    callOnShow(panelName);
    lastPanel = panelName;
  }

  function backFromSettings() {
    if (lastPanel && lastPanel !== "settings") {
      show(lastPanel);
    } else {
      show("home");
    }
  }

  // Expose API
  global.VTPanels = Object.freeze({
    show,
    backFromSettings
  });

})(window);

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/panels.js
App Version: (authority) js/version.js
Base: v2.021
Touched in: v2.023f (panel lifecycle restoration)
Schema order: File 4 of 10
*/
