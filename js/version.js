/* File: js/version.js */
/*
Vitals Tracker - Version Authority
Purpose of this header: verification metadata for this edit (not instructions).
Edited: 2026-01-20

App Version: v2.028a
Base: v2.027a
Change focus: Add/Edit expanded to include Distress + Medications (event markers) + Settings med-name list.
*/

(function (global) {
  "use strict";

  var VERSION = Object.freeze({
    app: "v2.028a",
    base: "v2.027a",
    date: "2026-01-20",
    codename: "distress-meds",
    schema: {
      major: 2,
      minor: 28,
      patch: "a"
    }
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
EOF: js/version.js
Verified edit: version bumped to v2.028a and codename updated.
*/
