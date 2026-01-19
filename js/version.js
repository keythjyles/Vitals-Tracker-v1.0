/* File: js/version.js */
/*
Vitals Tracker — Version Authority (CANONICAL)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.024
Base: v2.023e
Date: 2026-01-18

FILE ROLE (LOCKED)
- Single source of truth for application version metadata.
- ALL modules must read version info from this file.
- index.html may DISPLAY version, but MUST NOT define canonical values.
- Cache-busting alignment derives from this version.

CURRENT STABILIZATION SCOPE (v2.024)
- Navigation integrity (Home/Add/Charts/Log/Settings)
- Restore Home pull-to-refresh
- Restore horizontal swipe (Home ↔ Charts ↔ Log)
- Chart behavior corrections:
  • Default window = last 7 days
  • Zoom min = 1 day, max = 14 days
  • Pan clamped to dataset bounds
  • Restore formatted labels/legend
  • Increase band opacity (+35%)
- Add panel routing fix (Home button works; Add excluded from swipe)

ANTI-DRIFT RULES
- Increment version HERE FIRST.
- Do NOT duplicate version strings elsewhere.
- If any disagreement exists, THIS FILE WINS.

LOCKED FILE TOUCH ORDER (v2.024)
1) js/version.js      ← THIS FILE
2) index.html
3) js/chart.js
4) js/gestures.js
5) js/panels.js
6) js/app.js
*/

(function (global) {
  "use strict";

  const VERSION = Object.freeze({
    app: "v2.024",
    base: "v2.023e",
    date: "2026-01-18",
    codename: "stabilize-navigation-chart",
    schema: {
      major: 2,
      minor: 24,
      patch: null
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

  // Expose as read-only global
  global.VTVersion = Object.freeze({
    getVersionString,
    getFullVersionLabel,
    getVersionMeta
  });

})(window);

/*
Vitals Tracker — EOF Version / Detail Notes (REQUIRED)
File: js/version.js
App Version: v2.024
Base: v2.023e
Touched in v2.024: js/version.js
Next file to deliver: index.html (File 2 of 6)
*/
