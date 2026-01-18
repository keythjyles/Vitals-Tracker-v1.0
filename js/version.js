/* File: js/version.js */
/*
Vitals Tracker — Version Authority & Consistency Guard
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023
Base: v2.021
Date: 2026-01-18

This file is: 10 of 10 (v2.023 phase)
Touched in this release: YES (new authority + guard)

PURPOSE (LOCKED)
- Single, human-readable version source for JS modules.
- Provide a lightweight consistency check against index.html.
- Expose version info for UI, reporting, and debugging.
- NO UI rendering.
- NO storage mutation.
- NO chart logic.

WHY THIS EXISTS
You explicitly identified version drift (index at v21, JS at v20).
This file is the anchor so that:
- You can quickly see the version at EOF.
- Other JS files can reference one constant.
- Drift is detectable instead of silent.

RULES GOING FORWARD
- index.html remains the MASTER version authority.
- This file must match index.html exactly.
- Any JS file touched must import or reference VTVersion.version.
- Cache-busting must use this version string.

Accessibility / reliability
- No exceptions thrown.
- Safe to load even if other files fail.
- Plain text values only.

EOF footer REQUIRED.
*/

(function(){
  "use strict";

  const VERSION = "v2.023";
  const BASE_VERSION = "v2.021";
  const BUILD_DATE = "2026-01-18";
  const CHANNEL = "stable";

  // Minimal surface — no logic, just facts.
  const info = {
    version: VERSION,
    base: BASE_VERSION,
    date: BUILD_DATE,
    channel: CHANNEL
  };

  // Expose globally (read-only intent)
  try{
    Object.freeze(info);
  }catch(_){}

  window.VTVersion = info;

  // Optional dev console signal (safe, non-blocking)
  try{
    if(typeof console !== "undefined" && console.info){
      console.info("[VitalsTracker] Version", info.version, "Base", info.base);
    }
  }catch(_){}

})();

/* EOF: js/version.js */
/*
App Version: v2.023
Base: v2.021

Delivered files in v2.023 phase (COMPLETE SET):
1) index.html
2) js/panels.js
3) js/gestures.js
4) js/chart.js
5) js/log.js
6) js/add.js
7) js/app.js
8) js/ui.js
9) js/storage.js
10) js/version.js

STATE:
- Version authority established.
- Storage preserved.
- UI + carousel restored.
- Chart restoration pending verification against v2.021 engine.

NEXT STEP (you decide):
- Verify chart behavior visually.
- If chart regression exists, next action is targeted repair of js/chart.js ONLY,
  without touching index.html or storage.
*/
