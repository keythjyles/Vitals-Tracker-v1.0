/* File: js/version.js */
/*
Vitals Tracker — Version Authority
Copyright (c) 2026 Wendell K. Jiles.
All rights reserved.

App Version: v2.025e
Base: v2.025d
Date: 2026-01-18

Schema position:
File 10 of 10

Former file:
File 9 — js/panels.js

Next file:
— END OF SCHEMA —

FILE ROLE (LOCKED)
- Single source of truth for application version metadata.
- Header display, boot banner, and diagnostics MUST read from this file.
- No other file may hardcode the version string.
- Provides read-only accessors only.

ANTI-DRIFT RULES
- Increment version HERE FIRST.
- If any displayed version disagrees, THIS FILE WINS.
- No DOM access.
- No side effects.
*/

(function (global) {
  "use strict";

  const VERSION = Object.freeze({
    app: "v2.025e",
    base: "v2.025d",
    date: "2026-01-18",
    codename: "chart-stabilization",
    schema: {
      major: 2,
      minor: 25,
      patch: "e"
    }
  });

  function getVersionString() {
    return VERSION.app;
  }

  function getFullLabel() {
    return `${VERSION.app} (base ${VERSION.base})`;
  }

  function getMeta() {
    return {
      app: VERSION.app,
      base: VERSION.base,
      date: VERSION.date,
      codename: VERSION.codename,
      schema: VERSION.schema
    };
  }

  // Expose immutable public API
  global.VTVersion = Object.freeze({
    getVersionString,
    getFullLabel,
    getMeta
  });

})(window);

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/version.js
App Version: v2.025e
Base: v2.025d
Schema: COMPLETE (10/10)
*/
