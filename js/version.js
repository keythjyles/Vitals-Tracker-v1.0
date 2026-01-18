/* File: js/version.js */
/*
Vitals Tracker
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

Module: version.js
File #: 3 of 7
App Version: v2.021
Date: 2026-01-18

Purpose
- Single authoritative version source.
- Prevents index.html / app.js / module version drift.
- All modules MUST read version from window.VTVersion.

Rules (Do Not Violate)
- Update version HERE first.
- index.html and other JS files must NOT hardcode versions.
- Footer and header comments may repeat the version for human reference only.

Exports
- window.VTVersion.APP_VERSION
*/

(function () {
  "use strict";

  const APP_VERSION = "v2.021";

  window.VTVersion = Object.freeze({
    APP_VERSION
  });
})();

/*
EOF File: js/version.js
Copyright (c) 2026 Wendell K. Jiles. All rights reserved.
Authoritative version source. All modules must reference this file.
*/
