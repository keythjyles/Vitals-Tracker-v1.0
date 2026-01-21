/* 
Vitals Tracker — BOF (Add Implementation Header)
Copyright © 2026 Wendell K. Jiles. All rights reserved.
(Pen name: Keyth Jyles)

File: js/store.js
App Version Authority: js/version.js
ImplementationId: ADD-20260121-001
FileEditId: 2
Edited: 2026-01-21

Prime/Implementation Context
- This pass: Add panel data capture (NO charting changes in this pass).
- Files 6 and 7 are separate future passes.

Current file: js/store.js, File 5 of 7


Next file to fetch: js/add.js, File 3 of 7



Beacon (persist until user changes)
- Beacon: update FileEditId by incrementing by one each time you generate a new full file.

Role / Ownership (LOCKED)
- Canonical data access layer for the app.
- Delegates persistence to storage.js.
- Normalizes records for consumers (charts, log, reports).
- Owns init sequencing and in-memory cache.
- Must NOT render UI.
- Must NOT own panels or gestures.

Anti-drift rules
- Do NOT guess. Only edit pasted files. Whole-file outputs only.
------------------------------------------------------------ 
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

    // Preserve any other fields (symptoms, distress, meds, etc.) without altering them.
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

      if (writeApi === "putRecord") {
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
      if (typeof window.VTStorage.clear === "function") {
        var r0 = window.VTStorage.clear();
        if (isThenable(r0)) await r0;
        return true;
      }

      if (typeof window.VTStorage.deleteRecordById === "function") {
        var existing = await readAllFromStorage();
        if (Array.isArray(existing) && existing.length) {
          for (var i = 0; i < existing.length; i++) {
            try { await window.VTStorage.deleteRecordById(existing[i]); } catch (_) {}
          }
        }
        return true;
      }

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

      try {
        if (typeof window.VTStorage.detect === "function") {
          var det = window.VTStorage.detect();
          if (isThenable(det)) det = await det;
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
    if (!ready) { try { init(); } catch (_) {} }
    return clone(Array.isArray(cache) ? cache : []);
  }

  function findIndexByKey(key, rec) {
    var ts = null;
    if (key && typeof key === "object") {
      if (typeof key.ts === "number" && isFinite(key.ts)) ts = key.ts;
      else if (typeof key.id === "number" && isFinite(key.id)) ts = key.id;
    }
    if (ts == null && rec && typeof rec.ts === "number" && isFinite(rec.ts)) ts = rec.ts;
    if (ts == null) return -1;

    for (var i = 0; i < cache.length; i++) {
      var r = cache[i];
      if (!r) continue;
      var rts = (typeof r.ts === "number" && isFinite(r.ts)) ? r.ts : null;
      if (rts != null && rts === ts) return i;
      if (r && (r.id === ts || r._id === ts)) return i;
    }
    return -1;
  }

  async function add(record) {
    await init();

    var rec = normalizeRecord(record);
    cache.push(rec);

    try {
      var ok = false;

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

  async function update(key, record) {
    await init();

    var rec = normalizeRecord(record);

    // Preserve timestamp if caller provided a key.ts (edit should not move the record in time)
    try {
      if (key && typeof key === "object" && typeof key.ts === "number" && isFinite(key.ts)) {
        rec.ts = key.ts;
      } else if (key && typeof key === "object" && typeof key.id === "number" && isFinite(key.id)) {
        rec.ts = key.id;
      }
    } catch (_) {}

    var idx = findIndexByKey(key, rec);
    if (idx >= 0) cache[idx] = rec;
    else cache.push(rec);

    try {
      var ok = false;

      if (window.VTStorage && typeof window.VTStorage.putRecord === "function") {
        var r = window.VTStorage.putRecord(rec);
        if (isThenable(r)) r = await r;
        ok = !!(r && r.ok);
      } else if (window.VTStorage && typeof window.VTStorage.saveAll === "function") {
        var res = window.VTStorage.saveAll(cache);
        if (isThenable(res)) await res;
        ok = true;
      }

      dbgSet("lastUpdateOk", ok ? "YES" : "NO");
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
    update: update,
    replaceAll: replaceAll,
    clear: clear
  };

  try { init(); } catch (_) {}

})();

/* 
Vitals Tracker — EOF (Add Implementation Footer)
Copyright © 2026 Wendell K. Jiles. All rights reserved.
(Pen name: Keyth Jyles)

File: js/store.js
App Version Authority: js/version.js
ImplementationId: ADD-20260121-001
FileEditId: 2
Edited: 2026-01-21

Current file: js/store.js, File 5 of 7


Next file to fetch: js/add.js, File 3 of 7



Beacon: update FileEditId by incrementing by one each time you generate a new full file.

Current file (pasted/edited in this step): js/store.js

Acceptance checks
- window.VTStore exists; getAll() remains synchronous
- add()/update() preserve pass-through fields and persist via VTStorage when present
- No UI rendering logic introduced

Implementation Fetch Aid (ONE-TIME ONLY; NOT AUTHORITATIVE)
- This is only a human paste directive for ADD-20260121-001, not a master schema/order.
*/ 
