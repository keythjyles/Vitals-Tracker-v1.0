/* File: js/version.js */
/*
Vitals Tracker
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

Module: version.js
App Version: v2.021
Base: v2.021 (version sync hardening)
Date: 2026-01-18

Change Log (version.js v2.021)
1) Single source of truth for app version (APP_VERSION).
2) Provides stable helpers to read version in any module or UI.
3) Prevents drift where index/app shows one version and modules show another.

Exports
- APP_VERSION (string)
- getAppVersion(): string
- setAppVersionForDebug(v: string): void   // no-op unless explicitly enabled (kept for future diagnostics)
*/
(function () {
  "use strict";

  // Lock: update version here ONLY.
  const APP_VERSION = "v2.021";

  function getAppVersion() {
    return APP_VERSION;
  }

  // Debug hook intentionally disabled by default.
  // If you ever need it later, you can toggle the flag below to true.
  const ALLOW_DEBUG_SET = false;
  function setAppVersionForDebug(v) {
    if (!ALLOW_DEBUG_SET) return;
    // eslint-disable-next-line no-unused-vars
    const _ = v; // placeholder; intentionally inert
  }

  // Expose as both module-global and window for compatibility.
  // Do NOT rename these keys; index/ui relies on them.
  window.VTVersion = Object.freeze({
    APP_VERSION,
    getAppVersion,
    setAppVersionForDebug,
  });
})();

/*
EOF File: js/version.js
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.
App Version: v2.021
Notes: Canonical version is defined here. Other files must read from window.VTVersion.APP_VERSION.
*/
