/* File: js/version.js */
/*
Vitals Tracker — Version Authority
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023d
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Single source of truth for application version metadata.
- All other modules MUST read version info from this file (no hard-coded versions elsewhere).

v2.023d — Change Log (THIS FILE ONLY)
1) Version bump v2.023c -> v2.023d.
2) No other behavior changes.

ANTI-DRIFT RULES
- Increment version HERE FIRST, then update index.html cache-busters.
- If versions disagree, THIS FILE WINS.
*/

(function (global) {
  "use strict";

  const VERSION = Object.freeze({
    app: "v2.023d",
    base: "v2.021",
    date: "2026-01-18",
    codename: "chart-gestures+panel-swipe",
    schema: { major: 2, minor: 23, patch: "d" }
  });

  function getVersionString(){ return VERSION.app; }
  function getFullVersionLabel(){ return `${VERSION.app} (base ${VERSION.base})`; }
  function getVersionMeta(){ return { ...VERSION }; }
  function getCacheBust(){ return String(VERSION.app).replace(/^v/i, ""); }

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
App Version: v2.023d
Base: v2.021
Touched in v2.023d: js/version.js (version bump only)
*/
