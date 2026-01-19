/* 
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/ui.js
App Version Authority: js/version.js
Base: v2.026a
Pass: Swipe + Render Recovery (P0-R1)
Pass order: File 4 of 9 (P0)
Prev file: css/app.css (File 3 of 9)
Next file: js/panels.js (File 5 of 9)

v2.026a — Change Log (THIS FILE ONLY)
1) No behavioral change to swipe. UI remains a thin router into VTPanels.
2) Adds animated flag pass-through ONLY when supported by panels.js signature.
3) Leaves Settings duplication to index.html (next planned edit), per “one fix at a time”.
*/

(function () {
  "use strict";

  /* ==============================
     Cached DOM
     ============================== */

  const dom = {};

  function cacheDom() {
    dom.bootText = document.getElementById("bootText");
    dom.homeVersion = document.getElementById("homeVersion");
    dom.settingsVersion = document.getElementById("settingsVersion");

    dom.btnGoAdd = document.getElementById("btnGoAdd");
    dom.btnGoCharts = document.getElementById("btnGoCharts");
    dom.btnGoLog = document.getElementById("btnGoLog");

    dom.btnHomeFromCharts = document.getElementById("btnHomeFromCharts");
    dom.btnHomeFromLog = document.getElementById("btnHomeFromLog");
    dom.btnHomeFromAdd = document.getElementById("btnHomeFromAdd");

    dom.btnSettings = document.getElementById("btnSettings");
    dom.btnSettingsHomeAlt = document.getElementById("btnSettingsHomeAlt");
    dom.btnSettingsFromCharts = document.getElementById("btnSettingsFromCharts");
    dom.btnSettingsFromLog = document.getElementById("btnSettingsFromLog");

    dom.btnBackFromSettings = document.getElementById("btnBackFromSettings");

    dom.btnExit = document.getElementById("btnExit");
    dom.btnInstall = document.getElementById("btnInstall");
    dom.btnClearData = document.getElementById("btnClearData");
  }

  /* ==============================
     Helpers (safe + no double-bind)
     ============================== */

  function bindOnce(el, key, handler, opts) {
    if (!el) return;
    const k = "vtBound_" + key;
    try {
      if (el.dataset && el.dataset[k] === "1") return;
      if (el.dataset) el.dataset[k] = "1";
    } catch (_) {}
    el.addEventListener("click", handler, opts || false);
  }

  function withPanels(fn) {
    try {
      if (!window.VTPanels) return;
      fn(window.VTPanels);
    } catch (_) {}
  }

  function callGo(p, name, animated) {
    // Support both signatures:
    // - go(name)
    // - go(name, animated)
    try {
      if (typeof p.go !== "function") return;
      if (p.go.length >= 2) p.go(name, animated);
      else p.go(name);
    } catch (_) {}
  }

  function showPanel(name, animated = true) {
    withPanels((p) => {
      if (typeof p.go === "function") callGo(p, name, animated);
      else if (typeof p.show === "function") p.show(name);
    });
  }

  function openSettings() {
    withPanels((p) => {
      if (typeof p.openSettings === "function") p.openSettings();
      else showPanel("settings", false);
    });
  }

  function closeSettings() {
    withPanels((p) => {
      if (typeof p.closeSettings === "function") p.closeSettings(true);
      else showPanel("home", true);
    });
  }

  /* ==============================
     Version Display
     ============================== */

  function updateVersionLabels() {
    if (!window.VTVersion || typeof window.VTVersion.getVersionString !== "function") return;
    const v = window.VTVersion.getVersionString();

    if (dom.bootText) dom.bootText.textContent = "BOOT OK " + v;
    if (dom.homeVersion) dom.homeVersion.textContent = v;
    if (dom.settingsVersion) dom.settingsVersion.textContent = v;
  }

  /* ==============================
     Button Wiring
     ============================== */

  function wireNavigation() {
    bindOnce(dom.btnGoAdd, "goAdd", () => showPanel("add", true));
    bindOnce(dom.btnGoCharts, "goCharts", () => showPanel("charts", true));
    bindOnce(dom.btnGoLog, "goLog", () => showPanel("log", true));

    bindOnce(dom.btnHomeFromCharts, "homeFromCharts", () => showPanel("home", true));
    bindOnce(dom.btnHomeFromLog, "homeFromLog", () => showPanel("home", true));
    bindOnce(dom.btnHomeFromAdd, "homeFromAdd", () => showPanel("home", true));
  }

  function wireSettings() {
    bindOnce(dom.btnSettings, "openSettings", openSettings);
    bindOnce(dom.btnSettingsHomeAlt, "openSettingsAlt", openSettings);
    bindOnce(dom.btnSettingsFromCharts, "openSettingsCharts", openSettings);
    bindOnce(dom.btnSettingsFromLog, "openSettingsLog", openSettings);

    bindOnce(dom.btnBackFromSettings, "backFromSettings", closeSettings);
  }

  function wireUtilities() {
    // EXIT HANDLER (DO NOT CHANGE)
    bindOnce(dom.btnExit, "exit", () => {
      try {
        window.close();
        setTimeout(() => alert("You may now close this app."), 300);
      } catch (_) {}
    });

    bindOnce(dom.btnClearData, "clearData", () => {
      if (!window.confirm("This will permanently delete all local data. Continue?")) return;
      if (window.VTStorage && window.VTStorage.clearAll) {
        window.VTStorage.clearAll();
        location.reload();
      }
    });
  }

  /* ==============================
     Init
     ============================== */

  function init() {
    cacheDom();
    updateVersionLabels();
    wireNavigation();
    wireSettings();
    wireUtilities();
  }

  window.VTUI = Object.freeze({
    init,
    // Stable routing surface for other modules
    showPanel,
    openSettings,
    closeSettings
  });

})();

/* 
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/ui.js
Pass: Swipe + Render Recovery (P0-R1)
Pass order: File 4 of 9 (P0)
Prev file: css/app.css (File 3 of 9)
Next file: js/panels.js (File 5 of 9)
*/
