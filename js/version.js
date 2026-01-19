/* File: js/version.js */
/*
Vitals Tracker — Version Authority
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.025
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Single source of truth for application version metadata.
- All other modules MUST read version info from this file (no hard-coded versions elsewhere).
- index.html may DISPLAY the version, but MUST NOT define canonical values long-term.

v2.025 — Change Log (THIS FILE ONLY)
1) Version bump to v2.025 (canonical).
2) Adds explicit "Current Work Scope" notes so we can resume without drift after disconnects.
3) No runtime side effects. No DOM access. Safe to import anywhere.

CURRENT WORK SCOPE (v2.025 series)
A) Chart rules (to implement in js/chart.js):
   - Y-axis minimum must be 40.
   - Y-axis maximum must be: min(250, ceil_to_10(maxReading + 10))
     where maxReading is the highest numeric value among sys/dia/hr in the dataset (or current viewport, per chart design).
   - Default viewport: last 7 days.
   - Zoom constraints: min 1 day, max 14 days.
   - Pan constraints: clamp to dataset bounds (no panning past first/last record).

B) Gestures / swipe reset (to implement in js/gestures.js + js/panels.js as needed):
   - Peel back current swipe implementation and re-implement a simpler, consistent model.
   - Swipe should be allowed only from dedicated swipe zones/headers (not the whole panel).
   - Chart interaction region must be fully protected (no panel swipe stealing chart pan/zoom).
   - Goal: predictable left/right panel navigation with minimal code paths.

ANTI-DRIFT RULES
- Do NOT duplicate version strings in other JS files.
- Increment version HERE FIRST, then update index.html display + cache-busters.
- If versions ever disagree, THIS FILE WINS.

Next file in schema:
File 2 — index.html
*/

(function (global) {
  "use strict";

  const VERSION = Object.freeze({
    app: "v2.025",
    base: "v2.021",
    date: "2026-01-18",
    codename: "chart-range-and-swipe-reset",
    schema: Object.freeze({
      major: 2,
      minor: 25,
      patch: "" // keep empty unless you explicitly request a letter (e.g., "a", "b")
    }),

    // Optional structured reminders (no runtime effects)
    scope: Object.freeze({
      chart: Object.freeze({
        yMin: 40,
        yMaxRule: "min(250, ceil_to_10(maxReading + 10))",
        defaultDays: 7,
        zoomMinDays: 1,
        zoomMaxDays: 14,
        panClamp: "dataset-bounds-only"
      }),
      swipe: Object.freeze({
        reset: true,
        startZonesOnly: true,
        protectChartRegion: true,
        goal: "simple-consistent-panel-swipe"
      })
    })
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
      schema: VERSION.schema,
      scope: VERSION.scope
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
App Version: v2.025
Base: v2.021
Touched in v2.025: js/version.js (version bump + scoped reminders)
Next planned file: index.html (File 2 of 4 in this pass)
*/
