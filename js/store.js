/* File: js/store.js */
/*
Vitals Tracker — Store Facade

Copyright (c) 2026 Wendell K. Jiles. All rights reserved.

App Version Authority: js/version.js
Base: v2.028a

FILE ROLE (LOCKED)
- Canonical data access layer for the app.
- Delegates persistence to storage.js.
- Normalizes records for consumers (charts, log, reports).
- Owns init sequencing and in-memory cache.
- Must NOT render UI.
- Must NOT own panels or gestures.

CURRENT FIX SCOPE (Chart + Persistence Recovery)
- Guarantee VTStore.init() resolves before reads/writes.
- Ensure getAll() always returns an array (sync) without corrupting readiness.
- Ensure add() persists reliably (await saveAll if async).
- Preserve backward compatibility with older record shapes.
*/

(function () {
  "use strict";

  var ready = false;
  var initPromise = null;
  var cache = [];

  function clone(obj) {
    try { return JSON.parse(JSON.stringify(obj)); }
    catch (_) { return obj; }
  }

  function isThenable(v) {
    return !!v && (typeof v === "object" || typeof v === "function") && typeof v.then === "function";
  }

  function normalizeRecord(r) {
    // Minimal normalization; do NOT invent values.
    if (!r || typeof r !== "object") return r;

    // Back-compat: accept sys/dia/hr/notes + possible legacy keys.
    var out = {
      ts: (typeof r.ts === "number" && isFinite(r.ts)) ? r.ts :
          (typeof r.time === "number" && isFinite(r.time)) ? r.time :
          (typeof r.timestamp === "number" && isFinite(r.timestamp)) ? r.timestamp :
          r.ts,

      sys: (typeof r.sys === "number" && isFinite(r.sys)) ? r.sys :
           (typeof r.systolic === "number" && isFinite(r.systolic)) ? r.systolic :
           (typeof r.sbp === "number" && isFinite(r.sbp)) ? r.sbp :
           r.sys,

      dia: (typeof r.dia === "number" && isFinite(r.dia)) ? r.dia :
           (typeof r.diastolic === "number" && isFinite(r.diastolic)) ? r.diastolic :
           (typeof r.dbp === "number" && isFinite(r.dbp)) ? r.dbp :
           r.dia,

      hr:  (typeof r.hr === "number" && isFinite(r.hr)) ? r.hr :
           (typeof r.heartRate === "number" && isFinite(r.heartRate)) ? r.heartRate :
           (typeof r.pulse === "number" && isFinite(r.pulse)) ? r.pulse :
           r.hr,

      notes: (typeof r.notes === "string") ? r.notes :
             (typeof r.note === "string") ? r.note :
             (typeof r.text === "string") ? r.text :
             ""
    };

    // Preserve any other fields (symptoms, etc.) without altering them.
    for (var k in r) {
      if (!Object.prototype.hasOwnProperty.call(r, k)) continue;
      if (k === "ts" || k === "sys" || k === "dia" || k === "hr" || k === "notes") continue;
      if (k === "time" || k === "timestamp" || k === "systolic" || k === "diastolic" || k === "heartRate" || k === "pulse") continue;
      out[k] = r[k];
    }

    return out;
  }

  function normalizeArray(arr) {
    if (!Array.isArray(arr)) return [];
    var out = [];
    for (var i = 0; i < arr.length; i++) out.push(normalizeRecord(arr[i]));
    return out;
  }

  async function init() {
    if (ready) return;
    if (initPromise) return initPromise;

    initPromise = (async function () {
      if (!window.VTStorage || typeof window.VTStorage.loadAll !== "function") {
        console.warn("VTStore: storage layer not available");
        cache = [];
        ready = true;
        return;
      }

      try {
        var data = window.VTStorage.loadAll();
        if (isThenable(data)) data = await data;

        if (Array.isArray(data)) cache = normalizeArray(data);
        else cache = [];
      } catch (e) {
        try { console.error("VTStore init failed", e); } catch (_) {}
        cache = [];
      }

      ready = true;
    })();

    return initPromise;
  }

  function getAll() {
    // SYNC by contract; do not force-ready (prevents losing async load).
    // Kick init if not already started, but return current cache immediately.
    if (!ready) { try { init(); } catch (_) {} }
    return clone(Array.isArray(cache) ? cache : []);
  }

  async function add(record) {
    await init();

    var rec = normalizeRecord(record);
    cache.push(rec);

    try {
      if (window.VTStorage && typeof window.VTStorage.saveAll === "function") {
        var res = window.VTStorage.saveAll(cache);
        if (isThenable(res)) await res;
      }
    } catch (_) {}

    return rec;
  }

  async function replaceAll(arr) {
    await init();

    if (!Array.isArray(arr)) return;
    cache = normalizeArray(arr);

    try {
      if (window.VTStorage && typeof window.VTStorage.saveAll === "function") {
        var res = window.VTStorage.saveAll(cache);
        if (isThenable(res)) await res;
      }
    } catch (_) {}
  }

  async function clear() {
    await init();

    cache = [];

    try {
      if (window.VTStorage && typeof window.VTStorage.clear === "function") {
        var res = window.VTStorage.clear();
        if (isThenable(res)) await res;
      } else if (window.VTStorage && typeof window.VTStorage.saveAll === "function") {
        var res2 = window.VTStorage.saveAll([]);
        if (isThenable(res2)) await res2;
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

  // Boot-load cache as early as possible (no UI).
  try { init(); } catch (_) {}

})();

/*
Vitals Tracker — EOF Version/Detail Notes (REQUIRED)
File: js/store.js
App Version Authority: js/version.js
Base: v2.028a
Touched in this step: js/store.js (init/read/write reliability)
*/
