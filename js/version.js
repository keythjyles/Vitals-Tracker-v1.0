/* File: js/version.js */
/*
Vitals Tracker — Version Authority (Module)
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023
Base: v2.021 (user-provided working copy)
Date: 2026-01-18

This file is: 2 of 10 (v2.023 phase)
Touched in this release: YES
Module owner: Single source of truth for version/build metadata and release ledger helpers.
Depends on: None (pure module). Safe to import anywhere.

v2.023 Scope Anchor (do not drift)
- Goal: restore charting + swipe behavior + input/add flow on top of v2.021 base.
- Do NOT “improve” UI/logic opportunistically. Only implement requested deltas.

Release Plan (v2.023; one file at a time)
  1) index.html (MASTER)
  2) js/version.js  <-- YOU ARE HERE
  3) js/storage.js
  4) js/chart.js
  5) js/gestures.js
  6) js/panels.js
  7) js/log.js
  8) js/add.js
  9) js/ui.js
 10) js/app.js

Note on sub-versions:
- If we must iterate without “graduating” the public version, we will use:
  v2.023a, v2.023b, v2.023c...
- Public UI may still show v2.023, but internal BUILD_TAG will carry a/b/c.
  (We will decide that policy in index.html once the core is stable.)

Mandatory rules going forward (enforced by humans, supported here)
- Every touched file must state the same App Version at BOF and EOF.
- index.html must cache-bust only the files touched in that release.
- chart rendering lives only in js/chart.js (owner-only rule).
- gesture behavior lives only in js/gestures.js (owner-only rule).
*/

(function(){
  "use strict";

  // ===== Version constants (single authority) =====
  const APP_NAME = "Vitals Tracker";
  const APP_VERSION = "v2.023";       // Public version label
  const BUILD_TAG = "v2.023";         // Optional: v2.023a / v2.023b, etc.
  const BASE_VERSION = "v2.021";
  const RELEASE_DATE = "2026-01-18";

  // Bump this if storage schema changes (ONLY when actually changed).
  const DATA_SCHEMA = 1;

  // ===== Release ledger (lightweight, human-readable, searchable) =====
  // Update ONLY when you actually touch a file in the current version.
  // Keep entries short so they show well on mobile.
  const TOUCHED_FILES = [
    "index.html",
    "js/version.js"
    // Next files will be appended as they are delivered and edited:
    // "js/storage.js",
    // "js/chart.js",
    // "js/gestures.js",
    // "js/panels.js",
    // "js/log.js",
    // "js/add.js",
    // "js/ui.js",
    // "js/app.js"
  ];

  // ===== Helper: cache busting query string =====
  // index.html should use ?v=<BUILD_TAG> for each touched JS/CSS file.
  function cacheBuster(){
    return encodeURIComponent(BUILD_TAG);
  }

  // ===== Helper: simple runtime banner =====
  // Use to populate a UI label if desired; safe to call from anywhere.
  function bannerText(){
    return `${APP_NAME} ${APP_VERSION}`;
  }

  // ===== Helper: build info object =====
  function info(){
    return {
      appName: APP_NAME,
      appVersion: APP_VERSION,
      buildTag: BUILD_TAG,
      baseVersion: BASE_VERSION,
      releaseDate: RELEASE_DATE,
      dataSchema: DATA_SCHEMA,
      touchedFiles: TOUCHED_FILES.slice()
    };
  }

  // ===== Expose globally and as ES module compatible shim =====
  // We keep this safe for both <script> and module usage.
  const VTVersion = {
    APP_NAME,
    APP_VERSION,
    BUILD_TAG,
    BASE_VERSION,
    RELEASE_DATE,
    DATA_SCHEMA,
    TOUCHED_FILES,
    cacheBuster,
    bannerText,
    info
  };

  // Global attach (no overwrite)
  if(!window.VTVersion){
    window.VTVersion = VTVersion;
  }else{
    // If something already exists, keep the first authority.
    // This prevents silent drift caused by double loads.
    // (If this ever triggers, fix index.html includes.)
    try{
      console.warn("[VTVersion] Duplicate load detected. Keeping existing authority.");
    }catch(_){}
  }

})();
  
/* EOF: js/version.js */
/*
App Version: v2.023
Base: v2.021
Touched in this release: YES

What changed in this file (v2.023):
- Established single version authority + lightweight touched-file ledger.
- Added helpers for cache busting and UI banner text.

Next file to deliver (on "N" / "Next"):
- File 3 of 10: js/storage.js
*/
