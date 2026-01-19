/* File: js/version.js */
/*
Vitals Tracker - Version Authority
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.025f
Base: v2.025e
Date: 2026-01-19

FILE ROLE (LOCKED)
- Single source of truth for application version metadata.
- All other modules MUST read version info from this file (no hard-coded versions elsewhere).
- index.html may DISPLAY the version, but MUST NOT define canonical values long-term.

v2.025f - Change Log (THIS FILE ONLY)
1) Version bump for Render Recovery + Swipe Feel stabilization pass.
2) No runtime side effects. No DOM access. Safe to import anywhere.

ANTI-DRIFT RULES
- Do NOT duplicate version strings in other JS files.
- Increment version HERE FIRST, then update index.html display + cache-busters.
- If versions ever disagree, THIS FILE WINS.

Stabilization Pass: Render Recovery + Swipe Feel
- P0 File 1 of 9: js/version.js

Next file in pass:
File 2 - index.html
*/

(function (global) {
  "use strict";

  var VERSION = Object.freeze({
    app: "v2.025f",
    base: "v2.025e",
    date: "2026-01-19",
    codename: "render-recovery",
    schema: {
      major: 2,
      minor: 25,
      patch: "f"
    }
  });

  function getVersionString() {
    return VERSION.app;
  }

  function getFullVersionLabel() {
    return VERSION.app + " (base " + VERSION.base + ")";
  }

  function getVersionMeta() {
    return {
      app: VERSION.app,
      base: VERSION.base,
      date: VERSION.date,
      codename: VERSION.codename,
      schema: VERSION.schema
    };
  }

  // Expose as global, read-only
  global.VTVersion = Object.freeze({
    getVersionString: getVersionString,
    getFullVersionLabel: getFullVersionLabel,
    getVersionMeta: getVersionMeta
  });

})(window);

/*
Vitals Tracker - EOF Version/Detail Notes (REQUIRED)
File: js/version.js
App Version: v2.025f
Base: v2.025e
Touched in v2.025f: js/version.js (version bump only)
Pass: Render Recovery + Swipe Feel
Pass order: File 1 of 9 (P0)
Prev file: (none - pass start)
Next file: index.html (File 2 of 9)
*/
