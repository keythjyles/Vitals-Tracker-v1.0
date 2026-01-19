/* File: js/panels.js */
/*
Vitals Tracker — Panel Router
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.025e
Base: v2.021
Date: 2026-01-18

Schema position:
File 9 of 10

Former file:
File 8 — js/log.js

Next file:
File 10 — js/init.js

FILE ROLE (LOCKED)
- Owns panel visibility and activation lifecycle.
- Calls panel.onShow() exactly once when a panel becomes active.
- Clears "Loading…" state for active panels.
- Does NOT implement gestures.
- Does NOT render charts or logs.
- Does NOT touch storage.

ANTI-DRIFT RULES
- Do NOT add swipe logic here.
- Do NOT import chart or log directly.
- Panels register themselves via window.VTPanels.
*/

(function () {
  "use strict";

  const PANEL_ATTR = "data-panel";
  const ACTIVE_CLASS = "active";

  const state = {
    active: null,
    shown: Object.create(null)
  };

  function $(sel, root = document) {
    return root.querySelector(sel);
  }

  function $all(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function hideAllPanels() {
    const panels = $all(`[${PANEL_ATTR}]`);
    for (const p of panels) {
      p.classList.remove(ACTIVE_CLASS);
      p.style.display = "none";
    }
  }

  function clearLoading(panelEl) {
    const loading = $(".loading", panelEl);
    if (loading) {
      loading.style.display = "none";
    }
  }

  function activatePanel(name) {
    if (!name || state.active === name) return;

    const panelEl = $(`[${PANEL_ATTR}="${name}"]`);
    if (!panelEl) return;

    hideAllPanels();

    panelEl.style.display = "";
    panelEl.classList.add(ACTIVE_CLASS);
    clearLoading(panelEl);

    state.active = name;

    // Call onShow exactly once per activation
    if (!state.shown[name]) {
      const registry = window.VTPanels || {};
      const panel = registry[name];

      if (panel && typeof panel.onShow === "function") {
        try {
          panel.onShow();
        } catch (err) {
          console.error(`[Panels] onShow failed for "${name}"`, err);
        }
      }

      state.shown[name] = true;
    }
  }

  function init() {
    // Default panel: charts
    activatePanel("charts");
  }

  // Public API
  window.VTPanelRouter = Object.freeze({
    activate: activatePanel,
    init
  });

})();
