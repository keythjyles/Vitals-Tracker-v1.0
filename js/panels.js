/* File: js/panels.js */
/*
Vitals Tracker — Panels Router (Home / Add / Charts / Log / Settings)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.025c
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Single owner of which panel is visible ("active").
- Defines the swipe rotation order: home <-> charts <-> log (ONLY).
- Settings is NOT in rotation (gear-only access).
- Add is NOT in rotation (button-only access).
- Emits "vt:panelChanged" events on every transition for app/chart lifecycle hooks.

ANTI-DRIFT RULES
- Do NOT implement swipe detection here (js/gestures.js owns that).
- Do NOT draw charts here (js/chart.js owns that).
- Do NOT store data here (storage/store own persistence).
*/

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  const PANEL_IDS = Object.freeze({
    home: "panelHome",
    add: "panelAdd",
    charts: "panelCharts",
    log: "panelLog",
    settings: "panelSettings"
  });

  // Swipe rotation (LOCKED)
  const ROTATION = Object.freeze(["home", "charts", "log"]);

  const state = {
    active: "home",
    lastMain: "home"
  };

  function getPanelEl(name) {
    const id = PANEL_IDS[name];
    return id ? $(id) : null;
  }

  function emitChanged(name) {
    try {
      document.dispatchEvent(new CustomEvent("vt:panelChanged", { detail: { active: name } }));
    } catch (_) {}
  }

  function setActive(name) {
    if (!name || !PANEL_IDS[name]) return;

    // Toggle DOM classes
    for (const k of Object.keys(PANEL_IDS)) {
      const el = getPanelEl(k);
      if (!el) continue;
      el.classList.toggle("active", k === name);
    }

    // Track last main panel (non-settings, non-add)
    if (name === "home" || name === "charts" || name === "log") {
      state.lastMain = name;
    }

    state.active = name;
    emitChanged(name);
  }

  function getActive() { return state.active; }

  function goHome() { setActive("home"); }
  function goCharts() { setActive("charts"); }
  function goLog() { setActive("log"); }
  function openAdd() { setActive("add"); }

  function openSettings() { setActive("settings"); }
  function closeSettings() { setActive(state.lastMain || "home"); }

  function next() {
    // Only defined for main rotation; if not on a main panel, rotate from lastMain.
    const cur = (ROTATION.indexOf(state.active) !== -1) ? state.active : (state.lastMain || "home");
    const i = ROTATION.indexOf(cur);
    if (i < 0) return;
    setActive(ROTATION[(i + 1) % ROTATION.length]);
  }

  function prev() {
    const cur = (ROTATION.indexOf(state.active) !== -1) ? state.active : (state.lastMain || "home");
    const i = ROTATION.indexOf(cur);
    if (i < 0) return;
    setActive(ROTATION[(i - 1 + ROTATION.length) % ROTATION.length]);
  }

  function bindClick(id, fn) {
    const el = $(id);
    if (!el) return;
    el.addEventListener("click", function (e) {
      try { fn(e); } catch (_) {}
    });
  }

  function initButtons() {
    // Home panel buttons
    bindClick("btnGoAdd", openAdd);
    bindClick("btnGoCharts", goCharts);
    bindClick("btnGoLog", goLog);

    // Add panel buttons (Home must work)
    bindClick("btnHomeFromAdd", goHome);
    bindClick("btnSettingsFromAdd", openSettings);

    // Charts panel buttons
    bindClick("btnHomeFromCharts", goHome);
    bindClick("btnLogFromCharts", goLog);
    bindClick("btnSettingsFromCharts", openSettings);

    // Log panel buttons
    bindClick("btnHomeFromLog", goHome);
    bindClick("btnChartsFromLog", goCharts);
    bindClick("btnSettingsFromLog", openSettings);

    // Settings panel buttons
    bindClick("btnBackFromSettings", closeSettings);
  }

  function inferInitialActive() {
    // Prefer whatever is already marked .active (supports hot reload)
    for (const name of Object.keys(PANEL_IDS)) {
      const el = getPanelEl(name);
      if (el && el.classList.contains("active")) return name;
    }
    return "home";
  }

  function init() {
    initButtons();
    setActive(inferInitialActive());
  }

  // Public API
  window.VTPanels = Object.freeze({
    ROTATION,
    init,
    setActive,
    getActive,
    next,
    prev,
    goHome,
    goCharts,
    goLog,
    openAdd,
    openSettings,
    closeSettings
  });

  // Auto-init on DOM ready (safe)
  function onReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }
  onReady(function () {
    try { window.VTPanels.init(); } catch (_) {}
  });

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/panels.js
App Version: v2.025c
Base: v2.021
Rotation: home <-> charts <-> log (settings/add excluded)
Primary fix: ensures Home works on Add screen; stable next/prev targets.
*/
