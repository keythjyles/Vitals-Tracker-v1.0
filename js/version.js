/* File: js/version.js */
/*
Vitals Tracker — Version Authority
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023b
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Single source of truth for application version metadata.
- All other modules MUST read version info from this file (no hard-coded versions elsewhere).
- index.html may DISPLAY the version, but MUST NOT define canonical values long-term.

v2.023b — Change Log (THIS FILE ONLY)
1) Introduces centralized VERSION object.
2) Exposes read-only helpers for UI, logging, and cache-busting alignment.
3) No runtime side effects. No DOM access. Safe to import anywhere.

ANTI-DRIFT RULES
- Do NOT duplicate version strings in other JS files.
- Increment version HERE FIRST, then update index.html display + cache-busters.
- If versions ever disagree, THIS FILE WINS.

Next file in schema:
File 3 — js/app.js
*/

(function (global) {
  "use strict";

  const VERSION = Object.freeze({
    app: "v2.023b",
    base: "v2.021",
    date: "2026-01-18",
    codename: "stabilize-chart",
    schema: {
      major: 2,
      minor: 23,
      patch: "b"
    }
  });

  function getVersionString() {
    return VERSION.app;
  }

  function getFullVersionLabel() {
    return `${VERSION.app} (base ${VERSION.base})`;
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
    getVersionString,
    getFullVersionLabel,
    getVersionMeta
  });

})(window);

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/version.js
App Version: v2.023b
Base: v2.021
Touched in v2.023b: js/version.js (new canonical version authority)
Next planned file: js/app.js (File 3 of 10)
*/
