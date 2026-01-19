/* 
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/ui.js
App Version Authority: js/version.js
Base: v2.025f
Pass: Render Recovery + Swipe Feel
Pass order: File 4 of 9 (P0)
Prev file: css/app.css (File 3 of 9)
Next file: js/panels.js (File 5 of 9)
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
     Helpers (load-order safe)
     ============================== */

  function withPanels(fn) {
    try {
      if (!window.VTPanels) return;
      fn(window.VTPanels);
    } catch (_) {}
  }

  function showPanel(name, animated = true) {
    withPanels(p => {
      // Prefer go(); allow show() alias if later added
      if (typeof p.go === "function") p.go(name, animated);
      else if (typeof p.show === "function") p.show(name, animated);
    });
  }

  function openSettings() {
    withPanels(p => {
      if (typeof p.openSettings === "function") p.openSettings();
      else showPanel("settings", false);
    });
  }

  function closeSettings() {
    withPanels(p => {
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
    dom.btnGoAdd && dom.btnGoAdd.addEventListener("click", () => showPanel("add", true));
    dom.btnGoCharts && dom.btnGoCharts.addEventListener("click", () => showPanel("charts", true));
    dom.btnGoLog && dom.btnGoLog.addEventListener("click", () => showPanel("log", true));

    dom.btnHomeFromCharts && dom.btnHomeFromCharts.addEventListener("click", () => showPanel("home", true));
    dom.btnHomeFromLog && dom.btnHomeFromLog.addEventListener("click", () => showPanel("home", true));
    dom.btnHomeFromAdd && dom.btnHomeFromAdd.addEventListener("click", () => showPanel("home", true));
  }

  function wireSettings() {
    dom.btnSettings && dom.btnSettings.addEventListener("click", openSettings);
    dom.btnSettingsHomeAlt && dom.btnSettingsHomeAlt.addEventListener("click", openSettings);
    dom.btnSettingsFromCharts && dom.btnSettingsFromCharts.addEventListener("click", openSettings);
    dom.btnSettingsFromLog && dom.btnSettingsFromLog.addEventListener("click", openSettings);

    dom.btnBackFromSettings && dom.btnBackFromSettings.addEventListener("click", closeSettings);
  }

  function wireUtilities() {
    // EXIT HANDLER (DO NOT CHANGE)
    dom.btnExit && dom.btnExit.addEventListener("click", () => {
      try {
        window.close();
        setTimeout(() => alert("You may now close this app."), 300);
      } catch (_) {}
    });

    dom.btnClearData && dom.btnClearData.addEventListener("click", () => {
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
Pass: Render Recovery + Swipe Feel
Pass order: File 4 of 9 (P0)
Prev file: css/app.css (File 3 of 9)
Next file: js/panels.js (File 5 of 9)
*/
