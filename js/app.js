/* File: js/app.js */
/*
Vitals Tracker
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

Module: app.js
App Version: v2.021
Base: v2.021
Date: 2026-01-18

Change Log (app.js v2.021)
1) Central boot: reads APP_VERSION from window.VTVersion (prevents version drift).
2) Initializes panels + wires nav buttons to panels controller.
3) Initializes pull-to-refresh (Home only).
4) Initializes chart + log render flows by calling their modules (no UI drift).
5) Registers service worker (if available) using stable path './sw.js'.

Dependencies (do not rename)
- ./js/version.js          (window.VTVersion)
- ./js/panels.js           (window.VTPanels)
- ./js/storage.js          (window.VTStorageBridge)
- ./js/log.js              (window.VTLog)
- ./js/chart.js            (window.VTChart)
- ./js/pwa.js              (window.VTPWA)

DOM IDs used (must exist in index.html)
- bootText
- btnHome, btnCharts, btnLog, btnInstall
- btnBackFromCharts, btnBackFromLog, btnChartsFromLog, btnLogFromCharts
- panelHome, panelCharts, panelLog
- homeCard, pullIndicator

Exports
- window.VTApp.boot()
*/
(function () {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function getVersion() {
    return (window.VTVersion && window.VTVersion.APP_VERSION) || "v?.???";
  }

  function setBootLabel() {
    const el = $("bootText");
    if (!el) return;
    el.textContent = "BOOT OK " + getVersion();
  }

  function initNavButtons() {
    const panels = window.VTPanels;
    if (!panels) return;

    const go = (name) => () => panels.show(name);

    const btnHome = $("btnHome");
    const btnCharts = $("btnCharts");
    const btnLog = $("btnLog");

    if (btnHome) btnHome.onclick = go("home");
    if (btnCharts) btnCharts.onclick = go("charts");
    if (btnLog) btnLog.onclick = go("log");

    const btnBackFromCharts = $("btnBackFromCharts");
    const btnBackFromLog = $("btnBackFromLog");
    const btnChartsFromLog = $("btnChartsFromLog");
    const btnLogFromCharts = $("btnLogFromCharts");

    if (btnBackFromCharts) btnBackFromCharts.onclick = go("home");
    if (btnBackFromLog) btnBackFromLog.onclick = go("home");
    if (btnChartsFromLog) btnChartsFromLog.onclick = go("charts");
    if (btnLogFromCharts) btnLogFromCharts.onclick = go("log");
  }

  function initPullToRefresh() {
    const panelHome = $("panelHome");
    const homeCard = $("homeCard");
    const pullIndicator = $("pullIndicator");

    if (!panelHome || !homeCard || !pullIndicator) return;

    let pullStartY = null;
    let pullArmed = false;

    panelHome.addEventListener(
      "touchstart",
      (e) => {
        if (homeCard.scrollTop !== 0) return;
        pullStartY = e.touches[0].clientY;
        pullArmed = false;
      },
      { passive: true }
    );

    panelHome.addEventListener(
      "touchmove",
      (e) => {
        if (pullStartY == null) return;
        const dy = e.touches[0].clientY - pullStartY;
        if (dy > 0) {
          const h = Math.min(48, Math.floor(dy / 2));
          pullIndicator.style.height = h + "px";
          pullArmed = h >= 36;
        }
      },
      { passive: true }
    );

    panelHome.addEventListener("touchend", () => {
      if (pullStartY == null) return;
      const armed = pullArmed;
      pullStartY = null;
      pullArmed = false;
      pullIndicator.style.height = "0px";
      if (armed) location.reload();
    });
  }

  async function loadDataAndRender() {
    const storage = window.VTStorageBridge;
    const log = window.VTLog;
    const chart = window.VTChart;

    // allow app to boot even if modules are missing; UI will show "not loaded" states.
    if (!storage || !log || !chart) return;

    const payload = await storage.loadReadOnly(); // { records, summary }
    log.setRecords(payload.records || []);
    log.render(true);

    chart.setRecords(payload.records || []);
    chart.resetView(); // default window days and center selection
    chart.render();
  }

  function initPWA() {
    const pwa = window.VTPWA;
    if (!pwa) return;

    const btnInstall = $("btnInstall");
    pwa.bindInstallButton(btnInstall);

    pwa.registerServiceWorker("./sw.js");
  }

  function boot() {
    setBootLabel();

    // Panels must be initialized before wiring navigation.
    if (window.VTPanels && window.VTPanels.init) {
      window.VTPanels.init({
        onShowCharts: () => {
          if (window.VTChart) {
            window.VTChart.ensureCanvas();
            window.VTChart.render();
          }
        },
      });
    }

    initNavButtons();
    initPullToRefresh();
    initPWA();

    // Load + render once DOM is ready and modules are present.
    loadDataAndRender().catch(() => {
      // keep silent; UI already indicates missing data if any
    });
  }

  window.VTApp = Object.freeze({ boot });

  document.addEventListener("DOMContentLoaded", boot);
})();

/*
EOF File: js/app.js
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.
App Version: v2.021
Notes: App version is read from window.VTVersion.APP_VERSION to prevent drift.
*/
