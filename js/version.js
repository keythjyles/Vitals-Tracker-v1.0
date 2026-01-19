/* File: js/version.js */
/*
Vitals Tracker — Version Authority
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023f
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Single source of truth for application version metadata.
- All other modules MUST read version info from this file (no hard-coded versions elsewhere).
- index.html may DISPLAY the version, but MUST NOT define canonical values long-term.

v2.023f — Change Log (THIS FILE ONLY)
1) Version bump to align with chart formatting restore.

ANTI-DRIFT RULES
- Do NOT duplicate version strings in other JS files.
- Increment version HERE FIRST, then update index.html cache-busters.
- If versions ever disagree, THIS FILE WINS.
*/

(function (global) {
  "use strict";

  const VERSION = Object.freeze({
    app: "v2.023f",
    base: "v2.021",
    date: "2026-01-18",
    codename: "formatted-chart-restore",
    schema: {
      major: 2,
      minor: 23,
      patch: "f"
    }
  });

  function getVersionString() { return VERSION.app; }
  function getFullVersionLabel() { return `${VERSION.app} (base ${VERSION.base})`; }
  function getVersionMeta() {
    return {
      app: VERSION.app,
      base: VERSION.base,
      date: VERSION.date,
      codename: VERSION.codename,
      schema: VERSION.schema
    };
  }

  global.VTVersion = Object.freeze({
    getVersionString,
    getFullVersionLabel,
    getVersionMeta
  });

})(window);

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/version.js
App Version: v2.023f
Base: v2.021
Touched in v2.023f: js/version.js (version bump only)
*/
