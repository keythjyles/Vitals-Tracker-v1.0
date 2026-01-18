/* File: js/panels.js */
/*
Vitals Tracker — Panel Carousel Controller
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023c
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Owns panel visibility and carousel logic ONLY.
- Listens to gesture events emitted by js/gestures.js.
- Provides a single source of truth for which panel is active.
- Does NOT implement gestures, charts, storage, or UI rendering.

v2.023c — Change Log (THIS FILE ONLY)
1) Restores deterministic carousel order and wraparound.
2) Listens for VT:swipeNext / VT:swipePrev events.
3) Centralizes panel activation (add/remove .active).
4) Emits lifecycle hooks for panels (onShow callbacks).
5) Fixes drift where panels could desync from gesture state.

ANTI-DRIFT RULES
- Do NOT detect gestures here.
- Do NOT draw charts here.
- Do NOT read/write storage here.
- Panel IDs and order are CONTRACTUAL.

Schema position:
File 9 of 10

Previous file:
File 8 — js/gestures.js

Next file:
File 10 — js/ui.js
*/

(function () {
  "use strict";

  const VERSION = "v2.023c";

  /* ===== Panel contract ===== */
  const PANEL_ORDER = [
    "panelHome",     // 0
    "panelCharts",   // 1
    "panelLog",      // 2
    "panelSettings"  // 3
  ];

  const PANELS = {};
  PANEL_ORDER.forEach(id => {
    const el = document.getElementById(id);
    if (el) PANELS[id] = el;
  });

  let activeIndex = 0; // default Home
  let lastNonSettingsIndex = 0;

  /* ===== Helpers ===== */
  function showPanelByIndex(idx){
    if (idx < 0 || idx >= PANEL_ORDER.length) return;

    PANEL_ORDER.forEach((id, i) => {
      const el = PANELS[id];
      if (!el) return;
      el.classList.toggle("active", i === idx);
    });

    if (PANEL_ORDER[idx] !== "panelSettings"){
      lastNonSettingsIndex = idx;
    }

    activeIndex = idx;

    // Lifecycle hook: onShow
    const panelId = PANEL_ORDER[idx];
    try{
      if (panelId === "panelCharts" &&
          window.VTChart &&
          typeof window.VTChart.onShow === "function") {
        window.VTChart.onShow();
      }
    }catch(_){}
  }

  function next(){
    const nextIndex = (activeIndex + 1) % PANEL_ORDER.length;
    showPanelByIndex(nextIndex);
  }

  function prev(){
    const prevIndex =
      (activeIndex - 1 + PANEL_ORDER.length) % PANEL_ORDER.length;
    showPanelByIndex(prevIndex);
  }

  function goHome(){
    showPanelByIndex(0);
  }

  function goCharts(){
    showPanelByIndex(1);
  }

  function goLog(){
    showPanelByIndex(2);
  }

  function openSettings(){
    showPanelByIndex(3);
  }

  function closeSettings(){
    showPanelByIndex(lastNonSettingsIndex || 0);
  }

  /* ===== Gesture bindings ===== */
  window.addEventListener("VT:swipeNext", next);
  window.addEventListener("VT:swipePrev", prev);

  /* ===== Button bindings ===== */
  function bind(id, fn){
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  }

  bind("btnGoCharts", goCharts);
  bind("btnGoLog", goLog);
  bind("btnHomeFromCharts", goHome);
  bind("btnHomeFromLog", goHome);

  bind("btnSettings", openSettings);
  bind("btnSettingsFromCharts", openSettings);
  bind("btnSettingsFromLog", openSettings);
  bind("btnBackFromSettings", closeSettings);

  /* ===== Public API ===== */
  window.VTPanels = {
    VERSION,
    showPanelByIndex,
    goHome,
    goCharts,
    goLog,
    openSettings
  };

  /* ===== Init ===== */
  showPanelByIndex(activeIndex);

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/panels.js
App Version: v2.023c
Base: v2.021
Touched in v2.023c: js/panels.js
Schema order: File 9 of 10
Next planned file: js/ui.js (File 10)
*/
