/* ------------------------------------------------------------
   Vitals Tracker — js/app.js
   App Version: v2.009

   Purpose:
   - Central panel controller
   - Dispatches panel lifecycle events
   - Wires Log and Charts renderers (read-only safe)

   Latest update:
   - Ensures Log and Charts replace placeholders
   - Calls render() on navigation AND initial load
   - No data writes, no mutations, no migrations

   Safety:
   - Read-only only
   - Idempotent renders
   ------------------------------------------------------------ */

(function () {
  "use strict";

  const VT = (window.VT = window.VT || {});

  function qs(sel) {
    return document.querySelector(sel);
  }

  function qsa(sel) {
    return Array.from(document.querySelectorAll(sel));
  }

  function getActivePanel() {
    return (
      qs(".panel.active") ||
      qs(".panel.is-active") ||
      qs(".panel")
    );
  }

  function getPanelName(panel) {
    if (!panel) return "home";
    return (
      panel.getAttribute("data-panel") ||
      panel.getAttribute("data-name") ||
      panel.id ||
      "home"
    ).toLowerCase();
  }

  function showPanel(panelName) {
    const panels = qsa(".panel");
    panels.forEach(p => {
      const name = getPanelName(p);
      const active = name.includes(panelName);
      p.classList.toggle("active", active);
      p.classList.toggle("is-active", active);
    });

    dispatchPanelEvent(panelName);
  }

  function dispatchPanelEvent(panelName) {
    document.dispatchEvent(new CustomEvent(`vt:panel:${panelName}`));
    document.dispatchEvent(new CustomEvent(`vt:show:${panelName}`));

    // Direct calls as a fallback (belt + suspenders)
    if (panelName.includes("log") && VT.log && VT.log.render) {
      VT.log.render();
    }

    if (panelName.includes("chart") && VT.chart && VT.chart.render) {
      VT.chart.render();
    }
  }

  // Hook swipe/buttons if present
  function bindNav() {
    qsa("[data-nav]").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-nav");
        showPanel(target);
      });
    });
  }

  // Initial boot
  function boot() {
    bindNav();

    // Determine initial panel
    const active = getActivePanel();
    const name = getPanelName(active);

    // Force initial render
    dispatchPanelEvent(name);

    // Also pre-warm Log & Charts once (safe)
    if (VT.log && VT.log.render) VT.log.render();
    if (VT.chart && VT.chart.render) VT.chart.render();
  }

  document.addEventListener("DOMContentLoaded", boot);

})();
