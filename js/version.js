/* File: js/version.js */
/*
Vitals Tracker - Version Authority
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.027a
Base: v2.026a
Date: 2026-01-19

FILE ROLE (LOCKED)
- Single source of truth for application version metadata.
- All other modules MUST read version info from this file (no hard-coded versions elsewhere).
- index.html may DISPLAY the version, but MUST NOT define canonical values long-term.

v2.027a - Change Log (THIS FILE ONLY)
1) Version bump for Add-as-Modal implementation pass (P1).
2) No runtime side effects. No DOM access. Safe to import anywhere.

ANTI-DRIFT RULES
- Do NOT duplicate version strings in other JS files.
- Increment version HERE FIRST, then update index.html display + cache-busters.
- If versions ever disagree, THIS FILE WINS.

Stabilization Pass: Add-as-Modal (P1)
- File 1 of 7: js/version.js

Next file in pass:
File 2 - index.html
*/

(function (global) {
  "use strict";

  var VERSION = Object.freeze({
    app: "v2.027a",
    base: "v2.026a",
    date: "2026-01-19",
    codename: "add-modal",
    schema: {
      major: 2,
      minor: 27,
      patch: "a"
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
App Version: v2.027a
Base: v2.026a
Touched in v2.027a: js/version.js (version bump only)
Pass: Add-as-Modal (P1)
Pass order: File 1 of 7 (P1)
Prev file: (none - pass start)
Next file: index.html (File 2 of 7)
*/
