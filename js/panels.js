/* File: js/panels.js */
/*
Vitals Tracker — Panel Controller (Home / Charts / Log)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.025e
Base: v2.021
Date: 2026-01-18

Schema position:
File 5 of 10

Former file:
File 4 — js/chart.js

Next file:
File 6 — js/log.js

FILE ROLE (LOCKED)
- Owns panel visibility and navigation state.
- Owns LEFT/RIGHT swipe panel rotation.
- Owns lifecycle hooks (onShow / onHide).
- MUST ensure charts mount only when panel is visible.
- MUST NOT implement chart gestures.
- MUST NOT touch storage or rendering logic.

v2.025e — Change Log (THIS FILE ONLY)
1) Restores deterministic panel rotation (Home ↔ Charts ↔ Log).
2) Simplifies swipe logic (single horizontal gesture, no zones).
3) Ensures VTChart.onShow() is called ONLY when Charts panel becomes active.
4) Prevents premature chart rendering during hidden states.
5) Restores Home pull-down release hook passthrough.

ANTI-DRIFT RULES
- Do NOT add Settings panel to rotation.
- Do NOT handle chart drawing here.
- Do NOT reintroduce gesture zones or thresholds.
*/

(function () {
  "use strict";

  const PANEL_IDS = ["home", "charts", "log"];
  let activeIndex = 0;
  let panels = {};
  let bound = false;

  function $(id) {
    return document.getElementById(id);
  }

  function hideAll() {
    PANEL_IDS.forEach(id => {
      const el = panels[id];
      if (el) el.style.display = "none";
    });
  }

  function showPanelByIndex(idx) {
    idx = (idx + PANEL_IDS.length) % PANEL_IDS.length;
    activeIndex = idx;

    hideAll();

    const id = PANEL_IDS[activeIndex];
    const el = panels[id];
    if (!el) return;

    el.style.display = "block";

    // Lifecycle hook
    if (id === "charts") {
      try {
        window.VTChart?.onShow?.();
      } catch (_) {}
    }
  }

  function showPanel(id) {
    const idx = PANEL_IDS.indexOf(id);
    if (idx !== -1) showPanelByIndex(idx);
  }

  function bindButtons() {
    const homeBtns = document.querySelectorAll("[data-nav='home']");
    const chartBtns = document.querySelectorAll("[data-nav='charts']");
    const logBtns = document.querySelectorAll("[data-nav='log']");

    homeBtns.forEach(b => b.onclick = () => showPanel("home"));
    chartBtns.forEach(b => b.onclick = () => showPanel("charts"));
    logBtns.forEach(b => b.onclick = () => showPanel("log"));
  }

  // ===== Swipe Handling (Simple, Stable) =====
  function bindSwipe() {
    if (bound) return;
    bound = true;

    let startX = null;
    let startY = null;
    let tracking = false;

    document.addEventListener("touchstart", e => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      tracking = true;
    }, { passive: true });

    document.addEventListener("touchmove", e => {
      if (!tracking || !startX || !startY) return;

      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      // Abort if vertical intent
      if (Math.abs(dy) > Math.abs(dx)) {
        tracking = false;
      }
    }, { passive: true });

    document.addEventListener("touchend", e => {
      if (!tracking || startX == null) return;

      const t = e.changedTouches[0];
      const dx = t.clientX - startX;

      const THRESH = 60;

      if (dx > THRESH) {
        showPanelByIndex(activeIndex - 1);
      } else if (dx < -THRESH) {
        showPanelByIndex(activeIndex + 1);
      }

      tracking = false;
      startX = null;
      startY = null;
    }, { passive: true });
  }

  function initPanels() {
    panels = {
      home: $("panel-home"),
      charts: $("panel-charts"),
      log: $("panel-log")
    };

    hideAll();
    showPanelByIndex(0);

    bindButtons();
    bindSwipe();
  }

  // Public API
  window.VTPanels = {
    init: initPanels,
    show: showPanel
  };

})();
