/* File: js/store.js */
/*
Vitals Tracker — Store Facade

Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version Authority: js/version.js
Base: v2.025e

FILE ROLE (LOCKED)
- Canonical data access layer for the app.
- Delegates persistence to storage.js.
- Normalizes records for consumers (charts, log, reports).
- Owns init sequencing and in-memory cache.
- Must NOT render UI.
- Must NOT own panels or gestures.

CURRENT FIX SCOPE (Render Recovery)
- Guarantee VTStore.init() resolves before reads.
- Ensure getAll() always returns an array.
- Preserve backward compatibility with older record shapes.

Pass: Render Recovery + Swipe Feel
Pass order: File 8 of 9
Prev file: js/log.js (File 7 of 9)
Next file: js/panels.js (File 9 of 9)
*/

(function () {
  "use strict";

  var ready = false;
  var cache = [];

  function clone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (_) {
      return obj;
    }
  }

  async function init() {
    if (ready) return;

    if (!window.VTStorage || typeof window.VTStorage.loadAll !== "function") {
      console.warn("VTStore: storage layer not available");
      cache = [];
      ready = true;
      return;
    }

    try {
      var data = await window.VTStorage.loadAll();
      if (Array.isArray(data)) {
        cache = data.slice();
      } else {
        cache = [];
      }
    } catch (e) {
      console.error("VTStore init failed", e);
      cache = [];
    }

    ready = true;
  }

  function ensureReady() {
    if (!ready) {
      try {
        if (window.VTStorage && typeof window.VTStorage.loadAll === "function") {
          var data = window.VTStorage.loadAll();
          if (Array.isArray(data)) cache = data.slice();
        }
      } catch (_) {}
      ready = true;
    }
  }

  function getAll() {
    ensureReady();
    return clone(cache);
  }

  function add(record) {
    ensureReady();
    cache.push(record);
    try {
      if (window.VTStorage && typeof window.VTStorage.saveAll === "function") {
        window.VTStorage.saveAll(cache);
      }
    } catch (_) {}
  }

  function replaceAll(arr) {
    if (!Array.isArray(arr)) return;
    cache = arr.slice();
    ready = true;
    try {
      if (window.VTStorage && typeof window.VTStorage.saveAll === "function") {
        window.VTStorage.saveAll(cache);
      }
    } catch (_) {}
  }

  function clear() {
    cache = [];
    ready = true;
    try {
      if (window.VTStorage && typeof window.VTStorage.clear === "function") {
        window.VTStorage.clear();
      }
    } catch (_) {}
  }

  window.VTStore = {
    init: init,
    getAll: getAll,
    add: add,
    replaceAll: replaceAll,
    clear: clear
  };

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/store.js
App Version Authority: js/version.js
Pass: Render Recovery + Swipe Feel
Pass order: File 8 of 9
Prev file: js/log.js (File 7 of 9)
Next file: js/panels.js (File 9 of 9)
*/
