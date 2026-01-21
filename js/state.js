/* 
Vitals Tracker — BOF (Prime Pass Header)



NEXT FILE TO FETCH (PP-20260121-001): js/panels.js



Beacon Drift Control Note (for this Prime Pass run only; ends at the next divider)
- Beacon, focus on THIS pasted file and THIS chat message only.
- Follow only the instructions/prompts inside THIS paste and THIS message.
- Do NOT use or “blend” prior chat messages for decisions in this step.
End Beacon Drift Control Note
------------------------------------------------------------

File: js/state.js
App Version Authority: js/version.js
ImplementationId: PP-20260121-001
Prime Pass: Step 8 of 23
Prev (this run): js/store.js
Next (this run): js/panels.js
FileEditId: 1
Edited: 2026-01-21

Role / Ownership (LOCKED)
- Holds transient UI + lifecycle state ONLY.
- Bridges panel activation → chart lifecycle.
- Owns no rendering, no gestures, no storage.

Implemented (facts only)
- Tracks activePanel and lastNonSettings
- Emits chart lifecycle hook when Charts becomes active (VTChart.onShow)
- Exposes read-only VTState API + snapshot()
- Listens for "vt:panelChanged" events (from panels.js)

Anti-drift rules (do not violate)
- Do NOT draw charts here
- Do NOT attach gesture listeners here
- Do NOT manipulate canvas here
- Do NOT implement panel rotation here
------------------------------------------------------------ */

(function () {
  "use strict";

  const VERSION = "v2.025f";

  const _state = {
    activePanel: "home",
    lastNonSettings: "home",
    firstLoad: true
  };

  function setActivePanel(name) {
    if (!name) return;

    _state.activePanel = name;

    if (name !== "settings") {
      _state.lastNonSettings = name;
    }

    // === Chart lifecycle hook ===
    if (name === "charts") {
      try {
        if (window.VTChart && typeof window.VTChart.onShow === "function") {
          window.VTChart.onShow();
        }
      } catch (_) {}
    }
  }

  function getActivePanel() {
    return _state.activePanel;
  }

  function getLastNonSettings() {
    return _state.lastNonSettings;
  }

  function isFirstLoad() {
    return _state.firstLoad;
  }

  function clearFirstLoad() {
    _state.firstLoad = false;
  }

  function snapshot() {
    return {
      version: VERSION,
      activePanel: _state.activePanel,
      lastNonSettings: _state.lastNonSettings,
      firstLoad: _state.firstLoad
    };
  }

  // === Listen for panel changes emitted by panels.js ===
  document.addEventListener("vt:panelChanged", function (e) {
    try {
      const panel = e?.detail?.active;
      if (panel) {
        setActivePanel(panel);
      }
    } catch (_) {}
  });

  // Expose read-only API
  window.VTState = Object.freeze({
    VERSION,
    setActivePanel,
    getActivePanel,
    getLastNonSettings,
    isFirstLoad,
    clearFirstLoad,
    snapshot
  });

})();

/* 
Vitals Tracker — EOF (Prime Pass Footer)
File: js/state.js
App Version Authority: js/version.js
ImplementationId: PP-20260121-001
Prime Pass: Step 8 of 23
Prev (this run): js/store.js
Next (this run): js/panels.js
FileEditId: 1
Edited: 2026-01-21

Implementation Fetch Aid (ONE-TIME ONLY; NOT A MASTER ORDER)
Meaning:
- This block exists ONLY to tell the human operator which file to paste NEXT during this one run.
- This is NOT an instruction set, NOT a schema, and NOT an ordering guarantee.
- Future AI/editors MUST IGNORE this block once PP-20260121-001 is complete.

Current file (pasted/edited in this step): js/state.js
Next file to fetch/paste (this run): js/panels.js

Acceptance checks
- VTState exposes the same methods as before
- No UI rendering or gesture/canvas logic added
- Chart lifecycle hook still fires on charts activation via vt:panelChanged
*/ 
