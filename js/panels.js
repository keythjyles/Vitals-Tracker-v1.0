/* File: js/panels.js */
/*
Vitals Tracker — Panel Controller
Copyright (c) 2026 Wendell K. Jiles.
All rights reserved.

App Version: v2.025e
Base: v2.025d
Date: 2026-01-18

Schema position:
File 9 of 10

Former file:
File 8 — js/log.js

Next file:
File 10 — js/version.js

FILE ROLE (LOCKED)
- Owns panel visibility and active panel state.
- Owns panel rotation (left / right).
- Dispatches onShow() for panels that require activation.
- Does NOT render content itself.
- Does NOT handle gestures directly (gestures.js owns swipe detection).
- Does NOT touch storage, charts, or settings.

ANTI-DRIFT RULES
- Do NOT add settings logic here.
- Do NOT add chart rendering logic here.
- Do NOT add storage access here.
*/

(function () {
  "use strict";

  const PANELS = ["home", "charts", "log"];
  let activeIndex = 0;

  function $(id) {
    return document.getElementById(id);
  }

  function hideAllPanels() {
    for (const id of PANELS) {
      const el = $(`panel-${id}`);
      if (el) el.style.display = "none";
    }
  }

  function showPanelByIndex(idx) {
    if (idx < 0 || idx >= PANELS.length) return;

    hideAllPanels();

    const id = PANELS[idx];
    const el = $(`panel-${id}`);
    if (el) el.style.display = "block";

    activeIndex = idx;

    dispatchOnShow(id);
  }

  function dispatchOnShow(panelId) {
    try {
      if (panelId === "charts" && window.VTChart?.onShow) {
        window.VTChart.onShow();
      }

      if (panelId === "log" && window.VTLog?.onShow) {
        window.VTLog.onShow();
      }
    } catch (e) {
      console.warn("Panel onShow dispatch error:", panelId, e);
    }
  }

  function rotateLeft() {
    const next = (activeIndex - 1 + PANELS.length) % PANELS.length;
    showPanelByIndex(next);
  }

  function rotateRight() {
    const next = (activeIndex + 1) % PANELS.length;
    showPanelByIndex(next);
  }

  function goHome() {
    showPanelByIndex(0);
  }

  function init() {
    // Initial panel is Home
    showPanelByIndex(0);
  }

  // Public API
  window.VTPanels = {
    init,
    rotateLeft,
    rotateRight,
    goHome,
    showPanelByIndex,
    getActivePanel: () => PANELS[activeIndex]
  };
})();
