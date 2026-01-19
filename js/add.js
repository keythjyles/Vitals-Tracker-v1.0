/*
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/add.js
App Version Authority: js/version.js
Base: v2.025f
Pass: Render Recovery + Swipe Feel
Pass order: File 9 of 9 (P0)
Prev file: js/log.js (File 8 of 9)
Next file: (none — end of pass)
*/

(function () {
  "use strict";

  const btnSave = document.getElementById("btnSaveReading");
  const panelAdd = document.getElementById("panelAdd");

  if (!btnSave || !panelAdd) {
    // Add panel exists but wiring is intentionally minimal in this pass
    return;
  }

  function nowTs() {
    return Date.now();
  }

  function safeAlert(msg) {
    try { alert(msg); } catch (_) {}
  }

  function fakeReadForNow() {
    // TEMPORARY placeholder — ensures chart/log render path is intact.
    // This will be replaced with real inputs later without touching other files.
    return {
      ts: nowTs(),
      sys: 120,
      dia: 80,
      hr: 70,
      notes: ""
    };
  }

  function save() {
    if (!window.VTStore || typeof window.VTStore.add !== "function") {
      safeAlert("Storage not ready.");
      return;
    }

    const rec = fakeReadForNow();

    try {
      window.VTStore.add(rec);
    } catch (e) {
      safeAlert("Failed to save reading.");
      return;
    }

    // Notify other modules
    try {
      document.dispatchEvent(new CustomEvent("vt:dataChanged"));
    } catch (_) {}

    safeAlert("Reading saved.");

    // Return home
    try {
      if (window.VTPanels && typeof window.VTPanels.show === "function") {
        window.VTPanels.show("home");
      }
    } catch (_) {}
  }

  btnSave.addEventListener("click", save);

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/add.js
App Version Authority: js/version.js
Base: v2.025f
Pass: Render Recovery + Swipe Feel
Pass order: File 9 of 9 (P0)
Prev file: js/log.js (File 8 of 9)
End of pass
*/
