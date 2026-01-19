/* File: js/panels.js */
/*
Vitals Tracker — Panel Controller

Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version Authority: js/version.js
Base: v2.025e

FILE ROLE (LOCKED)
- Canonical panel state controller.
- Owns which panel is active.
- Owns swipe index and panel order.
- Coordinates with gestures.js for movement input.
- Does NOT render charts or logs directly.
- Does NOT manage data.

CURRENT FIX SCOPE
- Restore reliable panel activation.
- Ensure Charts + Log panels call their onShow hooks.
- Provide foundation for smoother “liquid” swipe (position-based, not jump).

Pass: Render Recovery + Swipe Feel
Pass order: File 9 of 9
Prev file: js/store.js (File 8 of 9)
*/

(function () {
  "use strict";

  var panels = ["home", "add", "charts", "log", "settings"];
  var activeIndex = 0;

  function $(id) {
    return document.getElementById(id);
  }

  function panelId(name) {
    return "panel" + name.charAt(0).toUpperCase() + name.slice(1);
  }

  function getPanelEl(name) {
    return $(panelId(name));
  }

  function hideAll() {
    panels.forEach(function (p) {
      var el = getPanelEl(p);
      if (el) el.classList.remove("active");
    });
  }

  function show(name) {
    var idx = panels.indexOf(name);
    if (idx === -1) return;

    activeIndex = idx;
    hideAll();

    var el = getPanelEl(name);
    if (el) el.classList.add("active");

    // Lifecycle hooks
    if (name === "charts" && window.VTChart && typeof window.VTChart.onShow === "function") {
      window.VTChart.onShow();
    }

    if (name === "log" && window.VTLog && typeof window.VTLog.onShow === "function") {
      window.VTLog.onShow();
    }
  }

  function current() {
    return panels[activeIndex];
  }

  function next() {
    if (activeIndex < panels.length - 1) {
      show(panels[activeIndex + 1]);
    }
  }

  function prev() {
    if (activeIndex > 0) {
      show(panels[activeIndex - 1]);
    }
  }

  function backFromSettings() {
    // Always return to Home unless future history tracking added
    show("home");
  }

  function setIndex(idx) {
    if (idx < 0 || idx >= panels.length) return;
    show(panels[idx]);
  }

  window.VTPanels = {
    show: show,
    next: next,
    prev: prev,
    current: current,
    backFromSettings: backFromSettings,
    setIndex: setIndex,
    getIndex: function () {
      return activeIndex;
    },
    getOrder: function () {
      return panels.slice();
    }
  };

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/panels.js
App Version Authority: js/version.js
Pass: Render Recovery + Swipe Feel
Pass order: File 9 of 9
*/
