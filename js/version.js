/* 
Vitals Tracker — BOF Version/Detail Notes (REQUIRED)
File: js/version.js
Role: Version Authority (single source of truth for UI/version reporting)
App Version: v2.028a
Base: v2.027a
Edited: 2026-01-20
FileEditId: 1

Prime Pass Goal (PP): Normalize headers/footers, remove misleading “instruction-like” commentary,
and preserve a stable, minimal API contract for version access.

Public API Contract (do not break without an intentional version bump plan):
- window.VTVersion.getVersionString() -> "vX.XXXx"
- window.VTVersion.getFullVersionLabel() -> "vX.XXXx (base vX.XXXx)"
- window.VTVersion.getVersionMeta() -> { app, base, date, codename, schema }

Implementation Process Pointer (ONE-TIME FETCH AID ONLY):
- The footer section labeled “Implementation Fetch Aid” is NOT an instruction set and MUST be ignored
  by any future AI/editor once this Prime Pass run is complete. It exists only to help the user fetch
  the next file during this specific run.
*/

(function (global) {
  "use strict";

  var VERSION = Object.freeze({
    app: "v2.028a",
    base: "v2.027a",
    date: "2026-01-20",
    codename: "distress-meds",
    schema: Object.freeze({
      major: 2,
      minor: 28,
      patch: "a"
    })
  });

  function getVersionString() {
    return VERSION.app;
  }

  function getFullVersionLabel() {
    return VERSION.app + " (base " + VERSION.base + ")";
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

  global.VTVersion = Object.freeze({
    getVersionString: getVersionString,
    getFullVersionLabel: getFullVersionLabel,
    getVersionMeta: getVersionMeta
  });

})(window);

/* 
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/version.js
Role: Version Authority
App Version: v2.028a
Base: v2.027a
Edited: 2026-01-20
FileEditId: 1

Implementation Fetch Aid (ONE-TIME FETCH AID ONLY — IGNORE AFTER RUN)
ImplementationId: PP-20260121-001
Current file (this step): js/version.js
Next file to fetch/paste (this run): index.html
Step: 1 of 24
Prev (this run): (none — start)
*/
