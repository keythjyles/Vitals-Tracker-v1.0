/* File: js/version.js */
/*
Vitals Tracker — Version Authority
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023c
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Single source of truth for application version metadata.
- All other modules MUST read version info from this file (no hard-coded versions elsewhere).
- index.html may DISPLAY the version, but MUST NOT define canonical values long-term.

v2.023c — Change Log (THIS FILE ONLY)
1) Version bump v2.023b -> v2.023c.
2) Adds getCacheBust() helper so index/modules can align cache-busting.
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
    app: "v2.023c",
    base: "v2.021",
    date: "2026-01-18",
    codename: "stabilize-chart",
    schema: {
      major: 2,
      minor: 23,
      patch: "c"
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

  function getCacheBust() {
    // Cache-buster token must match VERSION.app without leading "v"
    // Example: v2.023c -> 2.023c
    return String(VERSION.app).replace(/^v/i, "");
  }

  // Expose as global, read-only
  global.VTVersion = Object.freeze({
    getVersionString,
    getFullVersionLabel,
    getVersionMeta,
    getCacheBust
  });

})(window);

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/version.js
App Version: v2.023c
Base: v2.021
Touched in v2.023c: js/version.js (version bump + cache-bust helper)
Next planned file: js/app.js (File 3 of 10)
*/
