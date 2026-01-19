/* File: js/version.js */
/*
Vitals Tracker — Version Authority
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version: v2.023e
Base: v2.021
Date: 2026-01-18

FILE ROLE (LOCKED)
- Single source of truth for application version metadata.

v2.023e — Change Log (THIS FILE ONLY)
- Version bump v2.023d -> v2.023e.
*/

(function (global) {
  "use strict";

  const VERSION = Object.freeze({
    app: "v2.023e",
    base: "v2.021",
    date: "2026-01-18",
    codename: "renderer-rebind",
    schema: { major: 2, minor: 23, patch: "e" }
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
App Version: v2.023e
Base: v2.021
Touched in v2.023e: js/version.js (version bump only)
*/
