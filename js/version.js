/* File: js/version.js */
/*
Vitals Tracker — Version Authority
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.025d
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Single source of truth for application version metadata.
- All other modules MUST read version info from this file (no hard-coded versions elsewhere).
- index.html may DISPLAY the version, but MUST NOT define canonical values long-term.

v2.025d — Change Log (THIS FILE ONLY)
1) Bumps canonical app version to v2.025d for the “gesture restart + chart restore” pass.
2) No runtime side effects. No DOM access. Safe to import anywhere.

ANTI-DRIFT RULES
- Do NOT duplicate version strings in other JS files.
- Increment version HERE FIRST, then update index.html display + cache-busters.
- If versions ever disagree, THIS FILE WINS.

Next planned file:
js/gestures.js (restart swipe implementation)
*/

(function (global) {
  "use strict";

  const VERSION = Object.freeze({
    app: "v2.025d",
    base: "v2.021",
    date: "2026-01-18",
    codename: "gesture-restart-chart-restore",
    schema: {
      major: 2,
      minor: 25,
      patch: "d"
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
App Version: v2.025d
Base: v2.021
Touched in v2.025d: js/version.js (version bump only)
Next planned file: js/gestures.js (swipe restart)
*/
