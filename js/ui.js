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
     Version Display
     ============================== */

  function updateVersionLabels() {
    if (!window.VTVersion) return;

    const v = window.VTVersion.getVersionString();

    if (dom.bootText) {
      dom.bootText.textContent = "BOOT OK " + v;
    }
    if (dom.homeVersion) {
      dom.homeVersion.textContent = v;
    }
    if (dom.settingsVersion) {
      dom.settingsVersion.textContent = v;
    }
  }

  /* ==============================
     Button Wiring
     ============================== */

  function wireNavigation() {
    if (!window.VTPanels) return;

    dom.btnGoAdd && dom.btnGoAdd.addEventListener("click", () => {
      window.VTPanels.go("add");
    });

    dom.btnGoCharts && dom.btnGoCharts.addEventListener("click", () => {
      window.VTPanels.go("charts");
    });

    dom.btnGoLog && dom.btnGoLog.addEventListener("click", () => {
      window.VTPanels.go("log");
    });

    dom.btnHomeFromCharts && dom.btnHomeFromCharts.addEventListener("click", () => {
      window.VTPanels.go("home");
    });

    dom.btnHomeFromLog && dom.btnHomeFromLog.addEventListener("click", () => {
      window.VTPanels.go("home");
    });

    dom.btnHomeFromAdd && dom.btnHomeFromAdd.addEventListener("click", () => {
      window.VTPanels.go("home");
    });
  }

  function wireSettings() {
    if (!window.VTPanels) return;

    const openSettings = () => window.VTPanels.openSettings();

    dom.btnSettings && dom.btnSettings.addEventListener("click", openSettings);
    dom.btnSettingsHomeAlt && dom.btnSettingsHomeAlt.addEventListener("click", openSettings);
    dom.btnSettingsFromCharts && dom.btnSettingsFromCharts.addEventListener("click", openSettings);
    dom.btnSettingsFromLog && dom.btnSettingsFromLog.addEventListener("click", openSettings);

    dom.btnBackFromSettings && dom.btnBackFromSettings.addEventListener("click", () => {
      window.VTPanels.closeSettings();
    });
  }

  function wireUtilities() {
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
    init
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
