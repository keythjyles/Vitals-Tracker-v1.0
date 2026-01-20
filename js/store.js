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
- Ensure add() persists reliably.
- Preserve backward compatibility with older record shapes.

P0-LR4 (THIS EDIT)
- FIX: storage API mismatch. Support VTStorage.getAllRecords/putRecord/deleteRecordById (current storage.js)
  and fall back to legacy VTStorage.loadAll/saveAll/clear if present.
- Add minimal, non-UI debug probe: window.__VTDBG.store.* (counts + chosen API).
*/

(function () {
  "use strict";

  var ready = false;
  var initPromise = null;
  var cache = [];

  function dbgInit() {
    try {
      if (!window.__VTDBG) window.__VTDBG = {};
      if (!window.__VTDBG.store) window.__VTDBG.store = {};
    } catch (_) {}
  }

  function dbgSet(k, v) {
    try {
      dbgInit();
      window.__VTDBG.store[k] = v;
    } catch (_) {}
  }

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

    var out = {
      ts: (typeof r.ts === "number" && isFinite(r.ts)) ? r.ts :
          (typeof r.time === "number" && isFinite(r.time)) ? r.time :
          (typeof r.timestamp === "number" && isFinite(r.timestamp)) ? r.timestamp :
          (typeof r.date === "number" && isFinite(r.date)) ? r.date :
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
      if (k === "time" || k === "timestamp" || k === "date" || k === "systolic" || k === "diastolic" || k === "heartRate" || k === "pulse") continue;
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

  function hasStorage() {
    return !!window.VTStorage;
  }

  function pickStorageReadAPI() {
    try {
      if (!window.VTStorage) return "none";
      if (typeof window.VTStorage.getAllRecords === "function") return "getAllRecords";
      if (typeof window.VTStorage.loadAll === "function") return "loadAll";
      return "none";
    } catch (_) {
      return "none";
    }
  }

  function pickStorageWriteAPI() {
    try {
      if (!window.VTStorage) return "none";
      if (typeof window.VTStorage.putRecord === "function") return "putRecord";
      if (typeof window.VTStorage.saveAll === "function") return "saveAll";
      return "none";
    } catch (_) {
      return "none";
    }
  }

  async function readAllFromStorage() {
    if (!window.VTStorage) return [];

    var readApi = pickStorageReadAPI();
    dbgSet("readApi", readApi);

    try {
      if (readApi === "getAllRecords") {
        var recs = window.VTStorage.getAllRecords();
        if (isThenable(recs)) recs = await recs;
        return Array.isArray(recs) ? recs : [];
      }
      if (readApi === "loadAll") {
        var data = window.VTStorage.loadAll();
        if (isThenable(data)) data = await data;
        return Array.isArray(data) ? data : [];
      }
    } catch (_) {}

    return [];
  }

  async function writeOneToStorage(record) {
    if (!window.VTStorage) return false;

    var writeApi = pickStorageWriteAPI();
    dbgSet("writeApi", writeApi);

    try {
      if (writeApi === "putRecord") {
        var r = window.VTStorage.putRecord(record);
        if (isThenable(r)) r = await r;
        return !!(r && r.ok);
      }
      // saveAll requires full array; caller should prefer batch path
    } catch (_) {}

    return false;
  }

  async function writeAllToStorage(arr) {
    if (!window.VTStorage) return false;

    var writeApi = pickStorageWriteAPI();
    dbgSet("writeApi", writeApi);

    try {
      if (writeApi === "saveAll") {
        var res = window.VTStorage.saveAll(arr);
        if (isThenable(res)) await res;
        return true;
      }

      // No batch API; best-effort: clear then putRecord each (only when explicitly asked).
      if (writeApi === "putRecord") {
        // Clear existing by deleting by ts if possible.
        if (typeof window.VTStorage.deleteRecordById === "function") {
          try {
            var existing = await readAllFromStorage();
            if (Array.isArray(existing) && existing.length) {
              for (var i = 0; i < existing.length; i++) {
                try { await window.VTStorage.deleteRecordById(existing[i]); } catch (_) {}
              }
            }
          } catch (_) {}
        }

        for (var j = 0; j < arr.length; j++) {
          try { await writeOneToStorage(arr[j]); } catch (_) {}
        }
        return true;
      }
    } catch (_) {}

    return false;
  }

  async function clearStorageAll() {
    if (!window.VTStorage) return false;

    try {
      // Legacy clear
      if (typeof window.VTStorage.clear === "function") {
        var r0 = window.VTStorage.clear();
        if (isThenable(r0)) await r0;
        return true;
      }

      // New storage bridge: delete by ts/object
      if (typeof window.VTStorage.deleteRecordById === "function") {
        var existing = await readAllFromStorage();
        if (Array.isArray(existing) && existing.length) {
          for (var i = 0; i < existing.length; i++) {
            try { await window.VTStorage.deleteRecordById(existing[i]); } catch (_) {}
          }
        }
        return true;
      }

      // Fallback: if saveAll exists, save empty
      if (typeof window.VTStorage.saveAll === "function") {
        var r1 = window.VTStorage.saveAll([]);
        if (isThenable(r1)) await r1;
        return true;
      }
    } catch (_) {}

    return false;
  }

  async function init() {
    if (ready) return;
    if (initPromise) return initPromise;

    initPromise = (async function () {
      dbgInit();
      dbgSet("storagePresent", hasStorage() ? "YES" : "NO");

      if (!hasStorage()) {
        try { console.warn("VTStore: storage layer not available"); } catch (_) {}
        cache = [];
        ready = true;
        dbgSet("cacheLen", 0);
        return;
      }

      // Optional detect probe (read-only)
      try {
        if (typeof window.VTStorage.detect === "function") {
          var det = window.VTStorage.detect();
          if (isThenable(det)) det = await det;
          // Keep it minimal (string-ish) for debugging without UI.
          try {
            dbgSet("detectBest", det && det.best && det.best.source ? String(det.best.source) : "");
            dbgSet("detectBestCount", det && det.best && typeof det.best.count === "number" ? det.best.count : "");
          } catch (_) {}
        }
      } catch (_) {}

      try {
        var data = await readAllFromStorage();
        if (Array.isArray(data)) cache = normalizeArray(data);
        else cache = [];
      } catch (e) {
        try { console.error("VTStore init failed", e); } catch (_) {}
        cache = [];
      }

      ready = true;
      dbgSet("cacheLen", Array.isArray(cache) ? cache.length : 0);
    })();

    return initPromise;
  }

  function getAll() {
    // SYNC by contract. If not ready, kick async init and return current cache snapshot.
    if (!ready) { try { init(); } catch (_) {} }
    return clone(Array.isArray(cache) ? cache : []);
  }

  async function add(record) {
    await init();

    var rec = normalizeRecord(record);
    cache.push(rec);

    // Persist in whatever storage bridge is present.
    try {
      var ok = false;

      // Prefer putRecord (non-destructive, single write)
      if (window.VTStorage && typeof window.VTStorage.putRecord === "function") {
        var r = window.VTStorage.putRecord(rec);
        if (isThenable(r)) r = await r;
        ok = !!(r && r.ok);
      } else if (window.VTStorage && typeof window.VTStorage.saveAll === "function") {
        var res = window.VTStorage.saveAll(cache);
        if (isThenable(res)) await res;
        ok = true;
      }

      dbgSet("lastAddOk", ok ? "YES" : "NO");
    } catch (_) {}

    return rec;
  }

  async function replaceAll(arr) {
    await init();
    if (!Array.isArray(arr)) return;

    cache = normalizeArray(arr);

    try {
      await writeAllToStorage(cache);
      dbgSet("lastReplaceAll", "OK");
    } catch (_) {
      dbgSet("lastReplaceAll", "NO");
    }
  }

  async function clear() {
    await init();

    cache = [];

    try {
      await clearStorageAll();
      dbgSet("lastClear", "OK");
    } catch (_) {
      dbgSet("lastClear", "NO");
    }
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
Touched in this step: js/store.js (storage bridge API alignment + debug probe)
*/
